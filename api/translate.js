export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  // Headers CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end(); // Preflight OK
  }

  const { text, market, width } = req.body;

  if (!text || typeof text !== "string" || !market) {
    return res.status(400).json({ error: 'Missing "text" or "market"' });
    console.log("❗️Request body validation failed:", { text, market });
  }

  const prompt = `
  You are a UX content translator specialized in telecom apps and websites. Translate the following UI string from English to Spanish, adapting the style and tone to the specified market.

  If the market is Panama:
  - Use simple, clear and warm language.
  - Avoid regionalisms. Keep it pan-Latin American.
  - Use phrases like "pagar la factura", "configurar tu cuenta", "métodos de pago".
  - Reflect the tone used in the Liberty Panama FAQs.

  If the market is Puerto Rico:
  - Use formal but friendly tone.
  - Use second-person singular ("tú") instead of formal "usted".
  - Use terminology aligned with the Liberty Puerto Rico writing guidelines:
    - Use "servicio" instead of "plan".
    - Prefer "configura tu cuenta" over "ajusta tu perfil".
    - Avoid Spain-style expressions and overly neutral phrasing.
    - Use vocabulary aligned with customer support documentation and avoid ambiguity.
  - Prioritize clarity, trust, and consistency.

  Do not translate product or brand names.
  Keep the translated text concise so that it fits within ${width || 300} pixels of horizontal space.
  Return only the final translated string.

  Original: "${text}"
  Market: ${market}"
  `;


  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    const result = await geminiRes.json();
    console.log("Respuesta completa de Gemini:", JSON.stringify(result, null, 2));

  let translation = null;
  if (
    result &&
    result.candidates &&
    result.candidates[0] &&
    result.candidates[0].content &&
    result.candidates[0].content.parts &&
    result.candidates[0].content.parts[0] &&
    result.candidates[0].content.parts[0].text
  ) {
    translation = result.candidates[0].content.parts[0].text.trim();
  }

    if (!translation) throw new Error("Missing translation from Gemini");

    return res.status(200).json({ translatedText: translation });
  } catch (error) {
    console.error("Falla en el handler:", error);
    console.error("❌ Server error:", error);
    return res.status(500).json({
      error: "Translation failed",
      detail: error.message || "Unknown error",
    });
  }
}
