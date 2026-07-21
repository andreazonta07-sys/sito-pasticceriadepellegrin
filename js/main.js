/* Pasticceria De Pellegrin — interazioni (Lenis + GSAP/ScrollTrigger) */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hasGsap = !!window.gsap;
  if (hasGsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------------- Header ---------------- */
  var header = document.querySelector(".site-header");
  function onScrollHeader() {
    header.classList.toggle("scrolled", window.scrollY > 40);
  }
  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  var toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open);
    });
    document.querySelectorAll(".site-nav a").forEach(function (a) {
      a.addEventListener("click", function () { document.body.classList.remove("nav-open"); });
    });
  }

  /* ---------------- Lenis smooth scroll ---------------- */
  var lenis = null;
  if (window.Lenis && !reduceMotion) {
    lenis = new Lenis({
      duration: 1.1,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true
    });
    lenis.on("scroll", function () { if (hasGsap && window.ScrollTrigger) ScrollTrigger.update(); });
    if (hasGsap) {
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
    lenis.stop();
    window.addEventListener("depLoaderDone", function () { lenis.start(); }, { once: true });
  }
  window.__lenis = lenis;

  /* ancore interne fluide */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -76 });
      else target.scrollIntoView({ behavior: "smooth" });
    });
  });


  /* ---------------- Cursore custom beige ---------------- */
  var ring = null;
  if (finePointer && !reduceMotion) {
    document.body.classList.add("has-cursor");
    var dot = document.createElement("div");
    ring = document.createElement("div");
    dot.className = "cursor-dot";
    ring.className = "cursor-ring";
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    window.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = "translate(" + mx + "px," + my + "px) translate(-50%,-50%)";
    }, { passive: true });

    (function loop() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = "translate(" + rx + "px," + ry + "px) translate(-50%,-50%)";
      requestAnimationFrame(loop);
    })();

    document.querySelectorAll("a, button, .chip, input, textarea").forEach(function (el) {
      el.addEventListener("mouseenter", function () { ring.classList.add("is-active"); });
      el.addEventListener("mouseleave", function () { ring.classList.remove("is-active"); });
    });
  }

  /* ---------------- Entrata hero (dopo il loader) ---------------- */
  function heroEntrance() {
    var els = document.querySelectorAll("[data-hero-reveal]");
    if (!hasGsap || reduceMotion) {
      els.forEach(function (el) { el.style.opacity = 1; });
      return;
    }
    gsap.set(els, { opacity: 0, y: 60 });
    gsap.to(els, {
      opacity: 1, y: 0,
      duration: 1.1, ease: "power3.out", stagger: 0.09, delay: 0.15
    });
  }
  if (document.documentElement.classList.contains("loader-done")) heroEntrance();
  else window.addEventListener("depLoaderDone", heroEntrance, { once: true });

  /* ---------------- Reveal allo scroll ---------------- */
  if (hasGsap && window.ScrollTrigger && !reduceMotion) {
    gsap.utils.toArray("[data-reveal]").forEach(function (el) {
      if (el.classList.contains("polaroid")) return; /* hanno l'entrata a ventaglio */
      gsap.fromTo(el,
        { opacity: 0, y: 42 },
        {
          opacity: 1, y: 0, duration: 1.1, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 86%", once: true }
        });
    });
    gsap.utils.toArray("[data-reveal-group]").forEach(function (group) {
      gsap.fromTo(group.children,
        { opacity: 0, y: 36 },
        {
          opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.12,
          scrollTrigger: { trigger: group, start: "top 84%", once: true }
        });
    });

    /* polaroid festa della mamma: mazzo chiuso che si apre a ventaglio allo
       scroll (stessa meccanica della sezione "la importancia del pimiento"
       di donmolinico.es: le carte partono impilate/ruotate sopra il centro
       e si aprono via trasformazioni, senza dissolvenza) */
    (function fanDeck() {
      var deck = document.querySelector(".mamma-cards");
      var left = document.querySelector(".fan-left");
      var center = document.querySelector(".polaroid-center");
      var right = document.querySelector(".fan-right");
      if (!deck || !left || !center || !right) return;

      var cards = [left, center, right];
      /* [data-reveal] parte da opacity:0 via CSS (fallback no-JS) e il loop
         generico qui sopra salta le .polaroid apposta: va riportata a 1 qui. */
      gsap.set(cards, { opacity: 1 });
      /* .polaroid ha "transition: transform .45s" per l'hover: se resta
         attiva, ogni gsap.set() sul transform viene animata dal browser
         invece di scattare all'istante, e la rimisurazione successiva
         legge ancora la posizione di partenza. La disattiviamo finché
         il mazzo non si è aperto, poi la ripristiniamo per l'hover. */
      gsap.set(cards, { transition: "none" });

      var closedRot = { left: 16, center: -22, right: -16 };
      var openRot = { left: -7, center: 2.5, right: 7 };
      var opened = false;

      function measureAndClose() {
        if (opened) return;
        gsap.set(cards, { clearProps: "transform" });
        var cRect = center.getBoundingClientRect();
        var lRect = left.getBoundingClientRect();
        var rRect = right.getBoundingClientRect();
        var cx = cRect.left + cRect.width / 2, cy = cRect.top + cRect.height / 2;
        var dxLeft = cx - (lRect.left + lRect.width / 2);
        var dyLeft = cy - (lRect.top + lRect.height / 2);
        var dxRight = cx - (rRect.left + rRect.width / 2);
        var dyRight = cy - (rRect.top + rRect.height / 2);

        gsap.set(left, { x: dxLeft, y: dyLeft, rotation: closedRot.left, zIndex: 1 });
        gsap.set(center, { rotation: closedRot.center, zIndex: 2 });
        gsap.set(right, { x: dxRight, y: dyRight, rotation: closedRot.right, zIndex: 3 });
      }

      measureAndClose();
      window.addEventListener("depLoaderDone", measureAndClose, { once: true });
      var resizeTimer;
      window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(measureAndClose, 150);
      });

      ScrollTrigger.create({
        trigger: deck, start: "top 82%", once: true,
        onEnter: function () {
          opened = true;
          gsap.to(left, { x: 0, y: 0, rotation: openRot.left, duration: 1.8, ease: "expo.out" });
          gsap.to(center, { rotation: openRot.center, duration: 1.8, ease: "expo.out", delay: 0.04 });
          gsap.to(right, {
            x: 0, y: 0, rotation: openRot.right, duration: 1.8, ease: "expo.out", delay: 0.08,
            onComplete: function () { gsap.set(cards, { clearProps: "transition" }); }
          });
        }
      });
    })();

    /* parallax briciole + deriva col cursore nella hero */
    gsap.utils.toArray(".crumbs").forEach(function (el) {
      gsap.to(el, {
        yPercent: 16, rotation: "+=4", ease: "none",
        scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true }
      });
    });
    if (finePointer) {
      var crumbsHero = document.querySelector(".crumbs-hero");
      if (crumbsHero) {
        var qx = gsap.quickTo(crumbsHero, "x", { duration: 1.2, ease: "power3.out" });
        var qy = gsap.quickTo(crumbsHero, "y", { duration: 1.2, ease: "power3.out" });
        window.addEventListener("mousemove", function (e) {
          qx((e.clientX / innerWidth - 0.5) * -26);
          qy((e.clientY / innerHeight - 0.5) * -18);
        }, { passive: true });
      }
    }

    /* la fila del video resta invisibile finché non si scrolla, poi
       appare progressivamente dal basso (come il primo blocco del Room) */
    var mediaEls = gsap.utils.toArray("[data-media-reveal]");
    if (mediaEls.length) {
      gsap.fromTo(mediaEls,
        { opacity: 0, y: 70 },
        {
          opacity: 1, y: 0, ease: "none", stagger: 0.08,
          scrollTrigger: { trigger: ".hero", start: "top top", end: "+=460", scrub: true }
        });
    }

    /* freccia che si disegna allo scroll */
    var arrowPaths = document.querySelectorAll("#arrow-path, #arrow-head");
    arrowPaths.forEach(function (p) {
      var len = p.getTotalLength();
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
    });
    gsap.to("#arrow-path", {
      strokeDashoffset: 0, ease: "none",
      scrollTrigger: { trigger: ".arrow-wrap", start: "top 88%", end: "top 42%", scrub: true }
    });
    gsap.to("#arrow-head", {
      strokeDashoffset: 0, ease: "none",
      scrollTrigger: { trigger: ".arrow-wrap", start: "top 50%", end: "top 34%", scrub: true }
    });
  } else {
    document.querySelectorAll("[data-reveal], [data-reveal-group] > *, [data-media-reveal]").forEach(function (el) {
      el.style.opacity = 1;
    });
  }

  /* ---------------- Audio del video hero ---------------- */
  (function initAudioToggle() {
    var video = document.getElementById("hero-video");
    var btn = document.getElementById("audio-toggle");
    if (!video || !btn) return;
    btn.addEventListener("click", function () {
      video.muted = !video.muted;
      if (!video.muted) {
        video.volume = 1;
        if (video.paused) video.play();
      }
      btn.classList.toggle("is-on", !video.muted);
      btn.setAttribute("aria-pressed", String(!video.muted));
      btn.setAttribute("aria-label", video.muted ? "Attiva l'audio del video" : "Disattiva l'audio del video");
    });
  })();

  /* ---------------- Scrub text (filosofia ingredienti) ---------------- */
  (function initScrubText() {
    var el = document.querySelector("[data-scrub-text]");
    if (!el) return;
    if (reduceMotion || !hasGsap || !window.ScrollTrigger) return;
    var text = el.textContent.replace(/\s+/g, " ").trim();
    el.textContent = "";
    var frag = document.createDocumentFragment();
    var words = [];
    text.split(" ").forEach(function (w, i) {
      if (i) frag.appendChild(document.createTextNode(" "));
      var span = document.createElement("span");
      span.textContent = w;
      span.style.opacity = "0.16";
      frag.appendChild(span);
      words.push(span);
    });
    el.appendChild(frag);
    gsap.to(words, {
      opacity: 1, duration: 1, stagger: 0.05, ease: "none",
      scrollTrigger: { trigger: el, start: "top 68%", end: "bottom 42%", scrub: true }
    });
  })();

  /* ---------------- Marquee continui (hero + banner CTA) ---------------- */
  function ensureTrackWidth(track) {
    var minWidth = Math.max(window.innerWidth, 1600) * 2;
    var guard = 0;
    while (track.scrollWidth < minWidth && guard < 5) {
      track.innerHTML += track.innerHTML;
      guard++;
    }
  }

  function runMarquee(track, opts) {
    ensureTrackWidth(track);
    var half = 0;
    function measure() { half = track.scrollWidth / 2; }
    measure();
    window.addEventListener("resize", measure);
    var pos = 0;
    var dir = opts.dir || -1;
    var idleSpeed = reduceMotion ? 0 : (opts.speed || 40);
    var scrollFactor = opts.scrollFactor || 0;
    var lastScrollY = window.scrollY;
    function tick(t, dt) {
      if (!half) measure();
      pos += dir * idleSpeed * (dt / 1000);
      if (scrollFactor) {
        var sy = window.scrollY, dy = sy - lastScrollY;
        if (dy) { pos += dir * Math.abs(dy) * scrollFactor * 4; lastScrollY = sy; }
      }
      pos = ((pos % half) + half) % half - half;
      track.style.transform = "translate3d(" + pos + "px,0,0)";
    }
    if (hasGsap) { gsap.ticker.add(function (time, dt) { tick(time, dt); }); }
    else { var last = performance.now(); (function loop(now) { tick(now, now - last); last = now; requestAnimationFrame(loop); })(last); }
  }

  document.querySelectorAll(".hero-marquee-track").forEach(function (track, i) {
    runMarquee(track, { dir: i % 2 ? 1 : -1, speed: 32, scrollFactor: 0.054 });
  });
  document.querySelectorAll(".cta-row").forEach(function (row) {
    var track = row.querySelector(".cta-track");
    if (!track) return;
    runMarquee(track, {
      dir: row.dataset.dir === "right" ? 1 : -1,
      speed: parseFloat(row.dataset.speed) || 40,
      scrollFactor: 0.036
    });
  });

  /* ---------------- Caroselli trascinabili (ingredienti + staff) ---------------- */
  document.querySelectorAll(".marquee").forEach(function (marquee) {
    var track = marquee.querySelector(".marquee-track");
    if (!track) return;
    track.innerHTML += track.innerHTML;
    ensureTrackWidth(track);
    var dir = marquee.dataset.dir === "right" ? 1 : -1;
    var speed = reduceMotion ? 0 : (parseFloat(marquee.dataset.speed) || 27.2);
    var pos = 0, half = 0, dragging = false, startX = 0, startPos = 0, moved = false;
    function measure() { half = track.scrollWidth / 2; }
    measure();
    window.addEventListener("resize", measure);
    function tick(t, dt) {
      if (!half) measure();
      if (!dragging && speed) pos += dir * speed * (dt / 1000);
      pos = ((pos % half) + half) % half - half;
      track.style.transform = "translate3d(" + pos + "px,0,0)";
    }
    if (hasGsap) { gsap.ticker.add(function (time, dt) { tick(time, dt); }); }
    else { var last = performance.now(); (function loop(now) { tick(now, now - last); last = now; requestAnimationFrame(loop); })(last); }

    marquee.addEventListener("pointerdown", function (e) {
      dragging = true; moved = false; startX = e.clientX; startPos = pos;
      marquee.setPointerCapture(e.pointerId);
      if (ring) ring.classList.add("is-drag");
    });
    marquee.addEventListener("dragstart", function (e) { e.preventDefault(); });
    marquee.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      pos = startPos + dx;
    });
    function endDrag() { dragging = false; if (ring) ring.classList.remove("is-drag"); }
    marquee.addEventListener("pointerup", endDrag);
    marquee.addEventListener("pointercancel", endDrag);
    marquee.addEventListener("click", function (e) { if (moved) e.preventDefault(); }, true);
    marquee.addEventListener("mouseenter", function () { if (ring) ring.classList.add("is-drag"); });
    marquee.addEventListener("mouseleave", function () { if (!dragging && ring) ring.classList.remove("is-drag"); });
  });

  /* ---------------- Refresh finale ---------------- */
  window.addEventListener("depLoaderDone", function () {
    if (hasGsap && window.ScrollTrigger) ScrollTrigger.refresh();
  }, { once: true });
  window.addEventListener("load", function () {
    if (hasGsap && window.ScrollTrigger) ScrollTrigger.refresh();
  });
})();
