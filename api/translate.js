export const config = {
  api: {
    bodyParser: true,
  },
};

// Simple in-memory store for rate limiting
const rateLimitStore = new Map();

// Rate limiting middleware
function rateLimit(req, res) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 50;

  const userRequests = rateLimitStore.get(ip) || [];
  const validRequests = userRequests.filter(time => now - time < windowMs);

  if (validRequests.length >= maxRequests) {
    return {
      limited: true,
      retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
    };
  }

  validRequests.push(now);
  rateLimitStore.set(ip, validRequests);
  return { limited: false };
}

export default async function handler(req, res) {
  // Apply rate limiting
  const rateLimitResult = rateLimit(req, res);
  if (rateLimitResult.limited) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'You have made too many requests. Please try again in a few minutes.',
      retryAfter: rateLimitResult.retryAfter
    });
  }

  // Headers CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end(); // Preflight OK
  }

  // Validate request method
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check if API key exists
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ Missing GEMINI_API_KEY environment variable");
    return res.status(500).json({ error: "Server configuration error" });
  }

  const { text, market, width } = req.body;

  // Validate input - fix console.log placement
  if (!text || typeof text !== "string" || !market) {
    console.log("❗️Request body validation failed:", { text, market });
    return res.status(400).json({ error: 'Missing "text" or "market"' });
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
  Do not translate the word "checkout" to Spanish; keep it in English.
  Keep the translated text concise so that it fits within ${width || 300} pixels of horizontal space.
  Return only the final translated string.

  Original: "${text}"
  Market: ${market}"
  `;

  try {
    console.log("🔄 Making request to Gemini API...");
    
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

    // Check if the response is ok
    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error("❌ Gemini API error:", geminiRes.status, errorText);
      
      if (geminiRes.status === 429) {
        return res.status(429).json({ 
          error: "Rate limit exceeded",
          message: "The translation service is currently busy. Please try again in a few minutes.",
          retryAfter: 60 // 1 minute in seconds
        });
      }
      
      return res.status(500).json({ 
        error: "Translation service unavailable",
        message: "We're experiencing technical difficulties. Please try again later.",
        detail: `API returned ${geminiRes.status}` 
      });
    }

    const result = await geminiRes.json();
    console.log("✅ Gemini response received");

    // Extract translation with better error handling
    let translation = null;
    try {
      if (
        result?.candidates?.[0]?.content?.parts?.[0]?.text
      ) {
        translation = result.candidates[0].content.parts[0].text.trim();
      }
    } catch (parseError) {
      console.error("❌ Error parsing Gemini response:", parseError);
      console.log("Raw response:", JSON.stringify(result, null, 2));
    }

    if (!translation) {
      console.error("❌ No translation found in response:", JSON.stringify(result, null, 2));
      return res.status(500).json({ 
        error: "Translation failed", 
        detail: "No translation returned from service" 
      });
    }

    console.log("✅ Translation successful:", translation);
    return res.status(200).json({ translatedText: translation });

  } catch (error) {
    console.error("❌ Handler error:", error);
    
    // Handle specific error types
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return res.status(500).json({
        error: "Network error",
        detail: "Unable to reach translation service"
      });
    }
    
    return res.status(500).json({
      error: "Translation failed",
      detail: error.message || "Unknown server error",
    });
  }
}