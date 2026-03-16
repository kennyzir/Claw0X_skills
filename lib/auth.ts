import { VercelRequest, VercelResponse } from '@vercel/node';

export function authenticate(req: VercelRequest): boolean {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return false;
  }

  const token = authHeader.replace('Bearer ', '');
  const expectedToken = process.env.SKILL_AUTH_TOKEN;
  if (!expectedToken) {
    console.error('SKILL_AUTH_TOKEN not configured');
    return false;
  }
  
  return token === expectedToken;
}

export function authMiddleware(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Only allow POST
    if (req.method !== 'POST') {
      res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
      return;
    }

    // Authenticate
    if (!authenticate(req)) {
      res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
      return;
    }

    // Call handler
    try {
      await handler(req, res);
    } catch (error: any) {
      console.error('Handler error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error',
        message: error.message 
      });
    }
  };
}
