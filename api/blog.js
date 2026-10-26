// The public side of the blog: the list, a tag, one post, and the rss feed. Pages are built here, on the server, so they
// load without any script and link previews work. Anything unpublished is never read from here.
const B = require("./_blog");

const SITE = "https://tuftle.vercel.app";
const first = v => (Array.isArray(v) ? v[0] : v);

function cardHtml(p) {
  return `<a class="card post-card" href="/blog/${B.esc(p.slug)}">
        <h3>${B.esc(p.title)}</h3>
        <div class="post-meta">${B.day(p.date)}${p.minutes ? " · " + p.minutes + " min read" : ""}</div>
        ${p.summary ? `<p>${B.esc(p.summary)}</p>` : ""}
        ${p.tags && p.tags.length ? `<div class="chips">${p.tags.map(t => `<span class="chip tag">${B.esc(t)}</span>`).join("")}</div>` : ""}
      </a>`;
}

function tagRow(all, current) {
  const counts = {};
  for (const p of all) for (const t of p.tags || []) counts[t] = (counts[t] || 0) + 1;
  const names = Object.keys(counts).sort();
  if (!names.length) return "";
  return `<div class="tag-row" role="group" aria-label="filter by tag">
      <a class="chip${current ? "" : " on"}" href="/blog">all</a>
      ${names.map(t => `<a class="chip${t === current ? " on" : ""}" href="/blog/tag/${encodeURIComponent(t)}">${B.esc(t)} <small>${counts[t]}</small></a>`).join("")}
    </div>`;
}

const listPage = (posts, all, tag) => B.shell({
  title: tag ? `${tag} · blog · tuftle` : "blog · tuftle",
  description: tag ? `posts tagged ${tag} on the tuftle blog.` : "notes from tuftle: what we make, and how.",
  canonical: SITE + (tag ? "/blog/tag/" + encodeURIComponent(tag) : "/blog"),
  body: `
    <section class="hero">
      <h1>${tag ? B.esc(tag) : "blog."}</h1>
      <p>${tag ? `posts tagged <b>${B.esc(tag)}</b>. <a href="/blog">see everything</a>.` : "notes from tuftle: what we make, how it works, and what we changed our minds about."}</p>
    </section>
    ${tagRow(all, tag)}
    <section class="post-list">
      ${posts.length ? posts.map(cardHtml).join("\n      ") : `<p class="empty">${tag ? "nothing with that tag yet." : "nothing here yet. the first post is on its way."}</p>`}
    </section>`,
});

const postPage = post => B.shell({
  title: `${post.title} · tuftle`,
  description: post.summary || B.render(post.body).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160),
  canonical: `${SITE}/blog/${post.slug}`,
  og: { title: post.title, type: "article" },
  body: `
    <article class="post">
      <p class="back"><a href="/blog">&larr; all posts</a></p>
      <h1>${B.esc(post.title)}</h1>
      <div class="post-meta">${B.day(post.date)} · ${B.minutes(post.body)} min read</div>
      ${post.tags.length ? `<div class="chips">${post.tags.map(t => `<a class="chip tag" href="/blog/tag/${encodeURIComponent(t)}">${B.esc(t)}</a>`).join("")}</div>` : ""}
      <div class="post-body">
${B.render(post.body)}
      </div>
    </article>`,
});

const missing = () => B.shell({
  title: "not found · tuftle",
  description: "that page is not here.",
  body: `<section class="hero"><h1>not found.</h1><p>that post is not here, or it has not been published. <a href="/blog">back to the blog</a>.</p></section>`,
});

function feed(posts) {
  const items = posts.slice(0, 30).map(p => `    <item>
      <title>${B.esc(p.title)}</title>
      <link>${SITE}/blog/${B.esc(p.slug)}</link>
      <guid>${SITE}/blog/${B.esc(p.slug)}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
${p.summary ? `      <description>${B.esc(p.summary)}</description>\n` : ""}${(p.tags || []).map(t => `      <category>${B.esc(t)}</category>`).join("\n")}
    </item>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>tuftle blog</title>
    <link>${SITE}/blog</link>
    <description>notes from tuftle: what we make, and how.</description>
    <language>en</language>
${items}
  </channel>
</rss>`;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const view = first(req.query.view) || "index";
  try {
    const all = (await B.readIndex()).filter(p => !p.draft).sort((a, b) => new Date(b.date) - new Date(a.date));
    if (view === "feed") {
      res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
      res.status(200).send(feed(all));
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (view === "tag") {
      const tag = String(first(req.query.tag) || "").toLowerCase();
      res.status(200).send(listPage(all.filter(p => (p.tags || []).includes(tag)), all, tag));
      return;
    }
    if (view === "post") {
      const slug = String(first(req.query.slug) || "");
      const meta = all.find(p => p.slug === slug);
      const post = meta && (await B.readPost(slug));
      if (!post || post.draft) {
        res.setHeader("Cache-Control", "no-store");
        res.status(404).send(missing());
        return;
      }
      res.status(200).send(postPage(post));
      return;
    }
    res.status(200).send(listPage(all, all, null));
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(500).send(B.shell({ title: "blog · tuftle", description: "", body: `<section class="hero"><h1>blog.</h1><p>the posts could not be loaded just now. try again in a minute.</p></section>` }));
  }
};
