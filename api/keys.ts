import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, get, del } from '@vercel/blob';
import { ApiKeys } from '../types.ts';

const getBlobPath = (sessionId: string) => `keys/${sessionId}.json`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { sessionId } = (req.method === 'GET' || req.method === 'DELETE' ? req.query : req.body) as { sessionId: string };

    if (!sessionId) {
        return res.status(400).json({ message: 'Session ID is required.' });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return res.status(500).json({ message: 'Blob storage is not configured on the server.' });
    }
    
    const blobPath = getBlobPath(sessionId);

    try {
        switch (req.method) {
            case 'POST':
                const { pageSpeedApiKey, geminiApiKey } = req.body as ApiKeys;
                if (!pageSpeedApiKey && !geminiApiKey) {
                    return res.status(400).json({ message: 'At least one API key must be provided.' });
                }
                await put(blobPath, JSON.stringify({ pageSpeedApiKey, geminiApiKey }));
                return res.status(200).json({ message: 'API keys saved successfully.' });

            case 'GET':
                try {
                    const blobResponse = await get(blobPath);
                    const blobJson = await blobResponse.json();
                    return res.status(200).json(blobJson);
                } catch (error: any) {
                    if (error.statusCode === 404) {
                        return res.status(404).json({ message: 'No API keys found for this session.' });
                    }
                    throw error;
                }
            
            case 'DELETE':
                await del(blobPath);
                return res.status(200).json({ message: 'API keys cleared successfully.' });

            default:
                res.setHeader('Allow', ['POST', 'GET', 'DELETE']);
                return res.status(405).end('Method Not Allowed');
        }
    } catch (error: any) {
        console.error(`[API Keys Error] [${req.method}]`, error);
        return res.status(500).json({ message: `An internal server error occurred: ${error.message}` });
    }
}
