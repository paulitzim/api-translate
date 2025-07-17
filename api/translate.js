// api/translate.js

export const config = {
  api: {
    bodyParser: true,
  },
};

// In‑memory store for simple IP‑based rate limiting
const rateLimitStore = new Map();
function rateLimit(req) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 50;

  const timestamps = rateLimitStore.get(ip) || [];
  const recent = timestamps.filter(t => now - t < windowMs);

  if (recent.length >= maxRequests) {
    return {
      limited: true,
      retryAfter: Math.ceil((recent[0] + windowMs - now) / 1000),
    };
  }

  recent.push(now);
  rateLimitStore.set(ip, recent);
  return { limited: false };
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Rate limiting
  const { limited, retryAfter } = rateLimit(req);
  if (limited) {
    return res
      .status(429)
      .json({ error: "Rate limit exceeded", retryAfter });
  }

  // Only POST allowed
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Ensure API key is set
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ Missing GEMINI_API_KEY");
    return res.status(500).json({ error: "Server configuration error" });
  }

  const { text, market, width } = req.body;
  if (!text || typeof text !== "string" || !market) {
    console.log("❗️ Validation failed:", { text, market });
    return res.status(400).json({ error: 'Missing "text" or "market"' });
  }

  // Build the prompt with your PR dictionary overrides
  const prompt = `
You are a UX content translator specialized in telecom apps and websites. Translate the following UI string from English to Spanish, adapting the style and tone to the specified market.

If the market is Panama:
- Use simple, clear and warm language.
- Avoid regionalisms. Keep it pan‑Latin American.
- Use phrases like "pagar la factura", "configurar tu cuenta", "métodos de pago".
- Reflect the tone used in the Liberty Panama FAQs.

If the market is Puerto Rico:
- Use formal but friendly tone.
- Use second‑person singular ("tú") instead of "usted".
- Terminology updates:
    “Retira” → “Recoge”
    “Pides” → “Ordenas”
    “Hábiles” → “Laborables”
    “Punto de recogida” → “Localidad”
    “Pedido” → “Orden”
    “Verificación de datos” → “Verificación de Información”
    “Comprobante” → “Recibo”
    “Factura por E‑mail” → “Factura electrónica (e‑bill)”
    "¿A dónde quieres que te lo enviemos?" → "¿Dónde deseas recibir tu orden?"
    "La dirección ingresada no está dentro de nuestra zona de entrega" → "La dirección no se encuentra dentro de nuestra zona de entrega"
    "Data Verification" → "Detail Verification"
    "Voucher" → "Receipt"
    "Sorry, there’s no stock at the selected store." → "Sorry, we're out of stock at the selected location."
    "Please choose another store or select another delivery option to continue" → "Please choose another location or select another delivery method to continue."
    "Where do you want it delivered?" → "Where do you want your order?"
- Avoid Spain‑style expressions; keep it clear and consistent.

Do not translate product or brand names.
Do not translate the word "checkout"; keep it in English.
Keep the translated text concise so that it fits within ${width || 300} pixels.
Return only the final translated string.

Original: "${text}"
Market: ${market}
`;

  try {
    console.log("🔄 Requesting Gemini…");
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: prompt }] }
          ]
        }),
      }
    );

    // Model overloaded
    if (geminiRes.status === 503) {
      console.error("❌ Gemini overloaded:", await geminiRes.text());
      return res
        .status(503)
        .json({ error: "Service unavailable – model is overloaded. Please try again later." });
    }

    // Rate limit from Gemini
    if (geminiRes.status === 429) {
      const body = await geminiRes.json().catch(() => ({}));
      return res
        .status(429)
        .json({
          error: "Rate limit exceeded",
          message: "Translation service busy. Try again in a minute.",
          retryAfter: 60
        });
    }

    if (!geminiRes.ok) {
      const body = await geminiRes.json().catch(() => ({}));
      console.error("❌ Gemini API error:", geminiRes.status, body);
      return res
        .status(500)
        .json({ error: body.error?.message || "Unknown Gemini error" });
    }

    const result = await geminiRes.json();
    const translation = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!translation) {
      console.error("❌ No translation in response:", JSON.stringify(result, null, 2));
      return res.status(500).json({ error: "Translation failed", detail: "No translation returned." });
    }

    console.log("✅ Translation:", translation);
    return res.status(200).json({ translatedText: translation });

  } catch (err) {
    console.error("❌ Handler error:", err);
    if (err.name === "TypeError") {
      return res.status(500).json({ error: "Network error", detail: err.message });
    }
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
