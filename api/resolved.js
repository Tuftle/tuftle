// Wren asks here whether its reports have been fixed: /api/resolved?ids=abcd2345,efgh6789. It answers only for codes it is
// given, and only with the note written for that report.
const { load, ID } = require("./_store");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") {
    res.status(405).json({ ok: false });
    return;
  }
  const ids = String(req.query.ids || "").split(",").filter(id => ID.test(id)).slice(0, 20);
  const resolved = {};
  try {
    await Promise.all(ids.map(async id => {
      const found = await load(`resolved/${id}.json`);
      if (found) {
        resolved[id] = { message: String(found.message || ""), at: found.at };
      }
    }));
    res.status(200).json({ ok: true, resolved });
  } catch (e) {
    res.status(502).json({ ok: false });
  }
};
