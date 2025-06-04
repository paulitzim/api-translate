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

  if (!text || typeof text !== 'string' || !market || typeof market !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "text" or "market" in body' });
  }

  const prompt = `
You are a UX content writer specialized in localization. Your job is to translate the following UI text from English to Spanish using the tone and vocabulary style of the given market.

Market: ${market}

If the market is "Panama":
- Use direct, friendly, and service-oriented language.
- Use Latin American Spanish without regionalisms.
- Examples of terms: "configurar tu cuenta", "pagar tu factura", "ver tus servicios".

If the market is "Puerto Rico":
- Maintain formal but warm tone.
- Use vocabulary specific to Puerto Rico when possible.
- Prefer "servicio" instead of "plan", and use "factura", not "recibo".
- Examples of terms: "manejar tu servicio", "consultar tu factura", "modificar tu cuenta".

Do not translate brand names or product names. Keep sentences short, clear, and user-centric.

Translate this: "${text}"
`;

  try {
    const geminiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + process.env.GEMINI_API_KEY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      })
    });

    const data = await geminiRes.json();

    if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
      return res.status(500).json({ error: 'Invalid response from Gemini', data });
    }

    const translation = data.candidates[0].content.parts[0].text.trim();
    res.status(200).json({ translatedText: translation });

  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ error: 'Translation failed', detail: error.message });
  }
}
