/* Cours 5 — Photomontage : interactions */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- intro ---------- */

  const intro = $("#intro");
  const body = document.body;
  let sweepAll = null;

  const endIntro = () => {
    if (!intro || intro.classList.contains("gone")) return;
    intro.classList.add("gone");
    body.classList.remove("locked");
    window.setTimeout(() => intro.setAttribute("aria-hidden", "true"), 950);

    // un lien direct vers une section doit fonctionner malgr l'intro
    window.setTimeout(() => {
      if (sweepAll) sweepAll();
      if (window.location.hash) {
        const target = document.querySelector(window.location.hash);
        if (target) target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      }
    }, 60);
  };

  if (intro) {
    if (reduce) {
      intro.remove();
      body.classList.remove("locked");
      if (window.location.hash) {
        const t = document.querySelector(window.location.hash);
        if (t) t.scrollIntoView();
      }
    } else {
      window.setTimeout(endIntro, 1400);
      intro.addEventListener("click", endIntro);
      window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") endIntro();
      });
    }
  } else {
    body.classList.remove("locked");
  }

  /* ---------- apparition au scroll ---------- */

  const targets = $$(
    "section h2, section h3, section p, section figure, section .note, " +
    "section .card-scrap, section .polaroids"
  );
  const groups = new Map();

  targets.forEach((el) => {
    const parent = el.parentElement;
    const n = groups.get(parent) || 0;
    groups.set(parent, n + 1);
    el.classList.add("reveal");
    el.style.setProperty("--d", Math.min(n * 80, 320) + "ms");
  });

  const reveals = targets;

  if (reduce) {
    reveals.forEach((el) => el.classList.add("in"));
  } else {
    const shown = new Set();

    const show = (el) => {
      if (shown.has(el)) return;
      shown.add(el);
      el.classList.add("in");
    };

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) show(e.target);
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
      );
      reveals.forEach((el) => io.observe(el));
    }

    // filet de sécurité : si l'observateur ne se déclenche pas, on révèle au défilement
    let ticking = false;
    const sweep = () => {
      ticking = false;
      const h = window.innerHeight;
      reveals.forEach((el) => {
        if (shown.has(el)) return;
        const r = el.getBoundingClientRect();
        if (r.top < h * 0.94 && r.bottom > 0) show(el);
      });
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.setTimeout(sweep, 90);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.setTimeout(sweep, 900);
    sweepAll = sweep;
  }

  /* ---------- figure interactive : les ombres ---------- */

  const scene = $("#scene");
  if (scene) {
    const sun = $("#sun");
    const glow = $("#sun-glow");
    const shadow = $("#shadow");
    const contact = $("#contact");
    const blur = $("#blur5");
    const rays = $$("#rays line");
    const label = $("#sun-label");
    const input = $("#src-x");
    const out = $("#src-out");
    const tabButtons = $$("[data-light]");

    const CX = 350;
    const CY = 222;
    const FLOOR = 290;
    const SUN_Y = 72;

    let mode = "directe";

    const presets = {
      directe: { blur: 1.5, shadow: 0.34, contact: 0.5 },
      diffuse: { blur: 9, shadow: 0.2, contact: 0.3 },
      indirecte: { blur: 15, shadow: 0.11, contact: 0.18 },
    };

    const fmt = (lx) => {
      if (lx < 300) return "à gauche";
      if (lx > 400) return "à droite";
      return "presque face";
    };

    const draw = () => {
      const lx = Number(input.value);
      const p = presets[mode];

      sun.setAttribute("cx", lx);
      sun.setAttribute("cy", SUN_Y);
      glow.setAttribute("cx", lx);
      glow.setAttribute("cy", SUN_Y);

      const dx = CX - lx;
      const dy = CY - SUN_Y;
      const s = (FLOOR - CY) / dy;
      let sx = CX + dx * s;
      sx = Math.max(60, Math.min(720, sx));

      const rx = Math.min(190, 80 + Math.abs(dx) * 0.32);
      const ry = 14 + rx * 0.12;

      shadow.setAttribute("cx", sx);
      shadow.setAttribute("rx", rx);
      shadow.setAttribute("ry", ry);
      shadow.setAttribute("opacity", p.shadow);

      contact.setAttribute("cx", CX + (sx - CX) * 0.12);
      contact.setAttribute("opacity", p.contact);

      blur.setAttribute("stdDeviation", p.blur);

      rays.forEach((line, i) => {
        line.setAttribute("x1", lx);
        line.setAttribute("y1", SUN_Y + 8);
        if (i === 2) {
          line.setAttribute("x2", sx);
          line.setAttribute("y2", FLOOR);
        }
      });

      const right = lx > 520;
      label.setAttribute("x", right ? lx - 46 : lx + 46);
      label.setAttribute("text-anchor", right ? "end" : "start");

      out.textContent = fmt(lx);
    };

    const setMode = (name) => {
      mode = name;
      tabButtons.forEach((b) =>
        b.setAttribute("aria-selected", String(b.dataset.light === name))
      );
      $$(".tab-panel").forEach((panel) => {
        panel.hidden = panel.id !== "panel-" + name;
      });
      draw();
    };

    input.addEventListener("input", draw);
    tabButtons.forEach((b) =>
      b.addEventListener("click", () => setMode(b.dataset.light))
    );

    draw();
  }

  /* ---------- lightbox ---------- */

  const box = $("#lightbox");
  const boxImg = $("#lightbox-img");
  const close = $("#lightbox-close");

  if (box && boxImg) {
    const open = (img) => {
      boxImg.src = img.currentSrc || img.src;
      boxImg.alt = img.alt || "";
      box.classList.add("open");
      body.classList.add("locked");
    };
    const shut = () => {
      box.classList.remove("open");
      body.classList.remove("locked");
      boxImg.src = "";
    };

    $$("[data-zoom]").forEach((img) =>
      img.addEventListener("click", () => open(img))
    );
    if (close) close.addEventListener("click", shut);
    box.addEventListener("click", (e) => {
      if (e.target === box) shut();
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && box.classList.contains("open")) shut();
    });
  }
})();
