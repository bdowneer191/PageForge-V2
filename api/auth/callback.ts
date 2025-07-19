
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sign } from 'jsonwebtoken';
import { serialize } from 'cookie';
import { put, list } from '@vercel/blob';
import type { UserProfile } from '../../types.ts';

const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, JWT_SECRET, ADMIN_EMAILS } = process.env;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !JWT_SECRET) {
        console.error("GitHub OAuth or JWT environment variables are not configured.");
        return res.status(500).json({ error: 'Server configuration error.' });
    }

    const { code } = req.query;

    if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Authorization code is missing.' });
    }

    try {
        // 1. Exchange code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code: code,
            }),
        });

        const tokenData = await tokenResponse.json();
        if (tokenData.error) {
            console.error("GitHub token exchange error:", tokenData);
            return res.status(400).json({ error: 'Failed to authenticate with GitHub.' });
        }
        const accessToken = tokenData.access_token;

        // 2. Fetch user profile from GitHub
        const userResponse = await fetch('https://api.github.com/user', {
            headers: { Authorization: `token ${accessToken}` },
        });
        const githubUser = await userResponse.json();
        
        // 3. Fetch user emails if primary is not public
        let userEmail = githubUser.email;
        if (!userEmail) {
            const emailResponse = await fetch('https://api.github.com/user/emails', {
                 headers: { Authorization: `token ${accessToken}` },
            });
            const emails = await emailResponse.json();
            const primaryEmail = emails.find(e => e.primary && e.verified);
            if (primaryEmail) {
                userEmail = primaryEmail.email;
            }
        }
        
        // 4. Check if user exists in our DB (Vercel Blob), or create them
        const userBlobPath = `users/github-${githubUser.id}.json`;
        let userProfile: UserProfile;

        const { blobs } = await list({ prefix: userBlobPath, limit: 1 });

        if (blobs.length > 0) { // User found
            const userProfileRes = await fetch(blobs[0].url);
            if (!userProfileRes.ok) {
                throw new Error(`Failed to fetch user profile: ${userProfileRes.statusText}`);
            }
            userProfile = await userProfileRes.json();
            // Optional: update email or username if they changed on GitHub
            userProfile.githubUsername = githubUser.login;
            userProfile.email = userEmail;
        } else { // User not found, create new profile
            const adminEmailsList = (ADMIN_EMAILS || '').split(',').map(e => e.trim());
            userProfile = {
                id: crypto.randomUUID(),
                githubId: githubUser.id,
                githubUsername: githubUser.login,
                email: userEmail,
                role: userEmail && adminEmailsList.includes(userEmail) ? 'admin' : 'user'
            };
        }
        
        await put(userBlobPath, JSON.stringify(userProfile), { access: 'public', addRandomSuffix: false });
        
        // 5. Create JWT and set cookie
        const tokenPayload = {
            userId: userProfile.id,
            githubId: userProfile.githubId,
            githubUsername: userProfile.githubUsername,
            email: userProfile.email,
            role: userProfile.role,
        };

        const token = sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

        const cookie = serialize('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/',
        });

        res.setHeader('Set-Cookie', cookie);
        
        // 6. Redirect to the homepage
        res.redirect('/');

    } catch (error: any) {
        console.error('GitHub callback error:', error);
        return res.status(500).json({ error: 'An internal server error occurred during authentication.' });
    }
}
