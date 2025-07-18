import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verify } from 'jsonwebtoken';
import { put, get, del, head } from '@vercel/blob';
import type { Session } from '../../types.ts';

interface AuthPayload {
    userId: string;
    email: string | null;
    githubUsername: string;
    role: 'admin' | 'user';
}

const getUserFromToken = (token: string | undefined): AuthPayload | null => {
    if (!token) return null;
    try {
        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) throw new Error('JWT_SECRET not set');
        return verify(token, JWT_SECRET) as AuthPayload;
    } catch (error) {
        return null;
    }
};

const getSessions = async (userId: string): Promise<Session[]> => {
    const blobPath = `sessions/${userId}.json`;
    try {
        const blob = await get(blobPath);
        return await blob.json();
    } catch (error: any) {
        if (error.status === 404) {
            return []; // No sessions found is not an error
        }
        throw error; // Other errors (like network issues) should be thrown
    }
};

const saveSessions = async (userId: string, sessions: Session[]) => {
    const blobPath = `sessions/${userId}.json`;
    await put(blobPath, JSON.stringify(sessions), { access: 'public', addRandomSuffix: false });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const auth = getUserFromToken(req.cookies.auth_token);
    if (!auth) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    const { userId } = auth;

    try {
        switch (req.method) {
            case 'GET': {
                const sessions = await getSessions(userId);
                return res.status(200).json(sessions);
            }
            case 'POST': {
                const newSessionData: Partial<Session> = req.body;
                if (!newSessionData.url || !newSessionData.startTime) {
                    return res.status(400).json({ message: 'Invalid session data.' });
                }

                const sessions = await getSessions(userId);
                const sessionWithId = {
                    ...newSessionData,
                    id: `${newSessionData.startTime}-${crypto.randomUUID().slice(0, 8)}`,
                    userId: auth.userId,
                    userEmail: auth.email || auth.githubUsername // Use username as fallback
                } as Session;

                const updatedSessions = [sessionWithId, ...sessions];
                await saveSessions(userId, updatedSessions);
                return res.status(201).json(sessionWithId);
            }
            case 'DELETE': {
                 try {
                    await del(`sessions/${userId}.json`);
                } catch (error: any) {
                    if (error.status !== 404) { // Don't error if file doesn't exist
                        throw error;
                    }
                }
                return res.status(200).json({ message: 'User sessions cleared successfully' });
            }
            default:
                res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
                return res.status(405).json({ message: 'Method Not Allowed' });
        }
    } catch (error: any)
    {
        console.error('Session API Error:', error);
        return res.status(500).json({ message: `A critical server error occurred: ${error.message}` });
    }
}
