import { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { text, model, sessionId } = await req.json();

    // Log to Vercel's built-in logging
    console.log(JSON.stringify({
      type: 'text_analysis_request',
      timestamp: new Date().toISOString(),
      sessionId,
      model,
      textLength: text?.length,
      textPreview: text?.substring(0, 100) + '...',
    }));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error logging text analysis:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 