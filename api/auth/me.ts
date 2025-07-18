
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verify } from 'jsonwebtoken';
import type { UserProfile } from '../../types.ts';

export default function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const token = req.cookies.auth_token;
    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error("JWT_SECRET not configured on server.");
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    try {
        const decoded = verify(token, JWT_SECRET) as { userId: string; email: string; role: 'admin' | 'user' };
        const user: UserProfile = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role
        };
        res.status(200).json({ user });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
}
