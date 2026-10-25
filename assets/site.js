"use strict";

// shared by the add-ons pages: the mini window, and the bridge that hands a mod to wren
const Tuftle = (() => {
  let inWren = document.documentElement.dataset.wren == "1";
  let installed = [];
  const listeners = [];

  window.addEventListener("message", event => {
    if (event.source === window && event.data && event.data.tuftle == "wren-state") {
      inWren = true;
      installed = event.data.installed || [];
      listeners.forEach(fn => fn());
    }
  });

  const el = (tag, props = {}, ...kids) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k == "text") node.textContent = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) node.setAttribute(k, v === true ? "" : v);
    }
    node.append(...kids.flat().filter(Boolean));
    return node;
  };

  function windowPreview(p, big) {
    const w = el("div", { class: "win" + (big ? " big" : ""), "aria-hidden": "true" });
    w.style.setProperty("--bar", p.bar); w.style.setProperty("--tab", p.tab); w.style.setProperty("--url", p.url);
    w.style.setProperty("--ink", p.ink); w.style.setProperty("--accent", p.accent); w.style.setProperty("--r", p.radius + "px");
    w.append(
      el("div", { class: "tabs" }, el("i"), el("i"), el("i")),
      el("div", { class: "nav" }, el("b"), el("b"), el("u"), el("b")),
      el("div", { class: "page" }, el("span")));
    return w;
  }

  async function getMod(id) {
    const r = await fetch("/mods/" + encodeURIComponent(id) + ".json");
    if (!r.ok) throw new Error("not found");
    return r.json();
  }

  function installButton(id) {
    const b = el("button", { class: "btn", text: "add to wren" });
    const sync = () => {
      if (installed.includes(id)) { b.textContent = "added"; b.disabled = true; }
      else { b.textContent = "add to wren"; b.disabled = false; }
    };
    b.addEventListener("click", async event => {
      event.preventDefault(); event.stopPropagation();
      if (!inWren) { location.href = "/wren/addons#get-wren"; return; }
      b.textContent = "check wren…";
      window.postMessage({ tuftle: "wren-install", mod: await getMod(id) }, window.location.origin);
      setTimeout(sync, 1500);
    });
    listeners.push(sync);
    sync();
    return b;
  }

  return { el, windowPreview, getMod, installButton, get inWren() { return inWren; } };
})();
