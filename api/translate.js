export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method is allowed' });
  }

  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid \"text\" in body' });
  }

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a UX content translator. Translate the following UI string from English to Spanish, adapting the style to the given market.

If the market is Panama:
- Use simple, friendly, and direct language.
- Favor common Latin American Spanish without regionalisms.
- Use terms like "pagar la factura", "configurar tu cuenta".

If the market is Puerto Rico:
- Maintain a formal but approachable tone.
- Use vocabulary familiar in Puerto Rico (e.g., "factura", not "recibo"; "servicio", not "plan").
- Avoid overly neutral or continental expressions.

Do not translate product or brand names. Prioritize clarity and a natural tone.`

          },
          {
            role: 'user',
            content: `Original: "${text}"`
          }
        ],
        temperature: 0.7,
        max_tokens: 100
      })
    });

    const data = await openaiRes.json();

    if (!data.choices || !data.choices[0]?.message?.content) {
      return res.status(500).json({ error: 'Invalid response from OpenAI', data });
    }

    const translation = data.choices[0].message.content.trim();
    res.status(200).json({ translatedText: translation });

  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: 'Translation failed', detail: error.message });
  }
}
