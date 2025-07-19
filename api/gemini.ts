
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { get } from '@vercel/blob';
import { ApiKeys } from '../types';

const getApiKey = async (sessionId?: string): Promise<string | undefined> => {
    if (sessionId) {
        try {
            const blobPath = `keys/${sessionId}.json`;
            const blobResponse = await get(blobPath);
            const userKeys = await blobResponse.json() as ApiKeys;
            if (userKeys.geminiApiKey) {
                return userKeys.geminiApiKey;
            }
        } catch (error) {
            // This can happen if blob doesn't exist (404), which is fine.
            console.log(`No user-provided Gemini key found for session ${sessionId}. Falling back to default.`);
        }
    }
    return process.env.GEMINI_API_KEY;
};


export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { action, payload, sessionId } = req.body;
    
    const apiKey = await getApiKey(sessionId);
    if (!apiKey) {
        return res.status(500).json({ message: 'Gemini API key is not configured on the server and no user-provided key is available.' });
    }
    
    const ai = new GoogleGenAI({apiKey});

    try {
        let responseData: any;

        switch(action) {
            case 'plan': {
                const prompt = `Based on the following PageSpeed Insights report, create a concise, actionable list of the top 5-7 optimization recommendations. For each recommendation, provide a title and a short description. Focus on the most impactful changes. Output should be in JSON format. The JSON should be an object with a single key "recommendations", which is an array of objects, each with "title" and "description" properties.\n\nPageSpeed Report:\n${JSON.stringify(payload.pageSpeedReport, null, 2)}`;
                
                const response = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: prompt,
                   config: {
                    responseMimeType: "application/json",
                     responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                          recommendations: {
                            type: Type.ARRAY,
                             items: {
                                type: Type.OBJECT,
                                properties: {
                                  title: { type: Type.STRING },
                                  description: { type: Type.STRING },
                                }
                            }
                          }
                        }
                    }
                  }
                });
                responseData = JSON.parse(response.text);
                break;
            }

            case 'compare': {
                const prompt = `Analyze the "before" and "after" PageSpeed reports. Provide a concise, insightful summary of the performance improvements. Highlight key metric changes (like LCP, FCP, Speed Index) and explain what these improvements mean for user experience. Keep it brief and easy to understand.\n\nBEFORE:\n${JSON.stringify(payload.reportBefore, null, 2)}\n\nAFTER:\n${JSON.stringify(payload.reportAfter, null, 2)}`;

                const response = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: prompt,
                });

                responseData = { analysis: response.text };
                break;
            }

            case 'rewrite': {
                 const prompt = `Rewrite the following HTML to be more semantic and accessible. Do not add or remove any visible text content. Only change the HTML structure. For example, change divs to article, section, nav, header, footer where appropriate. Add ARIA roles and attributes if they improve accessibility. Return only the rewritten inner HTML of the body, nothing else.\n\n${payload.html}`;
                
                const response = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: prompt,
                });
                responseData = { rewrittenHtml: response.text };
                break;
            }

            default:
                return res.status(400).json({ message: 'Invalid action specified.' });
        }

        return res.status(200).json(responseData);

    } catch (error: any) {
        console.error(`[Gemini API Error] [Action: ${action}]`, error);
        return res.status(500).json({ message: error.message || 'An error occurred while communicating with the Gemini API.' });
    }
}
