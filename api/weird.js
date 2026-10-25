// "this site looks weird" reports from Wren. It accepts a site name and a random report code and nothing else, keeps the
// pair so the report can be marked fixed later, and passes it on to a private Telegram chat. The bot token lives in the
// TG_TOKEN and TG_CHAT environment variables, never in Wren or in this repo.
const { save, load, ID } = require("./_store");

const HOST = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const SEEN = new Map(); // ip -> [timestamps], kept only in this function's memory
const LIMIT = 5; // reports per ip per hour
let total = 0;
let totalSince = Date.now();

function tooMany(ip) {
  const now = Date.now();
  if (now - totalSince > 3600e3) {
    total = 0;
    totalSince = now;
  }
  if (total >= 200) {
    return true;
  }
  const recent = (SEEN.get(ip) || []).filter(t => now - t < 3600e3);
  if (recent.length >= LIMIT) {
    SEEN.set(ip, recent);
    return true;
  }
  recent.push(now);
  SEEN.set(ip, recent);
  total++;
  if (SEEN.size > 5000) {
    SEEN.clear();
  }
  return false;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.status(405).json({ ok: false });
    return;
  }
  const body = typeof req.body == "string" ? safeParse(req.body) : req.body || {};
  const host = String(body.host || "").toLowerCase();
  const id = String(body.id || "");
  if (!HOST.test(host) || !ID.test(id) || Object.keys(body).some(k => k !== "host" && k !== "id")) {
    res.status(400).json({ ok: false });
    return;
  }
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (tooMany(ip)) {
    res.status(429).json({ ok: false });
    return;
  }
  const token = process.env.TG_TOKEN;
  const chat = process.env.TG_CHAT;
  if (!token || !chat) {
    res.status(500).json({ ok: false });
    return;
  }
  const when = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
  try {
    if (await load(`reports/${id}.json`)) {
      res.status(409).json({ ok: false });
      return;
    }
    await save(`reports/${id}.json`, { host, at: when });
    const sent = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: `looks weird: ${host}\n${when}\n/resolve ${id} `, disable_web_page_preview: true }),
    });
    res.status(sent.ok ? 200 : 502).json({ ok: sent.ok });
  } catch (e) {
    res.status(502).json({ ok: false });
  }
};

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return {};
  }
}
