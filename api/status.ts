import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const url = process.env.PYTHON_AGENT_URL || process.env.PYTHON_AGENT_URI || 'NÃO CONFIGURADA';

    // Mascarar parte da URL por segurança
    const maskedUrl = url.replace(/(?<=https:\/\/)[^\.]+/, '***');

    res.status(200).json({
        status: 'online',
        target: maskedUrl,
        has_anthropic: !!process.env.ANTHROPIC_API_KEY,
        has_nvidia: !!process.env.NVIDIA_API_KEY
    });
}
