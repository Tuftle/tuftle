"use strict";

// the egg on the wren page: arrives, wobbles, cracks and hatches once, then the wren stays
(() => {
  const stage = document.querySelector(".stage");
  if (!stage) return;
  const add = (...names) => stage.classList.add(...names);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    add("arrive", "hatch", "gone");
    return;
  }
  const at = (ms, fn) => setTimeout(fn, ms);
  at(300, () => add("arrive"));
  at(1200, () => add("wobble"));
  at(3000, () => add("crack1"));
  at(4000, () => add("crack2"));
  at(5000, () => { add("hatch"); stage.classList.remove("wobble"); });
  at(6100, () => add("hop"));
  at(7600, () => add("gone"));
})();
