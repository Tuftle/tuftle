// Small JSON files in the site's private blob store: reports/<id>.json when a report comes in, resolved/<id>.json when it is fixed.
const { put, get } = require("@vercel/blob");

async function save(pathname, data) {
  await put(pathname, JSON.stringify(data), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

async function load(pathname) {
  const found = await get(pathname, { access: "private", useCache: false });
  if (!found || found.statusCode !== 200) {
    return null;
  }
  return new Response(found.stream).json();
}

module.exports = { save, load, ID: /^[a-z2-9]{8}$/ };
