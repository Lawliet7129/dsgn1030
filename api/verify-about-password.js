export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }

  const expected = process.env.ABOUT_PAGE_PASSWORD;
  if (!expected) {
    // Misconfigured environment. Never expose details to clients.
    return res.status(500).json({ ok: false });
  }

  const provided = typeof req.body?.password === "string" ? req.body.password : "";
  const ok = provided.length > 0 && provided === expected;
  return res.status(ok ? 200 : 401).json({ ok });
}
