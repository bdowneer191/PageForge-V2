
import type { VercelRequest, VercelResponse } from '@vercel/node';

const runPageSpeedForStrategy = async (apiKey: string, pageUrl: string, strategy: 'mobile' | 'desktop') => {
  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(pageUrl)}&key=${apiKey}&strategy=${strategy}&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO`;
  
  const response = await fetch(apiUrl);
  if (!response.ok) {
      const errorData = await response.json();
      const message = errorData?.error?.message || `Failed to fetch PageSpeed data for ${strategy}. Status: ${response.status}. Please check your URL and API Key configuration on the server.`;
      throw new Error(message);
  }
  return response.json();
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { pageUrl } = req.body;
    const apiKey = process.env.PAGESPEED_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ message: 'PageSpeed API key is not configured on the server.' });
    }
    if (!pageUrl) {
        return res.status(400).json({ message: 'pageUrl is required.' });
    }

    try {
        const [mobile, desktop] = await Promise.all([
            runPageSpeedForStrategy(apiKey, pageUrl, 'mobile'),
            runPageSpeedForStrategy(apiKey, pageUrl, 'desktop')
        ]);
        return res.status(200).json({ mobile, desktop });
    } catch (error: any) {
        console.error("Error fetching PageSpeed report in Vercel Function:", error);
        return res.status(500).json({ message: error.message });
    }
}
