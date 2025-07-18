
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { hash } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { serialize } from 'cookie';
import { put, list } from '@vercel/blob';
import type { UserProfile } from '../../types.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { email, password } = req.body;
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Email and password are required.' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }
    
    const JWT_SECRET = process.env.JWT_SECRET;
    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
    
    if (!JWT_SECRET) {
      console.error("JWT_SECRET not configured on server.");
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    try {
        const { blobs } = await list({ prefix: `users/${email.toLowerCase()}.json`, limit: 1 });
        if (blobs.length > 0) {
            return res.status(409).json({ error: 'User with this email already exists.' });
        }
        
        const hashedPassword = await hash(password, 10);
        const userId = crypto.randomUUID();
        const userRole = ADMIN_EMAILS.includes(email) ? 'admin' : 'user';

        const userProfile: UserProfile = {
            id: userId,
            email: email.toLowerCase(),
            role: userRole
        };
        
        await put(`users/${email.toLowerCase()}.json`, JSON.stringify(userProfile), { access: 'public', addRandomSuffix: false });
        await put(`auth/${userId}.json`, JSON.stringify({ email: email.toLowerCase(), hashedPassword }), { access: 'public', addRandomSuffix: false });

        const token = sign({ userId, email: userProfile.email, role: userRole }, JWT_SECRET, { expiresIn: '7d' });

        const cookie = serialize('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/',
        });

        res.setHeader('Set-Cookie', cookie);
        return res.status(201).json({ user: userProfile });

    } catch (error: any) {
        console.error('Signup Error:', error);
        return res.status(500).json({ error: 'An internal server error occurred.' });
    }
}
