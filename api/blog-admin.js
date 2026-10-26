// The author's side of the blog. Every action except "me" needs the tuftle_admin cookie to hold the secret in the
// BLOG_ADMIN_KEY environment variable. Changes must also come from this site's own pages (a custom header and a matching
// Origin), so another website cannot make your browser post for you.
const B = require("./_blog");

const FAILS = new Map(); // ip -> [timestamps] of wrong keys, kept only in this function's memory
const tooManyFails = ip => (FAILS.get(ip) || []).filter(t => Date.now() - t < 15 * 60e3).length >= 8;
const noteFail = ip => FAILS.set(ip, [...(FAILS.get(ip) || []).filter(t => Date.now() - t < 15 * 60e3), Date.now()]);

const send = (res, status, data) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(data);
};

function fromThisSite(req) {
  if (req.headers["x-tuftle"] !== "blog") {
    return false;
  }
  const origin = req.headers.origin;
  return !origin || new URL(origin).host === req.headers.host;
}

const cookie = value => `tuftle_admin=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${value ? 60 * 24 * 3600 : 0}`;

function metaOf(post) {
  return { slug: post.slug, title: post.title, date: post.date, tags: post.tags, summary: post.summary, draft: !!post.draft, minutes: B.minutes(post.body), updated: post.updated };
}

async function addTags(names) {
  const known = await B.readTags();
  const merged = [...new Set([...known, ...names])].sort();
  if (merged.length !== known.length) {
    await B.save(B.TAGS, merged);
  }
  return merged;
}

module.exports = async (req, res) => {
  let body = {};
  try {
    body = req.method === "POST" ? (typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {}) : {};
  } catch (e) {
    body = {};
  }
  const action = (req.method === "GET" ? req.query.action : body.action) || "";
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";

  if (req.method === "GET" && action === "me") {
    send(res, 200, { admin: B.isAdmin(req) });
    return;
  }
  if (req.method !== "POST" || !fromThisSite(req)) {
    send(res, 403, { ok: false });
    return;
  }

  if (action === "login") {
    if (tooManyFails(ip)) {
      send(res, 429, { ok: false, error: "too many tries. wait a few minutes." });
      return;
    }
    const key = process.env.BLOG_ADMIN_KEY;
    if (!key || key.length < 24 || !B.same(String(body.key || ""), key)) {
      noteFail(ip);
      await new Promise(r => setTimeout(r, 600));
      send(res, 401, { ok: false, error: "that is not the key." });
      return;
    }
    res.setHeader("Set-Cookie", cookie(key));
    send(res, 200, { ok: true });
    return;
  }
  if (action === "logout") {
    res.setHeader("Set-Cookie", cookie(""));
    send(res, 200, { ok: true });
    return;
  }
  if (!B.isAdmin(req)) {
    send(res, 401, { ok: false, error: "not signed in." });
    return;
  }

  try {
    if (action === "list") {
      const index = (await B.readIndex()).sort((a, b) => new Date(b.date) - new Date(a.date));
      send(res, 200, { ok: true, posts: index, tags: await addTags([]) });
      return;
    }
    if (action === "get") {
      const post = await B.readPost(String(body.slug || ""));
      send(res, post ? 200 : 404, post ? { ok: true, post } : { ok: false, error: "no such post." });
      return;
    }
    if (action === "preview") {
      send(res, 200, { ok: true, html: B.render(String(body.body || "").slice(0, 200000)) });
      return;
    }
    if (action === "save") {
      const title = String(body.title || "").trim().slice(0, 140);
      const text = String(body.body || "");
      if (!title) {
        send(res, 400, { ok: false, error: "the post needs a title." });
        return;
      }
      if (text.length > 200000) {
        send(res, 400, { ok: false, error: "that is longer than 200,000 characters." });
        return;
      }
      const oldSlug = body.oldSlug ? String(body.oldSlug) : "";
      const slug = String(body.slug || "").trim() || B.slugify(title);
      if (!B.SLUG.test(slug)) {
        send(res, 400, { ok: false, error: "the address can only hold lowercase letters, numbers and dashes." });
        return;
      }
      const index = await B.readIndex();
      if (slug !== oldSlug && index.some(p => p.slug === slug)) {
        send(res, 409, { ok: false, error: "another post already has that address." });
        return;
      }
      const date = /^\d{4}-\d{2}-\d{2}/.test(String(body.date || "")) ? new Date(String(body.date)).toISOString() : new Date().toISOString();
      const post = {
        slug,
        title,
        date,
        tags: B.cleanTags(body.tags),
        summary: String(body.summary || "").trim().slice(0, 300),
        draft: !!body.draft,
        body: text,
        updated: new Date().toISOString(),
      };
      await B.save(B.postPath(slug), post);
      const next = index.filter(p => p.slug !== slug && p.slug !== oldSlug);
      next.push(metaOf(post));
      await B.save(B.INDEX, next);
      if (oldSlug && oldSlug !== slug) {
        await B.save(B.postPath(oldSlug), { slug: oldSlug, title: "(moved)", date, tags: [], summary: "", draft: true, body: "", updated: post.updated, movedTo: slug });
      }
      await addTags(post.tags);
      send(res, 200, { ok: true, post: metaOf(post) });
      return;
    }
    if (action === "delete") {
      const slug = String(body.slug || "");
      if (!B.SLUG.test(slug)) {
        send(res, 400, { ok: false });
        return;
      }
      const index = await B.readIndex();
      await B.save(B.INDEX, index.filter(p => p.slug !== slug));
      // the file itself is overwritten with an empty draft, so nothing of it can be read again
      await B.save(B.postPath(slug), { slug, title: "(deleted)", date: new Date().toISOString(), tags: [], summary: "", draft: true, body: "", deleted: true });
      send(res, 200, { ok: true });
      return;
    }
    if (action === "tag-add") {
      const [tag] = B.cleanTags([body.tag]);
      if (!tag) {
        send(res, 400, { ok: false, error: "tags use letters, numbers, spaces and dashes, up to 29 characters." });
        return;
      }
      send(res, 200, { ok: true, tags: await addTags([tag]) });
      return;
    }
    if (action === "tag-remove") {
      const [tag] = B.cleanTags([body.tag]);
      const index = await B.readIndex();
      if (index.some(p => (p.tags || []).includes(tag))) {
        send(res, 409, { ok: false, error: "a post still uses that tag." });
        return;
      }
      const left = (await B.readTags()).filter(t => t !== tag);
      await B.save(B.TAGS, left);
      send(res, 200, { ok: true, tags: left });
      return;
    }
    send(res, 400, { ok: false, error: "unknown action." });
  } catch (e) {
    send(res, 500, { ok: false, error: "something went wrong saving that. try again." });
  }
};
