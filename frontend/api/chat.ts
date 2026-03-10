import type { VercelRequest, VercelResponse } from '@vercel/node';

const RETRYABLE_STATUS = new Set([502, 503, 504]);

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, init: RequestInit, retries = 3): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeout);

      if (!RETRYABLE_STATUS.has(response.status) || attempt === retries) {
        return response;
      }

      await delay(800 * attempt);
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;

      if (attempt === retries) {
        throw error;
      }

      await delay(800 * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Falha de conexão com o agente.');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, system } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required and cannot be empty' });
  }

  const PYTHON_AGENT_URL = process.env.PYTHON_AGENT_URL || process.env.PYTHON_AGENT_URI;

  if (!PYTHON_AGENT_URL) {
    return res.status(500).json({
      error: 'Variável de ambiente PYTHON_AGENT_URL ou PYTHON_AGENT_URI não configurada no Vercel.',
      message: 'Configure a variável no Vercel apontando para sua hospedagem no Railway (ex: https://seu-app.up.railway.app)'
    });
  }

  try {
    // 1. Extrair a última mensagem do usuário do payload do frontend
    const lastUserMessage = messages.filter((m: { role?: string }) => m.role === 'user').pop();
    const messageText = lastUserMessage?.content || '';

    // 2. Limpar a URL base (remover barra extra no final, se houver)
    const baseUrl = PYTHON_AGENT_URL.endsWith('/') ? PYTHON_AGENT_URL.slice(0, -1) : PYTHON_AGENT_URL;

    // 3. Montar o payload no formato que o FastApi Python (agent/main.py -> /chat) espera
    const pythonPayload = {
      agent_id: 'jarvis',
      soul: system || 'Você é um assistente de voz inteligente. Responda sempre em português do Brasil.',
      user_id: 'default',
      message: messageText,
      messages
    };

    console.log(`[PROXY] Enviando requisição para: ${baseUrl}/chat`);

    // 4. Enviar a requisição para o Agente Python no Railway
    const response = await fetchWithRetry(`${baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pythonPayload)
    }, 3);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PROXY ERROR] O Agente Python retornou um erro:', errorText);
      throw new Error(`Erro do Agente Python HTTP ${response.status}: ${errorText}`);
    }

    // Retorno do Python Server costuma ser: { "response": "texto", "agent_id": "...", "user_id": "...", ... }
    const pyData = await response.json();
    const assistantReply = pyData.response || "O agente processou a resposta, mas o formato de retorno não é legível.";

    // 5. Formatar a resposta DE VOLTA para o modelo que o Frontend espera (padrão Anthropic/OpenAI)
    return res.status(200).json({
      content: [
        { text: assistantReply }
      ]
    });

  } catch (err: any) {
    console.error('Erro na Vercel Function Serverless ao tentar contatar o Python Agent:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
