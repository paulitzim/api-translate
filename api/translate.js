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
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a UX content translator. Translate the following UI string from English to Spanish (LatAm), using a friendly and clear tone. Avoid literal translations. Do not translate brand names.'
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
