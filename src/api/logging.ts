import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { text, model, sessionId } = req.body;

    // Log to Vercel's built-in logging
    console.log(JSON.stringify({
      type: 'text_analysis_request',
      timestamp: new Date().toISOString(),
      sessionId,
      model,
      textLength: text?.length,
      textPreview: text?.substring(0, 100) + '...',
    }));

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error logging text analysis:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 