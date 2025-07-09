export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const log = req.body;
  console.log("Plugin usage:", log);

  res.status(200).json({ ok: true });
}
