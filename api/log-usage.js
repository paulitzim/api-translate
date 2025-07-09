export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end(); // respuesta preflight
  }

  // Tu lógica de logging original:
  const { timestamp, market, action, nodeCount } = req.body;

  // Aquí puedes registrar en consola o base de datos
  console.log(`[${timestamp}] Market: ${market}, Action: ${action}, Nodes: ${nodeCount}`);

  res.status(200).json({ success: true });
}
