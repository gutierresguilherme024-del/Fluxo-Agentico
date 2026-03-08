import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, system, model = 'claude-3-5-sonnet-20241022', max_tokens = 1024 } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (anthropicKey) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model, max_tokens, system, messages }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const errMsg = (err as any)?.error?.message || `HTTP ${response.status}`;
        throw new Error(errMsg);
      }

      const data = await response.json();
      return res.status(200).json(data);
    } catch (err: any) {
      console.error('Anthropic error:', err.message);
      // Fall through to NVIDIA fallback
    }
  }

  // Fallback: NVIDIA GLM (OpenAI-compatible format)
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  const nvidiaBaseUrl = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
  const llmModel = process.env.LLM_MODEL || 'z-ai/glm4.7';

  if (!nvidiaKey) {
    return res.status(500).json({ error: 'Nenhuma API key de IA configurada. Adicione ANTHROPIC_API_KEY nas variáveis de ambiente do Vercel.' });
  }

  try {
    const fallbackMessages = system
      ? [{ role: 'system', content: system }, ...messages]
      : messages;

    const fallbackResponse = await fetch(`${nvidiaBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${nvidiaKey}`,
      },
      body: JSON.stringify({ model: llmModel, max_tokens, messages: fallbackMessages }),
    });

    if (!fallbackResponse.ok) {
      const err = await fallbackResponse.json().catch(() => ({}));
      throw new Error((err as any)?.error?.message || `GLM HTTP ${fallbackResponse.status}`);
    }

    const fallbackData = await fallbackResponse.json();
    const text = (fallbackData as any).choices?.[0]?.message?.content || '';
    return res.status(200).json({ content: [{ text }] });
  } catch (err: any) {
    console.error('NVIDIA fallback error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
