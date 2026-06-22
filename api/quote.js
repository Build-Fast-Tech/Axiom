/* =====================================================================
   Axiom — secure stock-quote proxy (Vercel serverless function)
   The Finnhub API key is read from the FINNHUB_KEY environment variable on
   the server and NEVER sent to the browser. The client calls /api/quote
   instead of finnhub.io directly.

   Setup:
     1. Vercel → Project → Settings → Environment Variables
        add  FINNHUB_KEY = <your finnhub key>   (do NOT commit it)
     2. Redeploy. The Markets widget switches to the secure proxy automatically.
   ===================================================================== */
module.exports = async (req, res) => {
  const symbol = String((req.query && req.query.symbol) || "").toUpperCase();
  // strict allow-list so the proxy can't be abused to fetch arbitrary symbols
  const ALLOWED = ["SPY", "DIA", "QQQ", "IWM", "VTI"];
  if (!ALLOWED.includes(symbol)) {
    res.status(400).json({ error: "symbol not allowed" });
    return;
  }
  const key = process.env.FINNHUB_KEY;
  if (!key) {
    res.status(503).json({ error: "FINNHUB_KEY not configured" });
    return;
  }
  try {
    const r = await fetch("https://finnhub.io/api/v1/quote?symbol=" + symbol + "&token=" + encodeURIComponent(key));
    if (!r.ok) { res.status(502).json({ error: "upstream error" }); return; }
    const d = await r.json();
    // edge-cache briefly so we don't hammer the upstream rate limit
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
    res.status(200).json({ c: d.c, dp: d.dp }); // only price + % change
  } catch (e) {
    res.status(502).json({ error: "request failed" });
  }
};
