/* Preloader De Pellegrin:
   - barra di caricamento ("Torta in preparazione") con la nuvola di
     parole di pasticceria che si popola in tempo reale;
   - a caricamento finito, con un unico gesto fluido la barra si
     restringe, ruota e scivola fino a diventare la stanghetta di una D;
   - la stanghetta sfuma nel logo ufficiale (la stessa immagine
     dell'header), che appare con un pop morbido e vola sull'header. */
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("is-loading");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) root.classList.add("no-motion");

  var preloader = document.getElementById("preloader");
  var bar = document.getElementById("preloader-bar");
  var barFill = document.getElementById("preloader-bar-fill");
  var bag = document.getElementById("preloader-bag");
  var stem = document.getElementById("preloader-stem");
  var depSvg = document.getElementById("preloader-dep");
  var statusEl = document.getElementById("preloader-status");
  var labelText = document.getElementById("preloader-label-text");
  if (!preloader || !bar) { root.classList.remove("is-loading"); return; }

  /* ---- nuvola di parole di pasticceria (stile Mentimeter) ----
     Le parole arrivano una alla volta come proposte in tempo reale:
     entrano con un pop morbido, si dispongono a spirale dal centro
     senza mai sovrapporsi (le caselle sono assi-allineate perché le
     rotazioni possibili sono solo 0° e 90°) e, quando una parola
     "viene proposta di nuovo", cresce e le vicine scivolano dolcemente
     nella nuova posizione. */
  var cloud = (function () {
    var box = document.getElementById("preloader-words");
    if (!box) return { fadeOut: function () {} };

    var POOL = [
      "pasticceria", "lievito madre", "brioche", "sfoglia", "cioccolato",
      "vaniglia", "crema pasticcera", "meringa", "bignè", "pan di spagna",
      "frolla", "ganache", "gelato", "tiramisù", "millefoglie",
      "babà", "cannoncino", "zabaione", "colazione", "caffè",
      "pistacchio", "nocciola", "zucchero a velo", "burro di malga",
      "croissant", "macaron", "profumo di forno", "torte su misura",
      "artigianale", "Lusiana", "dolcezza", "sorriso"
    ];
    var COLORS = ["#2b211a", "#4a3a30", "#b8863f", "#8a7561", "#a98f5f"];
    var hasG = !!window.gsap;
    var mobile = window.innerWidth < 640;
    var MAX = mobile ? 14 : 24;
    var MARGIN = mobile ? 14 : 28;
    var words = [], nextId = 0, timer = null, excl = [], stopped = false;

    function overlap(a, b, pad) {
      return a.x - pad < b.x + b.w && a.x + a.w + pad > b.x &&
             a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
    }
    function exclusions() {
      excl = [];
      var stage = document.getElementById("preloader-stage");
      [stage, statusEl].forEach(function (el) {
        if (!el) return;
        var r = el.getBoundingClientRect();
        excl.push({ x: r.left - 30, y: r.top - 30, w: r.width + 60, h: r.height + 60 });
      });
    }
    function measure(wd, fs) {
      wd.el.style.fontSize = fs + "px";
      wd.w = wd.el.offsetWidth;
      wd.h = wd.el.offsetHeight;
    }
    function boxOf(wd, cx, cy) {
      var bw = wd.rot ? wd.h : wd.w;
      var bh = wd.rot ? wd.w : wd.h;
      return { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh };
    }
    function collides(cand, skip) {
      var W = window.innerWidth, H = window.innerHeight;
      if (cand.x < MARGIN || cand.y < MARGIN ||
          cand.x + cand.w > W - MARGIN || cand.y + cand.h > H - MARGIN) return true;
      for (var k = 0; k < excl.length; k++) if (overlap(cand, excl[k], 6)) return true;
      for (var j = 0; j < words.length; j++) {
        var o = words[j];
        if (o === skip || o.tx === null) continue;
        if (overlap(cand, boxOf(o, o.tx, o.ty), 9)) return true;
      }
      return false;
    }
    /* spirale dal centro: il primo posto libero che non tocca nulla;
       nessun'altra parola viene spostata */
    function placeOne(wd) {
      var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      for (var i = 2; i < 1600; i++) {
        var th = wd.phase + i * 0.33;
        var r = (mobile ? 10 : 14) * Math.sqrt(i);
        var px = cx + Math.cos(th) * r * 1.22;
        var py = cy + Math.sin(th) * r * 0.72;
        if (!collides(boxOf(wd, px, py), wd)) return { x: px, y: py };
      }
      return null;
    }
    function applyPos(wd, isNew) {
      if (hasG && !reduceMotion) {
        if (isNew) {
          gsap.fromTo(wd.el,
            { x: wd.tx, y: wd.ty, xPercent: -50, yPercent: -50, rotation: wd.rot ? 90 : 0, scale: 0, opacity: 0 },
            { scale: 1, opacity: wd.alpha, duration: 0.65, ease: "back.out(1.7)" });
        } else {
          gsap.to(wd.el, { x: wd.tx, y: wd.ty, duration: 0.6, ease: "power3.out" });
        }
      } else {
        wd.el.style.opacity = wd.alpha;
        wd.el.style.transform = "translate(" + (wd.tx - wd.w / 2) + "px," + (wd.ty - wd.h / 2) + "px)" +
          (wd.rot ? " rotate(90deg)" : "");
      }
    }
    function addWord() {
      var el = document.createElement("span");
      var serif = Math.random() < 0.55;
      el.className = "pw " + (serif ? "pw-serif" : "pw-sans");
      el.textContent = POOL[words.length % POOL.length];
      el.style.color = COLORS[(Math.random() * COLORS.length) | 0];
      box.appendChild(el);
      var big = words.length < 3;
      var base = mobile
        ? (big ? 23 : 12 + Math.random() * 11)
        : (big ? 34 : 15 + Math.random() * 16);
      var wd = {
        id: nextId++, el: el, fs: base, cap: base * 1.7,
        rot: Math.random() < 0.24 ? 1 : 0,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.66 + Math.random() * 0.34,
        tx: null, ty: null
      };
      measure(wd, base);
      var pos = placeOne(wd);
      if (!pos) { el.remove(); return; } /* schermo pieno: la parola aspetta */
      wd.tx = pos.x; wd.ty = pos.y;
      words.push(wd);
      applyPos(wd, true);
    }
    /* una parola "riproposta" cresce sul posto, come su Mentimeter:
       solo le vicine in conflitto scivolano in una nuova posizione */
    function bumpWord() {
      if (!words.length) return;
      var wd = words[(Math.random() * words.length) | 0];
      var fs2 = Math.min(wd.fs * 1.18, wd.cap);
      if (fs2 - wd.fs < 0.5) return;
      var from = wd.fs;
      measure(wd, fs2); /* misura alla taglia finale, per le collisioni */
      wd.fs = fs2;
      wd.alpha = Math.min(1, wd.alpha + 0.15);
      /* se crescendo esce dai bordi, rientra appena */
      var W = window.innerWidth, H = window.innerHeight;
      var b = boxOf(wd, wd.tx, wd.ty);
      wd.tx = Math.min(Math.max(wd.tx, MARGIN + b.w / 2), W - MARGIN - b.w / 2);
      wd.ty = Math.min(Math.max(wd.ty, MARGIN + b.h / 2), H - MARGIN - b.h / 2);
      b = boxOf(wd, wd.tx, wd.ty);
      if (hasG && !reduceMotion) {
        wd.el.style.fontSize = from + "px";
        gsap.to(wd.el, { fontSize: fs2, opacity: wd.alpha, x: wd.tx, y: wd.ty, duration: 0.5, ease: "power2.out" });
      } else {
        wd.el.style.opacity = wd.alpha;
        applyPos(wd, false);
      }
      /* le vicine che ora toccherebbe si spostano con dolcezza */
      words.forEach(function (o) {
        if (o === wd || o.tx === null) return;
        if (!overlap(boxOf(o, o.tx, o.ty), b, 9)) return;
        var p = placeOne(o);
        if (p) { o.tx = p.x; o.ty = p.y; applyPos(o, false); }
      });
    }
    function step() {
      if (stopped || document.hidden) return;
      if (words.length < MAX && (words.length < 6 || Math.random() < 0.78)) addWord();
      else bumpWord();
    }
    /* ripiazza tutto da capo (solo per resize o arrivo dei font) */
    function relayoutAll() {
      exclusions();
      var ordered = words.slice().sort(function (a, b) { return b.fs - a.fs || a.id - b.id; });
      ordered.forEach(function (wd) { wd.tx = null; });
      ordered.forEach(function (wd) {
        var p = placeOne(wd);
        wd.tx = p ? p.x : -9999;
        wd.ty = p ? p.y : -9999;
        applyPos(wd, false);
      });
    }
    function onResize() {
      if (!stopped && words.length) relayoutAll();
      else exclusions();
    }

    exclusions();
    window.addEventListener("resize", onResize);
    /* i font arrivano dopo qualche istante: rimisuriamo e risistemiamo */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        if (stopped || !words.length) return;
        words.forEach(function (wd) { measure(wd, wd.fs); });
        relayoutAll();
      }).catch(function () {});
    }
    timer = setInterval(step, mobile ? 150 : 105);

    return {
      fadeOut: function () {
        stopped = true;
        if (timer) { clearInterval(timer); timer = null; }
        if (hasG) gsap.to(box, { opacity: 0, duration: 0.45, ease: "power2.out" });
        else box.style.opacity = "0";
      }
    };
  })();

  /* ---- progresso reale sugli asset chiave ---- */
  var assets = ["img/briciole.webp", "img/dolci-2.webp", "img/mamma-1.webp", "img/ing-burro.webp"];
  var totalAssets = assets.length + 1; /* +1 per i font */
  var loadedAssets = 0;
  var minFloorReached = false;
  var allAssetsLoaded = false;

  function assetDone() {
    loadedAssets++;
    if (loadedAssets >= totalAssets) allAssetsLoaded = true;
  }
  assets.forEach(function (src) {
    var im = new Image();
    im.onload = assetDone; im.onerror = assetDone;
    im.src = src;
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(assetDone).catch(assetDone);
  } else {
    assetDone();
  }
  /* il floor lascia alla nuvola di parole il tempo di popolarsi */
  setTimeout(function () { minFloorReached = true; }, reduceMotion ? 200 : 2900);
  var hardCap = setTimeout(function () { allAssetsLoaded = true; minFloorReached = true; }, 6500);

  var target = 0, display = 0, closing = false;

  /* la sac à poche insegue il bordo del cioccolato e si spreme piano:
     una pulsazione lenta (la mano che stringe) mentre il sacchetto
     si svuota man mano che la barra si riempie */
  function squeezeBag(p) {
    if (!bag) return;
    var t = performance.now() / 1000;
    var pulse = reduceMotion ? 0 : Math.sin(t * 2.1);
    var svuota = 1 - 0.34 * (p / 100);
    var sy = svuota * (1 + 0.045 * pulse);
    var sx = (1 + 0.22 * (1 - svuota)) * (1 - 0.03 * pulse);
    var rot = -30 + pulse * 1.8;
    bag.style.left = p + "%";
    bag.style.transform = "translateX(-50%) rotate(" + rot + "deg) scale(" + sx + ", " + sy + ")";
  }
  squeezeBag(0);

  function tick() {
    if (closing) return;
    var real = Math.min(96, (loadedAssets / totalAssets) * 96);
    target = (allAssetsLoaded && minFloorReached) ? 100 : Math.max(target, real);
    display += (target - display) * (reduceMotion ? 0.5 : 0.075);
    if (target === 100 && display > 99.4) display = 100;
    if (barFill) barFill.style.width = display + "%";
    squeezeBag(display);
    if (labelText) {
      labelText.textContent = display <= 55 ? "Torta in preparazione" : "Torta quasi pronta";
    }
    if (display >= 100) {
      closing = true;
      clearTimeout(hardCap);
      morph();
      return;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  var doneFired = false;
  function fireDone() {
    if (doneFired) return;
    doneFired = true;
    window.dispatchEvent(new Event("depLoaderDone"));
  }

  function finishUp() {
    root.classList.add("loader-done");
    root.classList.remove("is-loading");
    fireDone();
    preloader.classList.add("is-hidden");
    setTimeout(function () {
      if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
    }, 900);
  }

  /* ---- misura, sull'immagine reale del logo, dove si trova la
     stanghetta della D (fatta una volta sola, i numeri sono fissi:
     stessa foto per header, footer e preloader) ---- */
  var STEM_FRAC = { x: 0.315, w: 0.0494, y: 0.113, h: 0.391 };

  /* posiziona la stanghetta-fantasma esattamente sopra alla stanghetta
     della D nell'immagine, cosi il passaggio barra -> stanghetta -> logo
     non ha nessuno scarto visibile */
  function positionStem() {
    if (!stem || !depSvg) return;
    var stage = document.getElementById("preloader-stage");
    var stageRect = stage.getBoundingClientRect();
    var logoRect = depSvg.getBoundingClientRect();
    var w = STEM_FRAC.w * logoRect.width;
    var h = STEM_FRAC.h * logoRect.height;
    var left = (logoRect.left - stageRect.left) + STEM_FRAC.x * logoRect.width;
    var top = (logoRect.top - stageRect.top) + STEM_FRAC.y * logoRect.height;
    stem.style.left = left + "px";
    stem.style.top = top + "px";
    stem.style.width = Math.max(3, w) + "px";
    stem.style.height = h + "px";
  }

  /* ---- morph: barra -> stanghetta della D -> logo vero ---- */
  function morph() {
    cloud.fadeOut();
    if (reduceMotion || !window.gsap) {
      if (depSvg) depSvg.style.opacity = "1";
      if (bag) bag.style.opacity = "0";
      setTimeout(finishUp, reduceMotion ? 150 : 500);
      return;
    }

    gsap.set(depSvg, { opacity: 0, scale: 1, transformOrigin: "50% 50%" });
    positionStem();

    var tl = gsap.timeline({ onComplete: travelToLogo });

    /* la scritta sotto saluta, la sac à poche ha finito il suo lavoro */
    tl.to(statusEl, { opacity: 0, y: 10, duration: 0.4, ease: "power2.in" }, 0);
    if (bag) tl.to(bag, { opacity: 0, y: -12, duration: 0.35, ease: "power2.in" }, 0);

    if (stem) {
      /* dove deve finire la barra: esattamente sopra la stanghetta reale della D */
      var stemRect = stem.getBoundingClientRect();
      var barRect = bar.getBoundingClientRect();
      var dx = (stemRect.left + stemRect.width / 2) - (barRect.left + barRect.width / 2);
      var dy = (stemRect.top + stemRect.height / 2) - (barRect.top + barRect.height / 2);
      var sX = stemRect.height / barRect.width;              /* la barra ruotata: la sua larghezza diventa l'altezza della stanghetta */
      var sY = Math.max(5, stemRect.width) / barRect.height; /* e il suo spessore quello del tratto */

      /* un solo gesto: si restringe, ruota e scivola al posto della stanghetta (solo transform: fluido) */
      tl.to(bar, {
        scaleX: sX, scaleY: sY, rotation: 90, x: dx, y: dy,
        duration: 1.0, ease: "power3.inOut"
      }, 0.08);
      /* crossfade morbido barra -> stanghetta: stessa posizione, nessuno scatto */
      tl.to(stem, { opacity: 1, duration: 0.22, ease: "none" }, ">-0.18");
      tl.to(bar, { opacity: 0, duration: 0.22, ease: "none" }, "<");
      /* la stanghetta sfuma nel logo vero: stessa posizione, stessa scala,
         solo un crossfade di opacita' (nessuno scarto geometrico) */
      tl.to(depSvg, { opacity: 1, duration: 0.5, ease: "power1.inOut" }, ">0.02");
      tl.to(stem, { opacity: 0, duration: 0.5, ease: "power1.inOut" }, "<");
    } else {
      /* la barra si assottiglia e sfuma mentre il logo prende il suo posto */
      tl.to(bar, { opacity: 0, scaleY: 0.3, duration: 0.4, ease: "power2.in" }, 0.05);
      tl.to(depSvg, { opacity: 1, scale: 1, duration: 0.65, ease: "back.out(1.6)" }, 0.25);
    }

    /* piccolo respiro finale del logo */
    tl.to(depSvg, {
      scale: 1.035, duration: 0.22, ease: "power1.inOut",
      yoyo: true, repeat: 1, transformOrigin: "50% 50%"
    }, ">-0.05");
    tl.to({}, { duration: 0.18 });
  }

  /* ---- il monogramma vola sul logo dell'header ---- */
  function travelToLogo() {
    var logo = document.getElementById("logo-dep");
    if (!logo || !window.gsap) { finishUp(); return; }

    var from = depSvg.getBoundingClientRect();
    var to = logo.getBoundingClientRect();
    if (!to.width) { finishUp(); return; }

    var scale = to.width / from.width;
    var dx = (to.left + to.width / 2) - (from.left + from.width / 2);
    var dy = (to.top + to.height / 2) - (from.top + from.height / 2);

    /* il preloader sfuma mentre il monogramma viaggia */
    preloader.style.background = "transparent";
    preloader.style.transition = "none";
    gsap.to(bar, { opacity: 0, duration: 0.2 });
    gsap.to(depSvg, {
      x: dx, y: dy, scale: scale,
      transformOrigin: "50% 50%",
      duration: 1.05, ease: "power3.inOut",
      onComplete: function () {
        logo.style.opacity = "1";
        finishUp();
      }
    });
    root.classList.add("loader-travelling");
    root.classList.remove("is-loading");
    fireDone();
  }
})();
