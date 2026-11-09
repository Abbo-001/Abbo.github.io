/* =========================================================
   Abdulkadir Abbo — Portfolio interactions (v2)
   GSAP + ScrollTrigger · Lenis · SplitType · Three.js · Splide
   Every feature degrades gracefully if a library fails to load.
   ========================================================= */
(function () {
  "use strict";

  const root = document.documentElement;
  const hasGSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  const hasLenis = typeof window.Lenis !== "undefined";
  const hasSplit = typeof window.SplitType !== "undefined";
  const hasThree = typeof window.THREE !== "undefined";
  const hasSplide = typeof window.Splide !== "undefined";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const cssVar = (name) => getComputedStyle(root).getPropertyValue(name).trim();

  if (hasGSAP) {
    root.classList.add("has-gsap");
    gsap.registerPlugin(ScrollTrigger);
  }

  /* ---------------------------------------------------------
     Marquee: duplicate content for a seamless loop
     --------------------------------------------------------- */
  const marquee = $("#marqueeTrack");
  marquee.innerHTML += marquee.innerHTML;

  /* ---------------------------------------------------------
     Lenis smooth scroll
     --------------------------------------------------------- */
  let lenis = null;
  if (hasLenis && !reduceMotion) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
    if (hasGSAP) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  // Anchor links go through Lenis (with header offset)
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const target = id === "#top" ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(target, { offset: id === "#top" ? 0 : -80, duration: 1.4 });
      } else {
        const top = id === "#top" ? 0 : target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
      }
    });
  });

  /* ---------------------------------------------------------
     Header: solid background after scroll, hide on scroll down
     --------------------------------------------------------- */
  const topbar = $("#topbar");
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    topbar.classList.toggle("is-scrolled", y > 20);
    const menuOpen = $("#nav").classList.contains("open");
    topbar.classList.toggle("is-hidden", y > lastY && y > 400 && !menuOpen);
    lastY = y;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------------
     Mobile menu
     --------------------------------------------------------- */
  const menuBtn = $("#menuBtn");
  const nav = $("#nav");
  const setMenu = (open) => {
    nav.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  menuBtn.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
  $$("a", nav).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  /* ---------------------------------------------------------
     Local time in Douala + footer year
     --------------------------------------------------------- */
  const timeEl = $("#localTime");
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Douala", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const tick = () => { timeEl.textContent = fmt.format(new Date()); };
  tick(); setInterval(tick, 1000);
  $("#year").textContent = new Date().getFullYear();

  /* ---------------------------------------------------------
     Three.js — interactive network globe in the hero
     --------------------------------------------------------- */
  const globe = hasThree ? createGlobe($("#heroCanvas")) : null;

  function createGlobe(canvas) {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (e) { return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 7);

    const group = new THREE.Group();
    scene.add(group);

    // Nodes on a Fibonacci sphere
    const R = 2;
    const COUNT = 1100;
    const pos = new Float32Array(COUNT * 3);
    const nodes = [];
    for (let i = 0; i < COUNT; i++) {
      const y = 1 - (i / (COUNT - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = Math.PI * (3 - Math.sqrt(5)) * i;
      const v = new THREE.Vector3(Math.cos(th) * r * R, y * R, Math.sin(th) * r * R);
      pos.set([v.x, v.y, v.z], i * 3);
      nodes.push(v);
    }
    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pointsMat = new THREE.PointsMaterial({ size: 0.022, transparent: true, opacity: 0.75, depthWrite: false });
    group.add(new THREE.Points(pointsGeo, pointsMat));

    // "Network links" between a subset of hub nodes
    const hubs = nodes.filter((_, i) => i % 7 === 0);
    const linkPos = [];
    for (let i = 0; i < hubs.length; i++) {
      for (let j = i + 1; j < hubs.length; j++) {
        if (hubs[i].distanceTo(hubs[j]) < 0.62) linkPos.push(hubs[i].x, hubs[i].y, hubs[i].z, hubs[j].x, hubs[j].y, hubs[j].z);
      }
    }
    const linkGeo = new THREE.BufferGeometry();
    linkGeo.setAttribute("position", new THREE.Float32BufferAttribute(linkPos, 3));
    const linkMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.22, depthWrite: false });
    group.add(new THREE.LineSegments(linkGeo, linkMat));

    // Orbit rings
    const ringMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.18 });
    const makeRing = (radius, tiltX, tiltZ) => {
      const pts = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
      }
      const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), ringMat);
      ring.rotation.set(tiltX, 0, tiltZ);
      return ring;
    };
    const rings = new THREE.Group();
    rings.add(makeRing(2.7, 1.2, 0.3), makeRing(3.1, 1.45, -0.5));
    group.add(rings);

    // Satellites ("packets") travelling on the rings
    const satGeo = new THREE.SphereGeometry(0.045, 12, 12);
    const satMat = new THREE.MeshBasicMaterial();
    const sats = [
      { mesh: new THREE.Mesh(satGeo, satMat), ring: rings.children[0], r: 2.7, speed: 0.5, off: 0 },
      { mesh: new THREE.Mesh(satGeo, satMat), ring: rings.children[1], r: 3.1, speed: -0.35, off: 2 },
      { mesh: new THREE.Mesh(satGeo, satMat), ring: rings.children[0], r: 2.7, speed: 0.5, off: Math.PI },
    ];
    sats.forEach((s) => s.ring.add(s.mesh));

    // Ambient dust
    const DUST = 260;
    const dustPos = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) dustPos.set([(Math.random() - 0.5) * 16, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 8 - 2], i * 3);
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({ size: 0.018, transparent: true, opacity: 0.4, depthWrite: false });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    const applyTheme = () => {
      const dark = root.getAttribute("data-theme") !== "light";
      const a1 = new THREE.Color(cssVar("--accent") || "#6ee7c8");
      const a2 = new THREE.Color(cssVar("--accent-2") || "#7c9cff");
      const ink = new THREE.Color(cssVar("--ink") || "#ffffff");
      pointsMat.color = a1;
      linkMat.color = a2;
      ringMat.color = ink;
      satMat.color = a1;
      dustMat.color = ink;
      const blend = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
      [pointsMat, linkMat, dustMat].forEach((m) => { m.blending = blend; m.needsUpdate = true; });
      pointsMat.opacity = dark ? 0.75 : 0.9;
      linkMat.opacity = dark ? 0.22 : 0.3;
      ringMat.opacity = dark ? 0.16 : 0.22;
      dustMat.opacity = dark ? 0.4 : 0.25;
    };
    applyTheme();

    const state = { mx: 0, my: 0, tx: 0, ty: 0, scroll: 0, intro: hasGSAP && !reduceMotion ? 0 : 1 };
    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const wide = w / h > 1.1;
      group.position.x = wide ? Math.min(2.6, (w / h) * 1.15) : 0;
      group.position.y = wide ? 0.25 : 1.1;
      const s = wide ? 1 : 0.78;
      group.scale.setScalar(s);
    };
    resize();
    window.addEventListener("resize", resize);

    window.addEventListener("pointermove", (e) => {
      state.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      state.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    let visible = true;
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(canvas);

    const clock = new THREE.Clock();
    const render = () => {
      const t = clock.getElapsedTime();
      state.mx += (state.tx - state.mx) * 0.05;
      state.my += (state.ty - state.my) * 0.05;
      group.rotation.y = t * 0.08 + state.mx * 0.35 + state.scroll * 1.6;
      group.rotation.x = 0.25 + state.my * 0.2 + state.scroll * 0.3;
      rings.rotation.y = -t * 0.05;
      sats.forEach((s) => {
        const a = t * s.speed + s.off;
        s.mesh.position.set(Math.cos(a) * s.r, 0, Math.sin(a) * s.r);
      });
      dust.rotation.y = t * 0.01 + state.mx * 0.05;
      const k = state.intro;
      camera.position.z = 7 + (1 - k) * 4 + state.scroll * 2;
      canvas.style.opacity = String(k * (1 - state.scroll * 0.9));
      renderer.render(scene, camera);
    };

    const loop = () => {
      if (visible) render();
      requestAnimationFrame(loop);
    };
    if (reduceMotion) render(); else requestAnimationFrame(loop);

    return { state, applyTheme, render };
  }

  /* ---------------------------------------------------------
     Theme toggle
     --------------------------------------------------------- */
  $("#themeToggle").addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    store.set("theme", next);
    if (globe) { globe.applyTheme(); if (reduceMotion) globe.render(); }
  });

  /* ---------------------------------------------------------
     Experience tabs (with sliding indicator)
     --------------------------------------------------------- */
  const tabs = $$('.timeline__tabs [role="tab"]');
  const indicator = $("#tabIndicator");
  const moveIndicator = (tab) => {
    const horizontal = window.matchMedia("(max-width: 860px)").matches;
    if (horizontal) {
      indicator.style.transform = `translateX(${tab.offsetLeft}px)`;
      indicator.style.width = tab.offsetWidth + "px";
      indicator.style.height = "";
    } else {
      indicator.style.transform = `translateY(${tab.offsetTop}px)`;
      indicator.style.height = tab.offsetHeight + "px";
      indicator.style.width = "";
    }
  };
  const selectTab = (tab) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls"));
      panel.hidden = !on;
      if (on && hasGSAP && !reduceMotion) {
        gsap.fromTo(panel.children, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, stagger: 0.06, ease: "power3.out" });
      }
    });
    moveIndicator(tab);
  };
  tabs.forEach((tab, i) => {
    tab.tabIndex = i === 0 ? 0 : -1;
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", (e) => {
      const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      const next = tabs[(i + keys[e.key] + tabs.length) % tabs.length];
      next.focus();
      selectTab(next);
    });
  });
  moveIndicator(tabs[0]);
  window.addEventListener("resize", () => moveIndicator(tabs.find((t) => t.getAttribute("aria-selected") === "true")));

  /* ---------------------------------------------------------
     Splide — projects carousel
     --------------------------------------------------------- */
  if (hasSplide) {
    const splide = new Splide("#workSlider", {
      perPage: 3,
      perMove: 1,
      gap: "20px",
      arrows: false,
      pagination: false,
      drag: true,
      snap: true,
      speed: 800,
      easing: "cubic-bezier(.2,.8,.2,1)",
      breakpoints: {
        1100: { perPage: 2 },
        680: { perPage: 1, padding: { right: "14%" }, gap: "14px" },
      },
    });
    const count = $("#workCount");
    const bar = $("#workProgress");
    const update = () => {
      const end = splide.Components.Controller.getEnd() + 1;
      const idx = Math.min(splide.index + 1, end);
      count.textContent = String(idx).padStart(2, "0") + " / " + String(end).padStart(2, "0");
      bar.style.width = (idx / end) * 100 + "%";
    };
    splide.on("mounted move resized", update);
    splide.mount();
    $("#workPrev").addEventListener("click", () => splide.go("<"));
    $("#workNext").addEventListener("click", () => splide.go(">"));
  } else {
    $(".work__nav").style.display = "none";
  }

  /* ---------------------------------------------------------
     Deploy pipeline demo
     --------------------------------------------------------- */
  const steps = $$("#pipelineDemo [data-step]");
  const log = $("#pipeLog");
  const status = $("#pipeStatus");
  const lines = [
    ["$ git push origin main", "→ triggered pipeline #142"],
    ["$ docker build -t site:a3f9c1e .", "✓ image built (38s)"],
    ["$ npm run lint && ./healthcheck.sh", "✓ all checks passed (21s)"],
    ["$ ansible-playbook deploy.yml --limit production", "✓ rolling update, 0 downtime"],
    ["$ curl -sI https://client-site.com", "✓ HTTP/2 200 · TLS valid · alerting on"],
  ];
  let timers = [];
  const runPipeline = () => {
    timers.forEach(clearTimeout); timers = [];
    log.innerHTML = "";
    status.textContent = "running"; status.classList.remove("ok");
    steps.forEach((s) => s.classList.remove("active", "done"));
    steps.forEach((step, i) => {
      timers.push(setTimeout(() => {
        if (i > 0) { steps[i - 1].classList.remove("active"); steps[i - 1].classList.add("done"); }
        step.classList.add("active");
        log.insertAdjacentText("beforeend", lines[i][0] + "\n");
      }, i * 1200));
      timers.push(setTimeout(() => {
        const ok = document.createElement("span");
        ok.className = "ok"; ok.textContent = "  " + lines[i][1] + "\n";
        log.appendChild(ok);
        if (i === steps.length - 1) {
          step.classList.remove("active"); step.classList.add("done");
          status.textContent = "deployed ✓"; status.classList.add("ok");
        }
      }, i * 1200 + 750));
    });
  };
  $("#pipeReplay").addEventListener("click", runPipeline);
  if (!hasGSAP) runPipeline();

  /* ---------------------------------------------------------
     Without GSAP: stop here (content is fully visible)
     --------------------------------------------------------- */
  const loader = $("#loader");
  if (!hasGSAP) {
    loader.remove();
    $$("[data-count]").forEach((el) => { el.textContent = el.dataset.count; });
    return;
  }

  /* ---------------------------------------------------------
     GSAP — custom cursor & magnetic buttons
     --------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    const cursor = $("#cursor");
    const label = $("#cursorLabel");
    const xTo = gsap.quickTo(cursor, "x", { duration: 0.35, ease: "power3" });
    const yTo = gsap.quickTo(cursor, "y", { duration: 0.35, ease: "power3" });
    window.addEventListener("pointermove", (e) => { xTo(e.clientX); yTo(e.clientY); }, { passive: true });

    document.addEventListener("pointerover", (e) => {
      const withLabel = e.target.closest("[data-cursor]");
      const interactive = e.target.closest("a, button, [role='tab']");
      if (withLabel) { label.textContent = withLabel.dataset.cursor; cursor.classList.add("is-label"); cursor.classList.remove("is-hover"); }
      else if (interactive) { cursor.classList.add("is-hover"); cursor.classList.remove("is-label"); }
      else cursor.classList.remove("is-hover", "is-label");
    });
    document.addEventListener("pointerleave", () => gsap.to(cursor, { opacity: 0, duration: 0.2 }));
    document.addEventListener("pointerenter", () => gsap.to(cursor, { opacity: 1, duration: 0.2 }));

    $$(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.4, duration: 0.4, ease: "power3.out" });
      });
      el.addEventListener("pointerleave", () => gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.4)" }));
    });

    // 3D tilt + spotlight on service cards
    $$("[data-tilt]").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", px * 100 + "%");
        card.style.setProperty("--my", py * 100 + "%");
        gsap.to(card, { rotateY: (px - 0.5) * 8, rotateX: (0.5 - py) * 8, transformPerspective: 900, duration: 0.5, ease: "power2.out" });
      });
      card.addEventListener("pointerleave", () => gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.8, ease: "power3.out" }));
    });
  }

  /* ---------------------------------------------------------
     GSAP — marquee driven by scroll velocity
     --------------------------------------------------------- */
  const marqueeTween = gsap.to(marquee, { xPercent: -50, duration: reduceMotion ? 0 : 36, ease: "none", repeat: -1 });
  if (reduceMotion) marqueeTween.pause(0);
  else {
    ScrollTrigger.create({
      onUpdate(self) {
        const v = gsap.utils.clamp(-6, 6, self.getVelocity() / 300);
        gsap.to(marqueeTween, { timeScale: 1 + Math.abs(v), duration: 0.2, overwrite: true });
        gsap.to(marqueeTween, { timeScale: 1, duration: 1.2, delay: 0.2, ease: "power2.out" });
      },
    });
  }

  if (reduceMotion) {
    loader.remove();
    $$("[data-count]").forEach((el) => { el.textContent = el.dataset.count; });
    ScrollTrigger.create({ trigger: "#pipelineDemo", start: "top 80%", once: true, onEnter: runPipeline });
    return;
  }

  /* ---------------------------------------------------------
     Preloader → hero intro
     --------------------------------------------------------- */
  if (lenis) lenis.stop();
  const fontsReady = Promise.race([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
  const counter = { v: 0 };
  const loaderDone = new Promise((resolve) => {
    gsap.timeline({ onComplete: resolve })
      .to(counter, { v: 100, duration: 1.5, ease: "power2.inOut", onUpdate: () => { $("#loaderCount").textContent = Math.round(counter.v); } }, 0)
      .to("#loaderBar", { width: "100%", duration: 1.5, ease: "power2.inOut" }, 0);
  });

  Promise.all([fontsReady, loaderDone]).then(() => {
    const splits = setupTextSplits();
    const heroWords = splits.hero ? splits.hero.words : [$("#heroTitle")];

    gsap.set(heroWords, { yPercent: 115 });
    gsap.set("[data-hero]", { y: 30, opacity: 0 });

    gsap.timeline({
      onComplete() {
        if (lenis) lenis.start();
        ScrollTrigger.refresh();
      },
    })
      .to(loader, { yPercent: -100, duration: 1, ease: "expo.inOut" })
      .add(() => loader.remove())
      .to(heroWords, { yPercent: 0, duration: 1.1, stagger: 0.045, ease: "expo.out" }, "-=0.35")
      .to(globe ? globe.state : {}, { intro: 1, duration: 2.2, ease: "expo.out" }, "<")
      .to("[data-hero]", { y: 0, opacity: 1, duration: 0.9, stagger: 0.1, ease: "power3.out" }, "-=0.9")
      .add(countUp, "-=0.6");

    setupScrollAnimations();
  });

  function countUp() {
    $$("[data-count]").forEach((el) => {
      const o = { v: 0 };
      gsap.to(o, { v: +el.dataset.count, duration: 1.6, ease: "power3.out", onUpdate: () => { el.textContent = Math.round(o.v); } });
    });
  }

  /* ---------------------------------------------------------
     SplitType — split headings into lines / words
     --------------------------------------------------------- */
  function setupTextSplits() {
    const out = { hero: null, headings: [] };
    if (!hasSplit) return out;
    out.hero = new SplitType("#heroTitle", { types: "lines,words" });
    $$(".split").forEach((el) => {
      out.headings.push({ el, split: new SplitType(el, { types: "lines,words" }) });
    });

    // Re-split on width change so line breaks stay correct
    let w = window.innerWidth, to;
    window.addEventListener("resize", () => {
      if (window.innerWidth === w) return;
      w = window.innerWidth;
      clearTimeout(to);
      to = setTimeout(() => {
        out.hero.split();
        out.headings.forEach((h) => { h.split.split(); gsap.set(h.split.words, { yPercent: 0 }); });
        ScrollTrigger.refresh();
      }, 200);
    });
    return out;
  }

  /* ---------------------------------------------------------
     ScrollTrigger animations
     --------------------------------------------------------- */
  function setupScrollAnimations() {
    // Heading word reveals
    $$(".split").forEach((el) => {
      const words = $$(".word", el);
      if (!words.length) return;
      gsap.fromTo(words, { yPercent: 115 }, {
        yPercent: 0, duration: 1, stagger: 0.04, ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    });

    // Kickers
    gsap.utils.toArray(".kicker").forEach((k) => {
      gsap.from(k, { opacity: 0, x: -20, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: k, start: "top 90%", once: true } });
    });

    // Fade-up batches
    const batchTargets = ".fade-up, .service, .stack__group, .edu__item, #workSlider .splide__slide";
    gsap.set(batchTargets, { y: 50, opacity: 0 });
    ScrollTrigger.batch(batchTargets, {
      start: "top 90%",
      once: true,
      onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, duration: 1, stagger: 0.08, ease: "power3.out", overwrite: true }),
    });

    // Hero scroll-out: globe zooms/fades, title drifts
    ScrollTrigger.create({
      trigger: "#hero", start: "top top", end: "bottom top", scrub: true,
      onUpdate(self) { if (globe) globe.state.scroll = self.progress; },
    });
    gsap.to(".hero__content", { yPercent: -12, ease: "none", scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true } });

    // Pipeline demo starts when visible
    ScrollTrigger.create({ trigger: "#pipelineDemo", start: "top 75%", once: true, onEnter: runPipeline });

    // Principles: pinned horizontal scroll on desktop
    const mm = gsap.matchMedia();
    mm.add("(min-width: 900px)", () => {
      const pin = $(".principles-pin");
      const track = $("#principlesTrack");
      pin.classList.add("is-pinned");
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const tween = gsap.to(track, {
        x: () => -distance(), ease: "none",
        scrollTrigger: { trigger: pin, start: "top top+=40", end: () => "+=" + distance(), pin: true, scrub: 1, invalidateOnRefresh: true },
      });
      gsap.utils.toArray(".principle").forEach((card) => {
        gsap.from(card.querySelector(".principle__num"), {
          yPercent: 60, opacity: 0, ease: "power2.out",
          scrollTrigger: { trigger: card, containerAnimation: tween, start: "left 95%", end: "left 60%", scrub: true },
        });
      });
      return () => pin.classList.remove("is-pinned");
    });

    // Subtle parallax on project covers
    gsap.utils.toArray(".project__cover svg").forEach((svg) => {
      gsap.fromTo(svg, { yPercent: 8 }, { yPercent: -8, ease: "none", scrollTrigger: { trigger: svg, start: "top bottom", end: "bottom top", scrub: true } });
    });

    // Contact glow follows scroll
    gsap.fromTo(".contact__glow", { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, ease: "none", scrollTrigger: { trigger: "#contact", start: "top bottom", end: "center center", scrub: true } });

    ScrollTrigger.refresh();
  }
})();
