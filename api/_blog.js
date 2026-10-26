// Shared by the blog functions: how posts are stored, checked and turned into safe html, who counts as the author,
// and the page shell that matches the rest of the site. Files that start with an underscore are not served as functions.
const crypto = require("crypto");
const { marked } = require("marked");
const sanitizeHtml = require("sanitize-html");
const { save, load } = require("./_store");

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TAG = /^[a-z0-9][a-z0-9 -]{0,28}$/;
const INDEX = "blog/index.json"; // [{ slug, title, date, tags, summary, draft, updated }], newest first
const TAGS = "blog/tags.json"; // ["tag", ...]: names that exist even when no post uses them yet
const postPath = slug => `blog/posts/${slug}.json`;

// ---------- storage ----------
const readIndex = async () => (await load(INDEX)) || [];
const readTags = async () => (await load(TAGS)) || [];
const readPost = slug => (SLUG.test(slug) ? load(postPath(slug)) : null);

// ---------- text ----------
function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

function cleanTags(list) {
  const out = [];
  for (const t of Array.isArray(list) ? list : []) {
    const tag = String(t || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (TAG.test(tag) && !out.includes(tag)) {
      out.push(tag);
    }
  }
  return out.slice(0, 12);
}

const ALLOWED = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr", "a", "ul", "ol", "li", "strong", "em", "b", "i", "del", "s",
    "code", "pre", "blockquote", "img", "table", "thead", "tbody", "tr", "th", "td", "sup", "sub", "details", "summary", "kbd",
  ],
  allowedAttributes: { a: ["href", "title"], img: ["src", "alt", "title"], code: ["class"], th: ["align"], td: ["align"] },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https"] },
  transformTags: {
    a: (tag, attribs) => ({ tagName: "a", attribs: { ...attribs, rel: "noopener noreferrer" } }),
    img: (tag, attribs) => ({ tagName: "img", attribs: { ...attribs, loading: "lazy" } }),
  },
  allowedClasses: { code: [/^language-[a-z0-9+#-]+$/] },
};
ALLOWED.allowedAttributes.img.push("loading");
ALLOWED.allowedAttributes.a.push("rel");

function render(md) {
  return sanitizeHtml(marked.parse(String(md || ""), { gfm: true, breaks: false }), ALLOWED);
}

const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const words = md => (String(md || "").match(/\S+/g) || []).length;
const minutes = md => Math.max(1, Math.round(words(md) / 200));
const day = iso => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// ---------- who is the author ----------
function cookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) {
      try {
        out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
      } catch (e) {
        // a cookie that is not valid text is not ours
      }
    }
  }
  return out;
}

function same(a, b) {
  const x = crypto.createHash("sha256").update(String(a)).digest();
  const y = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

// the cookie called tuftle_admin must hold the secret kept in the BLOG_ADMIN_KEY environment variable
function isAdmin(req) {
  const key = process.env.BLOG_ADMIN_KEY;
  return !!key && key.length >= 24 && same(cookies(req).tuftle_admin || "", key);
}

// ---------- the page shell ----------
function shell({ title, description, canonical, body, nav = "blog", og = {} }) {
  const link = (href, text, key) => `<a href="${href}"${key === nav ? ' aria-current="page"' : ""}>${text}</a>`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="darkreader-lock">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  ${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ""}
  <meta property="og:site_name" content="tuftle">
  <meta property="og:title" content="${esc(og.title || title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:type" content="${og.type || "website"}">
  ${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ""}
  <link rel="alternate" type="application/rss+xml" title="tuftle blog" href="/blog/feed.xml">
  <link rel="icon" href="/assets/logo.svg">
  <link rel="stylesheet" href="/assets/style.css">
  <link rel="stylesheet" href="/assets/blog.css">
</head>
<body>
  <div class="wrap">
    <header class="top">
      <a class="brand" href="/"><img src="/assets/logo.svg" alt="">tuftle</a>
      <nav class="main">${link("/wren", "wren", "wren")}<a href="https://nooksearch.vercel.app">nook</a>${link("/wren/addons", "add-ons", "addons")}${link("/blog", "blog", "blog")}</nav>
    </header>
${body}
    <footer><span>tuftle · from <i>tüfteln</i>, to tinker with patience</span><span>made by tuftle, slowly. <a href="/blog/feed.xml">rss</a></span></footer>
  </div>
</body>
</html>`;
}

module.exports = {
  SLUG, TAG, INDEX, TAGS, postPath,
  readIndex, readTags, readPost, save, load,
  slugify, cleanTags, render, esc, words, minutes, day,
  cookies, same, isAdmin, shell,
};
