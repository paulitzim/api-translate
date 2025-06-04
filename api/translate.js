export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method is allowed' });
  }

  const { text, market } = req.body;

  if (!text || typeof text !== 'string' || !market) {
    return res.status(400).json({ error: 'Missing or invalid "text" or "market"' });
  }

  const systemPrompt = `
You are a UX content translator that localizes UI strings from English to Spanish.

If the market is Panama:
- Use friendly, direct language like in https://www.liberty.com.pa/faqs.
- Say "pagar la factura", "configurar tu cuenta", "ver tus consumos", "activar tu servicio".
- Be close and conversational.

If the market is Puerto Rico:
- Use warm, professional tone like in https://www.libertypr.com/es/faqs-centro-de-ayuda.
- Say "factura", "servicio", "equipo", "internet fijo", "televisión".
- Avoid overly neutral Spanish; prefer local familiarity.

Never translate product or brand names. Aim for clarity and naturalness.
`;

  const prompt = `${systemPrompt}\n\nTranslate this text for the market "${market}": "${text}"`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ]
      })
    });

    const data = await response.json();

    if (!data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return res.status(500).json({ error: 'Invalid response from Gemini API', data });
    }

    const translatedText = data.candidates[0].content.parts[0].text.trim();
    res.status(200).json({ translatedText });
  } catch (err) {
    console.error('Gemini API error:', err);
    res.status(500).json({ error: 'Translation failed', detail: err.message });
  }
}
