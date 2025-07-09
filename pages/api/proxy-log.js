export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Obtener IP desde headers (si está detrás de proxy) o socket
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
    
    // Obtener país desde encabezado si está disponible (como ejemplo)
    const country = req.headers["x-vercel-ip-country"] || ""; // solo si Vercel lo expone

    const scriptUrl = "https://script.google.com/macros/s/AKfycbyDGfSqF0ikJVKvcb9dMr_AERqbkSXsODVPXdZHXY2IBWElHVFvd7UM-Ufbv6e9PeDb/exec";
console.log("📝 LOG ENTRY:", JSON.stringify(body, null, 2)); // ← ESTO ES LO QUE DEBES VER
    const body = {
      ...req.body,
      ip,
      country,
    };
    

    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).json({ error: "Proxy failed", details: error.message });
  }
}
