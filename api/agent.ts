import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const agentUrl = process.env.PYTHON_AGENT_URL || 'https://jarvis-agent-production-b103.up.railway.app';

    const response = await fetch(`${agentUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errorData.error || `Agent error: ${response.status}`,
        message: 'Failed to get response from agent',
      });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error: any) {
    console.error('Agent proxy error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error?.message || 'Failed to connect to agent',
    });
  }
}
