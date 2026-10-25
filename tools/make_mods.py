#!/usr/bin/env python3
"""Writes mods/*.json and mods/index.json for the add-ons site.   python tools/make_mods.py"""
import json
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "mods")

# preview: colours for the little window drawn on each card: bar (toolbar), tab, url, ink, accent, radius
MODS = [
    {
        "id": "round-and-soft", "name": "round and soft", "author": "tuftle", "tags": ["shape", "calm"],
        "description": "rounder tabs, a pill-shaped address bar and softer corners everywhere.",
        "preview": {"bar": "#efe6d6", "tab": "#f9f3e8", "url": "#fffaf0", "ink": "#4a3a2c", "accent": "#b9784a", "radius": 14},
        "css": "#urlbar-background { border-radius: 999px !important; }\n.tab-background { border-radius: 14px !important; }\n#nav-bar toolbarbutton .toolbarbutton-icon { border-radius: 10px !important; }\n",
    },
    {
        "id": "ember-glow", "name": "ember glow", "author": "tuftle", "tags": ["colour", "warm"],
        "description": "the address bar glows amber when you click it, like a fire starting up.",
        "preview": {"bar": "#2a211a", "tab": "#3a2d23", "url": "#1f1812", "ink": "#ecd9bf", "accent": "#e8883a", "radius": 10},
        "css": "#urlbar[focused=\"true\"] > #urlbar-background {\n  box-shadow: 0 0 0 2px #e8883a, 0 0 18px 2px rgba(232, 136, 58, .45) !important;\n  transition: box-shadow .25s ease;\n}\n",
    },
    {
        "id": "moonlit", "name": "moonlit", "author": "tuftle", "tags": ["colour", "dark"],
        "description": "a cool, night-blue window instead of brown. easy on the eyes after dark.",
        "preview": {"bar": "#151a24", "tab": "#202838", "url": "#0f131b", "ink": "#cdd8ea", "accent": "#7aa2f7", "radius": 10},
        "css": "#nav-bar, #sidebar-main, #TabsToolbar { background-color: #151a24 !important; color: #cdd8ea !important; }\n#urlbar-background { background-color: #0f131b !important; border-color: #2b3550 !important; }\n#urlbar[focused=\"true\"] > #urlbar-background { box-shadow: 0 0 0 2px #7aa2f7 !important; }\n",
    },
    {
        "id": "hush", "name": "hush", "author": "tuftle", "tags": ["minimal", "calm"],
        "description": "hides the little icons in the address bar and the close buttons on tabs you are not using.",
        "preview": {"bar": "#f1ebdf", "tab": "#f9f4ea", "url": "#fffaf0", "ink": "#4a3a2c", "accent": "#8a4b2a", "radius": 10},
        "css": "#identity-box .identity-icon-label, #tracking-protection-icon-container, #page-action-buttons > :not(#star-button-box) { display: none !important; }\n.tab-close-button:not([selected]) { display: none !important; }\n",
    },
    {
        "id": "snug", "name": "snug", "author": "tuftle", "tags": ["layout", "compact"],
        "description": "everything a little tighter, so pages get more room.",
        "preview": {"bar": "#ebe2d2", "tab": "#f5eddf", "url": "#fffaf0", "ink": "#4a3a2c", "accent": "#a15a34", "radius": 6},
        "prefs": {"browser.uidensity": 1},
        "css": "#nav-bar { padding-block: 0 !important; }\n#urlbar { --urlbar-min-height: 28px !important; }\n",
    },
    {
        "id": "bookmarks-on-new-tab", "name": "bookmarks on new tabs only", "author": "tuftle", "tags": ["layout", "minimal"],
        "description": "the bookmarks bar only shows on a new tab, so it stays out of your way the rest of the time.",
        "preview": {"bar": "#f3ecdf", "tab": "#faf5ea", "url": "#fffaf0", "ink": "#4a3a2c", "accent": "#8a4b2a", "radius": 10},
        "prefs": {"browser.toolbars.bookmarks.visibility": "newtab"},
        "css": "",
    },
    {
        "id": "no-extensions-button", "name": "no extensions button", "author": "tuftle", "tags": ["minimal"],
        "description": "hides the puzzle-piece button when you do not use extensions.",
        "preview": {"bar": "#f1e9da", "tab": "#f8f2e6", "url": "#fffaf0", "ink": "#4a3a2c", "accent": "#8a4b2a", "radius": 10},
        "css": "#unified-extensions-button { display: none !important; }\n",
    },
    {
        "id": "quiet-sidebar", "name": "quiet sidebar", "author": "tuftle", "tags": ["calm", "layout"],
        "description": "dims the tab list until you point at it, so the page has your attention.",
        "preview": {"bar": "#e9dfcd", "tab": "#f4ecdc", "url": "#fffaf0", "ink": "#4a3a2c", "accent": "#b9784a", "radius": 12},
        "css": "#sidebar-main { opacity: .45; transition: opacity .25s ease; }\n#sidebar-main:hover, #sidebar-main:focus-within { opacity: 1; }\n",
    },
]


def main():
    os.makedirs(OUT, exist_ok=True)
    index = []
    for m in MODS:
        full = {"format": 1, "version": "1.0.0", **m}
        full.setdefault("prefs", {})
        with open(os.path.join(OUT, m["id"] + ".json"), "w", encoding="utf-8") as f:
            json.dump(full, f, indent=2)
        index.append({k: full[k] for k in ("id", "name", "version", "author", "description", "tags", "preview")} | {"prefs": list(full["prefs"])})
    with open(os.path.join(OUT, "index.json"), "w", encoding="utf-8") as f:
        json.dump({"mods": index}, f, indent=2)
    print(len(MODS), "mods written")


if __name__ == "__main__":
    main()
