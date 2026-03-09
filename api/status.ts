import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const url = (process.env.PYTHON_AGENT_URL || process.env.PYTHON_AGENT_URI || '').trim();

    if (!url) {
        return res.status(500).json({ status: 'error', error: 'PYTHON_AGENT_URL não configurada no Vercel' });
    }

    try {
        const response = await fetch(`${url}/health`);
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
            error: 'Backend inacessível: ' + err.message
        });
    }
}
