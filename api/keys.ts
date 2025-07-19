
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, list, del } from '@vercel/blob';
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
            case 'POST': {
                const { pageSpeedApiKey, geminiApiKey } = req.body as ApiKeys;

                // Fetch existing keys to merge, not just overwrite
                let existingKeys: ApiKeys = {};
                try {
                    const listResult = await list({ prefix: blobPath, limit: 1 });
                    if (listResult.blobs.length > 0) {
                        const existingBlob = await fetch(listResult.blobs[0].url);
                        existingKeys = await existingBlob.json();
                        await del(listResult.blobs[0].url); // Delete old blob before creating new one
                    }
                } catch(e) {
                     console.log("No existing keys found or failed to retrieve, creating new.", e)
                }
                
                const newKeys: ApiKeys = {
                    pageSpeedApiKey: pageSpeedApiKey || existingKeys.pageSpeedApiKey,
                    geminiApiKey: geminiApiKey || existingKeys.geminiApiKey,
                };
                
                if (!newKeys.pageSpeedApiKey && !newKeys.geminiApiKey) {
                    return res.status(400).json({ message: 'At least one API key must be provided.' });
                }

                await put(blobPath, JSON.stringify(newKeys), { access: 'public', addRandomSuffix: false });
                return res.status(200).json({ message: 'API keys saved successfully.' });
            }

            case 'GET': {
                const listResult = await list({ prefix: blobPath, limit: 1 });
                if (listResult.blobs.length === 0) {
                    return res.status(404).json({ message: 'No API keys found for this session.' });
                }
                const blob = listResult.blobs[0];
                const blobResponse = await fetch(blob.url);
                const blobJson = await blobResponse.json();
                return res.status(200).json(blobJson);
            }
            
            case 'DELETE': {
                const listResult = await list({ prefix: blobPath });
                if (listResult.blobs.length > 0) {
                    const urlsToDelete = listResult.blobs.map(b => b.url);
                    await del(urlsToDelete);
                }
                return res.status(200).json({ message: 'API keys cleared successfully.' });
            }

            default:
                res.setHeader('Allow', ['POST', 'GET', 'DELETE']);
                return res.status(405).end('Method Not Allowed');
        }
    } catch (error: any) {
        console.error(`[API Keys Error] [${req.method}]`, error);
        return res.status(500).json({ message: `An internal server error occurred: ${error.message}` });
    }
}
