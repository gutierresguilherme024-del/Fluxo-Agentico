import type { VercelRequest, VercelResponse } from '@vercel/node';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHealthWithRetry(
  url: string,
  retries = 3,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok || attempt === retries) {
        return response;
      }

      await delay(500 * attempt);
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;

      if (attempt === retries) {
        throw error;
      }

      await delay(500 * attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Falha no health check do backend.');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = (
    process.env.PYTHON_AGENT_URL ||
    process.env.PYTHON_AGENT_URI ||
    ''
  ).trim();

  if (!url) {
    return res.status(500).json({
      status: 'error',
      error: 'PYTHON_AGENT_URL não configurada no Vercel',
    });
  }

  try {
    const response = await fetchHealthWithRetry(`${url}/health`, 3);
    if (!response.ok) {
      const txt = await response.text();
      throw new Error(`Health retornou ${response.status}: ${txt}`);
    }
    const data = await response.json();

    // Mascarar parte da URL por segurança
    const maskedUrl = url.replace(/(?<=https:\/\/)[^\.]+/, '***');

    res.status(200).json({
      status: 'online',
      target: maskedUrl,
      backend: data,
      // A presença de has_anthropic agora virá do /health do backend
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      target: url.replace(/(?<=https:\/\/)[^\.]+/, '***'),
      error: 'Backend inacessível: ' + err.message,
    });
  }
}
