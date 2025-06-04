export default async function handler(req, res) {
  // Manejo CORS
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

  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "text" in body' });
  }

  try {
    const geminiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + process.env.GEMINI_API_KEY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a UX content specialist for a telecom company translating UI strings from English to Spanish.

Apply tone and vocabulary depending on the market as follows:

**If the market is Panama:**
- Use clear, simple, and helpful language.
- Speak directly to the user using "tú".
- Prioritize action-oriented verbs like "paga", "configura", "actualiza".
- Avoid regionalisms or idioms. Use universal Latin American Spanish.
- Maintain a warm but efficient tone, close to a helpful assistant.

**If the market is Puerto Rico:**
- Use formal but natural Spanish.
- Speak directly to the user using "tú", but in a respectful way.
- Use vocabulary and expressions familiar in Puerto Rico (e.g., "factura" instead of "recibo", "servicio" instead of "plan").
- Keep answers complete but concise, without overexplaining.
- Maintain a corporate yet friendly tone, like an expert advisor.

**In all cases:**
- Do not translate product names, brand names, or service names.
- Translate only the actual content the user would see in the interface.
- Prioritize natural phrasing over literal translation.
- Keep the tone aligned with self-service digital flows (not legal, not salesy).

Translate this string accordingly:

Original: "${text}"`
          }]
        }]
      })
    });

    const data = await geminiRes.json();

    const translation = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!translation) {
      return res.status(500).json({ error: 'Invalid response from Gemini', data });
    }

    res.status(200).json({ translatedText: translation });

  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ error: 'Translation failed', detail: error.message });
  }
}
