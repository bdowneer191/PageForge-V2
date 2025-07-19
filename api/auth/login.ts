
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { serialize } from 'cookie';
import { list } from '@vercel/blob';
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
        const { blobs: userProfileBlobs } = await list({ prefix: `users/${email.toLowerCase()}.json`, limit: 1 });
        if (userProfileBlobs.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        const userProfileResponse = await fetch(userProfileBlobs[0].url);
        if (!userProfileResponse.ok) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        const userProfile: UserProfile = await userProfileResponse.json();

        const { blobs: authDataBlobs } = await list({ prefix: `auth/${userProfile.id}.json`, limit: 1 });
        if (authDataBlobs.length === 0) {
            console.error(`Auth data missing for user: ${userProfile.id}`);
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        const authDataResponse = await fetch(authDataBlobs[0].url);
        if (!authDataResponse.ok) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        const { hashedPassword } = await authDataResponse.json();
        
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
        console.error('Login Error:', error);
        return res.status(500).json({ error: 'An internal server error occurred.' });
    }
}
