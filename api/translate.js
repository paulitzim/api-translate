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

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "text" in body' });
  }

  const systemPrompt = `
You are a UX content translator that localizes user interface text from English to Spanish.

If the market is Panama:
- Use a friendly and direct tone.
- Use Latin American standard expressions, avoiding regionalisms.
- Prefer terms like: "pagar la factura", "configurar tu cuenta", "ver tus consumos", "soporte técnico", "activar tu servicio".
- Keep the tone simple, close, and human, like the FAQs on https://www.liberty.com.pa/faqs.

If the market is Puerto Rico:
- Use a professional but warm tone.
- Adapt to terms familiar in PR: "factura", "servicio", "equipo", "internet fijo", "televisión".
- Reflect the tone used in https://www.libertypr.com/es/faqs-centro-de-ayuda: polite, reassuring, and helpful, avoiding neutral continental phrases.
- Use proper conjugation like "puedes hacer esto", "encuéntralo aquí", "necesitas ayuda con tu cuenta".

Never translate product names or brand names. Always favor clarity and a natural tone over literal translation.
`;

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + process.env.GEMINI_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\nTranslate this text to Spanish for the market "${market}": "${text}"` }] }
          ]
        })
      }
    );

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
      return res.status(500).json({ error: 'Invalid response from Gemini API', data });
    }

    const translation = data.candidates[0].content.parts[0].text.trim();
    res.status(200).json({ translatedText: translation });

  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ error: 'Translation failed', detail: error.message });
  }
}
