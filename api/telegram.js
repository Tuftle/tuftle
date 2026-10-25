// Telegram calls this when the bot gets a message. Only messages from the owner's chat are looked at, and the only
// command is: /resolve <code> <note for the person who sent the report>
const { save, load, ID } = require("./_store");

async function say(text) {
  await fetch(`https://api.telegram.org/bot${process.env.TG_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: process.env.TG_CHAT, text }),
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST" || req.headers["x-telegram-bot-api-secret-token"] !== process.env.TG_SECRET) {
    res.status(403).end();
    return;
  }
  try {
    const msg = (req.body && req.body.message) || {};
    if (String(msg.chat && msg.chat.id) === process.env.TG_CHAT && typeof msg.text == "string") {
      const m = msg.text.trim().match(/^\/resolve(?:@\w+)?\s+(\S+)\s*([\s\S]*)$/i);
      if (/^\/resolve/i.test(msg.text.trim()) && !m) {
        await say("usage: /resolve <code> <what to tell them>");
      } else if (m) {
        const id = m[1].toLowerCase();
        const note = m[2].replace(/\s+/g, " ").trim().slice(0, 300);
        const report = ID.test(id) && (await load(`reports/${id}.json`));
        if (!report) {
          await say(`no report with the code ${m[1]}`);
        } else {
          await save(`resolved/${id}.json`, { message: note, at: new Date().toISOString() });
          await say(`marked ${report.host} as fixed (${id}). they will see it the next time wren is open.`);
        }
      }
    }
  } catch (e) {
    // Telegram would only send it again; the next message will say what went wrong
  }
  res.status(200).json({ ok: true });
};
