export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { messages, provider } = req.body || {};

  if (!Array.isArray(messages)) {
    res.status(400).json({ error: "Missing messages array." });
    return;
  }

  // Pick which provider's key/model/endpoint to use based on the frontend's selection
  const chosen = provider === "2" ? "2" : "1";

  const apiKey = process.env[`PROVIDER_${chosen}_KEY`];
  const model = process.env[`PROVIDER_${chosen}_MODEL`];
  const endpoint =
    process.env[`PROVIDER_${chosen}_ENDPOINT`] || "https://openrouter.ai/api/v1/chat/completions";

  if (!apiKey || !model) {
    res.status(500).json({ error: `Server is not configured for model ${chosen} yet.` });
    return;
  }

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: data?.error?.message || "Upstream error" });
      return;
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to reach the AI provider." });
  }
}
