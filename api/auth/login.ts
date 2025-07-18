
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { serialize } from 'cookie';
import { get } from '@vercel/blob';
import type { UserProfile } from '../../types.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }
    
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error("JWT_SECRET not configured on server.");
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    try {
        const userProfileBlob = await get(`users/${email.toLowerCase()}.json`);
        const userProfile: UserProfile = await userProfileBlob.json();

        const authDataBlob = await get(`auth/${userProfile.id}.json`);
        const { hashedPassword } = await authDataBlob.json();
        
        const isMatch = await compare(password, hashedPassword);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        
        const token = sign({ userId: userProfile.id, email: userProfile.email, role: userProfile.role }, JWT_SECRET, { expiresIn: '7d' });

        const cookie = serialize('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/',
        });

        res.setHeader('Set-Cookie', cookie);
        return res.status(200).json({ user: userProfile });

    } catch (error: any) {
        if (error.status === 404) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        console.error('Login Error:', error);
        return res.status(500).json({ error: 'An internal server error occurred.' });
    }
}
