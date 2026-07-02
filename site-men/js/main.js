/* ============================================================
   Reona site v2 — main.js 「ひと呼吸」
   1. Intro: ノックアウトマスク + GSAP + tune GUI
   2. LINE URL の一括設定
   3. 追従CTAバーの表示制御
   4. にじみ出現
   5. 単発 reveal / ほどける見出し
   6. 受け方カードのフォーカス
   7. GSAP scrub: 呼吸の線・円窓・悩みフォーカス・クロージング転調
   ============================================================ */

(function () {
  "use strict";

  var INTRO_STORAGE_KEY = "reona_intro_tune";
  var INTRO_STORAGE_VERSION = 3;
  var INTRO_DEFAULTS = {
    holeStart: 38,
    holeEnd: 620,
    holdDelay: 400,
    duration: 1.9,
    ease: "power3.inOut",
    mx: 50,
    my: 50,
    veilFade: 0.5
  };
  var INTRO_EASES = [
    "power2.out",
    "power3.out",
    "power4.out",
    "power3.inOut",
    "expo.out",
    "sine.inOut",
    "cubic(.16,1,.3,1)"
  ];

  var reduceMotionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduceMotion = reduceMotionMedia.matches;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function cubicBezier(p1x, p1y, p2x, p2y) {
    var cx = 3 * p1x;
    var bx = 3 * (p2x - p1x) - cx;
    var ax = 1 - cx - bx;
    var cy = 3 * p1y;
    var by = 3 * (p2y - p1y) - cy;
    var ay = 1 - cy - by;

    function sampleCurveX(t) { return ((ax * t + bx) * t + cx) * t; }
    function sampleCurveY(t) { return ((ay * t + by) * t + cy) * t; }
    function sampleCurveDerivativeX(t) { return (3 * ax * t + 2 * bx) * t + cx; }

    function solveCurveX(x) {
      var t2 = x;
      var derivative;
      var x2;
      var i;

      for (i = 0; i < 8; i++) {
        x2 = sampleCurveX(t2) - x;
        if (Math.abs(x2) < 1e-6) return t2;
        derivative = sampleCurveDerivativeX(t2);
        if (Math.abs(derivative) < 1e-6) break;
        t2 -= x2 / derivative;
      }

      var t0 = 0;
      var t1 = 1;
      t2 = x;
      while (t0 < t1) {
        x2 = sampleCurveX(t2);
        if (Math.abs(x2 - x) < 1e-6) return t2;
        if (x > x2) t0 = t2;
        else t1 = t2;
        t2 = (t1 - t0) * 0.5 + t0;
        if (Math.abs(t1 - t0) < 1e-6) break;
      }

      return t2;
    }

    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      return sampleCurveY(solveCurveX(x));
    };
  }

  function sanitizeIntroConfig(source) {
    var raw = source || {};
    var version = Number(raw.version || 0);
    var next = {
      holeStart: Number(raw.holeStart != null ? raw.holeStart : raw.windowSize),
      holeEnd: Number(raw.holeEnd),
      holdDelay: Number(raw.holdDelay),
      duration: Number(raw.duration),
      ease: typeof raw.ease === "string" ? raw.ease : INTRO_DEFAULTS.ease,
      mx: Number(raw.mx),
      my: Number(raw.my),
      veilFade: Number(raw.veilFade)
    };

    if (!isFinite(next.holeStart)) next.holeStart = INTRO_DEFAULTS.holeStart;
    if (!isFinite(next.holeEnd)) next.holeEnd = INTRO_DEFAULTS.holeEnd;
    if (!isFinite(next.holdDelay)) next.holdDelay = INTRO_DEFAULTS.holdDelay;
    if (!isFinite(next.duration)) next.duration = INTRO_DEFAULTS.duration;
    if (!isFinite(next.mx)) next.mx = INTRO_DEFAULTS.mx;
    if (!isFinite(next.my)) next.my = INTRO_DEFAULTS.my;
    if (!isFinite(next.veilFade)) next.veilFade = INTRO_DEFAULTS.veilFade;
    if (INTRO_EASES.indexOf(next.ease) === -1) next.ease = INTRO_DEFAULTS.ease;

    if (version < INTRO_STORAGE_VERSION && raw.mx === 50 && raw.my === 46) {
      next.mx = 50;
      next.my = 50;
    }

    next.holeStart = clamp(next.holeStart, 10, 80);
    next.holeEnd = clamp(next.holeEnd, 200, 1200);
    next.holdDelay = clamp(next.holdDelay, 0, 1500);
    next.duration = clamp(next.duration, 0.4, 4);
    next.mx = clamp(next.mx, 0, 100);
    next.my = clamp(next.my, 0, 100);
    next.veilFade = clamp(next.veilFade, 0, 1.5);
    return next;
  }

  function loadStoredIntroConfig() {
    try {
      return sanitizeIntroConfig(JSON.parse(localStorage.getItem(INTRO_STORAGE_KEY) || "{}"));
    } catch (error) {
      return sanitizeIntroConfig(INTRO_DEFAULTS);
    }
  }

  function saveIntroConfig(config) {
    try {
      localStorage.setItem(INTRO_STORAGE_KEY, JSON.stringify(Object.assign({ version: INTRO_STORAGE_VERSION }, config)));
    } catch (error) {
      /* noop */
    }
  }

  function isTuneMode() {
    var url = new URL(window.location.href);
    return url.searchParams.get("tune") === "1" || url.hash.indexOf("tune") !== -1;
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function importModule(src) {
    return import(src);
  }

  function loadStylesheet(href) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('link[href="' + href + '"]');
      if (existing) { resolve(); return; }
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = resolve;
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }

  function buildCopyPayload(config) {
    var json = JSON.stringify(config, null, 2);
    var js = [
      "var INTRO_DEFAULTS = " + json + ";",
      "veil.style.setProperty('--hole', '" + config.holeStart + "%');",
      "veil.style.setProperty('--mx', '" + config.mx + "%');",
      "veil.style.setProperty('--my', '" + config.my + "%');",
      "gsap.to(veil, {",
      "  '--hole': '" + config.holeEnd + "%',",
      "  duration: " + config.duration + ",",
      "  delay: " + (config.holdDelay / 1000) + ",",
      "  ease: '" + config.ease + "'",
      "});",
      "gsap.to(veil, { opacity: 0, duration: " + config.veilFade + ", ease: 'power1.out' });"
    ].join("\n");
    return { json: json, js: js, text: json + "\n\n" + js };
  }

  var introState = {
    config: loadStoredIntroConfig(),
    tuneMode: isTuneMode(),
    veil: null,
    timeline: null,
    paneHost: null
  };

  function applyIntroVars(config) {
    if (!introState.veil) return;
    introState.veil.style.setProperty("--hole", config.holeStart + "%");
    introState.veil.style.setProperty("--mx", config.mx + "%");
    introState.veil.style.setProperty("--my", config.my + "%");
  }

  function resolveEase(name) {
    if (name === "cubic(.16,1,.3,1)") return cubicBezier(0.16, 1, 0.3, 1);
    return name;
  }

  function doneIntro() {
    if (!introState.veil) return;
    introState.veil.style.display = "none";
    introState.veil.style.opacity = "1";
    introState.veil.style.pointerEvents = "none";
    introState.veil.setAttribute("aria-hidden", "true");
  }

  function playIntro() {
    if (!introState.veil) return;
    if (reduceMotion) { doneIntro(); return; }
    if (!window.gsap) { doneIntro(); return; }
    if (introState.timeline) introState.timeline.kill();

    var config = sanitizeIntroConfig(introState.config);
    introState.config = config;
    saveIntroConfig(config);
    applyIntroVars(config);

    introState.veil.style.display = "block";
    introState.veil.style.opacity = "1";
    introState.veil.style.pointerEvents = "auto";
    introState.veil.setAttribute("aria-hidden", "false");

    var gsap = window.gsap;
    var timeline = gsap.timeline({
      onComplete: doneIntro
    });

    timeline.to({}, {
      duration: config.holdDelay / 1000
    });

    timeline.to(introState.veil, {
      "--hole": config.holeEnd + "%",
      duration: config.duration,
      ease: resolveEase(config.ease)
    });

    if (config.veilFade > 0) {
      timeline.to(introState.veil, {
        opacity: 0,
        duration: config.veilFade,
        ease: "power1.out"
      });
    } else {
      timeline.set(introState.veil, { opacity: 0 });
    }

    introState.timeline = timeline;
  }

  function setupIntro() {
    introState.veil = document.getElementById("introVeil");
    if (!introState.veil) return;

    applyIntroVars(introState.config);

    introState.veil.addEventListener("click", function () {
      if (introState.timeline) introState.timeline.kill();
      doneIntro();
    });

    if (reduceMotion) {
      doneIntro();
      return;
    }

    playIntro();
  }

  function setupIntroTuneGui() {
    if (!introState.tuneMode) return;

    loadStylesheet("https://cdn.jsdelivr.net/npm/tweakpane@4/dist/tweakpane.min.css").catch(function () {});

    importModule("https://cdn.jsdelivr.net/npm/tweakpane@4/dist/tweakpane.min.js").then(function (tweakpaneModule) {
      tweakpaneModule = tweakpaneModule || {};
      var PaneCtor = tweakpaneModule.Pane || (window.Tweakpane && window.Tweakpane.Pane) || window.Pane;
      if (!PaneCtor) return;

      var params = Object.assign({}, introState.config);
      var host = document.createElement("div");
      host.className = "intro-tune-pane";
      document.body.appendChild(host);
      introState.paneHost = host;

      var pane = new PaneCtor({
        container: host,
        title: "Intro Tune"
      });

      function syncConfig() {
        introState.config = sanitizeIntroConfig(params);
        Object.assign(params, introState.config);
        saveIntroConfig(introState.config);
      }

      pane.addBinding(params, "holeStart", { min: 10, max: 80, step: 1, label: "holeStart" });
      pane.addBinding(params, "holeEnd", { min: 200, max: 1200, step: 10, label: "holeEnd" });
      pane.addBinding(params, "holdDelay", { min: 0, max: 1500, step: 10, label: "holdDelay" });
      pane.addBinding(params, "duration", { min: 0.4, max: 4, step: 0.05, label: "duration" });
      pane.addBinding(params, "ease", {
        label: "ease",
        options: {
          "power2.out": "power2.out",
          "power3.out": "power3.out",
          "power4.out": "power4.out",
          "power3.inOut": "power3.inOut",
          "expo.out": "expo.out",
          "sine.inOut": "sine.inOut",
          "cubic(.16,1,.3,1)": "cubic(.16,1,.3,1)"
        }
      });
      pane.addBinding(params, "mx", { min: 0, max: 100, step: 1, label: "mx" });
      pane.addBinding(params, "my", { min: 0, max: 100, step: 1, label: "my" });
      pane.addBinding(params, "veilFade", { min: 0, max: 1.5, step: 0.05, label: "veilFade" });

      pane.on("change", function () {
        syncConfig();
        applyIntroVars(introState.config);
      });

      pane.addButton({ title: "▶ もう一度再生" }).on("click", function () {
        syncConfig();
        playIntro();
      });

      pane.addButton({ title: "⧉ 値をコピー/出力" }).on("click", function () {
        syncConfig();
        var payload = buildCopyPayload(introState.config);
        console.log("REONA intro tune JSON\n" + payload.json);
        console.log("REONA intro tune snippet\n" + payload.js);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(payload.text).catch(function () {});
        }
      });
    }).catch(function () {
      /* GUI無しで本体だけ動かす */
    });
  }

  /* ---- 2. LINE URL（確定したらここを1行変えるだけで全CTAに反映） ---- */
  var LINE_URL = "https://lin.ee/xEWmuID";

  document.querySelectorAll("[data-line-cta]").forEach(function (el) {
    el.setAttribute("href", LINE_URL);
    if (LINE_URL !== "#") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener");
    }
    // GA4: LINE CTA クリックを位置別に計測（cta_position はGA4でカスタムディメンション登録）
    el.addEventListener("click", function () {
      if (typeof window.gtag === "function") {
        window.gtag("event", "line_cta_click", {
          cta_position: el.getAttribute("data-cta-position") || "unknown"
        });
      }
    });
  });

  /* ---- 3. 追従CTAバー: HeroのCTA表示中とクロージングCTA到達時は隠す ---- */
  var bar = document.getElementById("cta-bar");
  var heroCta = document.querySelector("[data-hero-cta]");
  var closingCta = document.querySelector("[data-closing-cta]");

  if (bar && "IntersectionObserver" in window) {
    var heroVisible = true;
    var closingVisible = false;

    var updateBar = function () {
      bar.classList.toggle("is-hidden", heroVisible || closingVisible);
    };

    var barObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.target === heroCta) heroVisible = entry.isIntersecting;
          if (entry.target === closingCta) closingVisible = entry.isIntersecting;
        });
        updateBar();
      },
      { threshold: 0 }
    );

    if (heroCta) barObserver.observe(heroCta);
    if (closingCta) barObserver.observe(closingCta);
    updateBar();
  }

  /* ---- 4. にじみ出現 ---- */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      document.body.classList.add("is-loaded");
    });
  });

  if (document.readyState === "complete") setupIntro();
  else window.addEventListener("load", setupIntro, { once: true });
  setupIntroTuneGui();

  function setupYogaCarousel() {
    document.querySelectorAll("[data-ycar]").forEach(function (root) {
      var track = root.querySelector("[data-ycar-track]");
      var cards = Array.prototype.slice.call(root.querySelectorAll("[data-ycar-card]"));
      var counter = root.querySelector("[data-ycar-cur]");
      if (!track || !cards.length) return;
      var n = cards.length, cur = 0, busy = false;
      function pad(num) { return ("0" + num).slice(-2); }
      function render(idx) {
        cur = (idx + n) % n;
        cards.forEach(function (card, i) {
          var off = (i - cur + n) % n;
          card.classList.remove("is-center", "is-near-up", "is-near-down", "is-far-up", "is-far-down", "is-hidden");
          if (off === 0) card.classList.add("is-center");
          else if (off === 1) card.classList.add("is-near-down");
          else if (off === 2) card.classList.add("is-far-down");
          else if (off === n - 1) card.classList.add("is-near-up");
          else if (off === n - 2) card.classList.add("is-far-up");
          else card.classList.add("is-hidden");
          card.setAttribute("aria-hidden", off === 0 ? "false" : "true");
          card.tabIndex = off === 0 ? -1 : 0;
        });
        if (counter) counter.textContent = pad(cur + 1);
      }
      function go(idx) { if (busy) return; busy = true; render(idx); setTimeout(function () { busy = false; }, 680); }
      cards.forEach(function (card, i) {
        card.addEventListener("click", function () { if (!card.classList.contains("is-center")) go(i); });
      });
      var prev = root.querySelector("[data-ycar-prev]"), next = root.querySelector("[data-ycar-next]");
      if (prev) prev.addEventListener("click", function () { go(cur - 1); });
      if (next) next.addEventListener("click", function () { go(cur + 1); });
      var vp = root.querySelector(".ycar__viewport"), x0 = null, y0 = null;
      if (vp) {
        vp.addEventListener("touchstart", function (e) { x0 = e.changedTouches[0].clientX; y0 = e.changedTouches[0].clientY; }, { passive: true });
        vp.addEventListener("touchend", function (e) {
          if (x0 === null) return;
          var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? cur + 1 : cur - 1);
          x0 = y0 = null;
        }, { passive: true });
      }
      root.setAttribute("tabindex", "0");
      root.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); go(cur - 1); }
        else if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); go(cur + 1); }
      });
      render(0);
    });
  }

  setupYogaCarousel();

  if (reduceMotion) return;

  /* ---- 5. 単発 reveal / ほどける見出し ---- */
  if ("IntersectionObserver" in window) {
    document.body.classList.add("reveal-armed", "loosen-armed");

    var inObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          if (entry.target.classList.contains("loosen")) {
            entry.target.classList.add("is-loose");
          } else {
            entry.target.classList.add("is-in");
          }
          inObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.25, rootMargin: "0px 0px -8% 0px" }
    );

    document.querySelectorAll(".reveal, .loosen").forEach(function (el) {
      inObserver.observe(el);
    });
  }

  /* ---- 6. 受け方カード: 展開パネル + ドラッグ ---- */
  var channelTrack = document.querySelector(".channel-panels__viewport");
  var channelPanels = Array.prototype.slice.call(document.querySelectorAll("[data-channel-panel]"));
  var channelState = {
    pointerId: null,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
    suppressUntil: 0,
    revealTimer: null
  };

  function revealChannelPanel(panel) {
    if (!channelTrack || !panel) return;
    var maxScroll = channelTrack.scrollWidth - channelTrack.clientWidth;
    if (maxScroll <= 0) return;
    var targetLeft = panel.offsetLeft - (channelTrack.clientWidth - panel.offsetWidth) * 0.5;
    var nextLeft = clamp(targetLeft, 0, maxScroll);
    channelTrack.scrollTo({ left: nextLeft, behavior: reduceMotion ? "auto" : "smooth" });
  }

  function setOpenChannel(nextPanel, shouldReveal) {
    if (!nextPanel) return;
    channelPanels.forEach(function (panel) {
      var isOpen = panel === nextPanel;
      panel.classList.toggle("is-open", isOpen);
      panel.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    if (channelState.revealTimer) {
      window.clearTimeout(channelState.revealTimer);
      channelState.revealTimer = null;
    }
    if (!shouldReveal) return;
    revealChannelPanel(nextPanel);
    if (!reduceMotion) {
      channelState.revealTimer = window.setTimeout(function () {
        revealChannelPanel(nextPanel);
        channelState.revealTimer = null;
      }, 760);
    }
  }

  function isInteractiveChild(target) {
    return !!(target && target.closest("a, button, input, select, textarea"));
  }

  if (channelTrack && channelPanels.length) {
    channelPanels.forEach(function (panel) {
      panel.addEventListener("focusin", function () {
        setOpenChannel(panel, true);
      });

      panel.addEventListener("mouseenter", function () {
        setOpenChannel(panel, false);
      });

      panel.addEventListener("click", function (event) {
        if (Date.now() < channelState.suppressUntil) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (isInteractiveChild(event.target)) return;
        setOpenChannel(panel, true);
        panel.focus({ preventScroll: true });
      });

      panel.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        setOpenChannel(panel, true);
      });
    });

    channelTrack.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "touch") return;
      if (event.button !== 0) return;
      channelState.pointerId = event.pointerId;
      channelState.startX = event.clientX;
      channelState.startScrollLeft = channelTrack.scrollLeft;
      channelState.moved = false;
      channelTrack.classList.add("is-dragging");
      channelTrack.setPointerCapture(event.pointerId);
    });

    channelTrack.addEventListener("pointermove", function (event) {
      if (channelState.pointerId !== event.pointerId) return;
      var deltaX = event.clientX - channelState.startX;
      if (!channelState.moved && Math.abs(deltaX) > 6) channelState.moved = true;
      if (!channelState.moved) return;
      channelTrack.scrollLeft = channelState.startScrollLeft - deltaX;
    });

    function releaseChannelDrag(event) {
      if (channelState.pointerId == null) return;
      if (event && channelState.pointerId !== event.pointerId) return;
      if (channelState.moved) channelState.suppressUntil = Date.now() + 120;
      if (event) {
        try {
          channelTrack.releasePointerCapture(event.pointerId);
        } catch (error) {
          /* noop */
        }
      }
      channelState.pointerId = null;
      channelTrack.classList.remove("is-dragging");
    }

    channelTrack.addEventListener("pointerup", releaseChannelDrag);
    channelTrack.addEventListener("pointercancel", releaseChannelDrag);
    channelTrack.addEventListener("lostpointercapture", releaseChannelDrag);
  }

  /* ---- 7. GSAP scrub 演出 ---- */
  window.addEventListener("load", function () {
    if (!window.gsap || !window.ScrollTrigger) return;
    var gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);

    document.querySelectorAll("[data-window]").forEach(function (win) {
      var img = win.querySelector("[data-window-img]");

      gsap.fromTo(win,
        { clipPath: "inset(16% 9% 12% 9% round 360px 360px 360px 360px)" },
        {
          clipPath: "inset(0% 0% 0% 0% round 360px 360px 26px 26px)",
          ease: "none",
          scrollTrigger: { trigger: win, start: "top 88%", end: "top 38%", scrub: 1 }
        }
      );

      if (img) {
        var isAbout = win.classList.contains("moon-window--about");
        if (!isAbout) {
          gsap.fromTo(img,
            { scale: 1.18 },
            {
              scale: 1,
              ease: "none",
              scrollTrigger: { trigger: win, start: "top bottom", end: "bottom 35%", scrub: 1 }
            }
          );
        }
      }
    });

    var worryList = document.querySelector("[data-worries]");
    if (worryList) {
      worryList.classList.add("worries-armed");
      var worries = Array.prototype.slice.call(worryList.querySelectorAll(".worry"));
      worries.forEach(function (worry, i) {
        var next = worries[i + 1];
        window.ScrollTrigger.create({
          trigger: worry,
          start: "top 68%",
          endTrigger: next || worry,
          end: next ? "top 68%" : "bottom 30%",
          onToggle: function (self) {
            worry.classList.toggle("is-focus", self.isActive);
          }
        });
      });
    }

    var closing = document.querySelector("[data-closing]");
    if (closing) {
      window.ScrollTrigger.create({
        trigger: closing,
        start: "top 70%",
        onEnter: function () { document.body.classList.add("is-exhale"); },
        onLeaveBack: function () { document.body.classList.remove("is-exhale"); }
      });
    }

    var SPINE_ENABLED = false;
    var spineHost = document.getElementById("spine");
    if (spineHost && SPINE_ENABLED) {
      var spineTween = null;

      var buildSpine = function () {
        var W = document.documentElement.clientWidth;
        var H = document.documentElement.scrollHeight;
        var sections = Array.prototype.slice.call(
          document.querySelectorAll("main > section:not([hidden])")
        );
        if (!sections.length) return;

        var margin = W < 900 ? 0.16 : 0.08;
        var points = [[W * 0.5, 0]];
        sections.forEach(function (sec, i) {
          var y = sec.offsetTop + sec.offsetHeight * 0.5;
          var x = (i % 2 === 0) ? W * (1 - margin) : W * margin;
          points.push([x, y]);
        });
        points.push([W * 0.5, H]);

        var d = "M " + points[0][0] + " " + points[0][1];
        for (var i = 1; i < points.length; i++) {
          var p0 = points[i - 1];
          var p1 = points[i];
          var midY = (p0[1] + p1[1]) / 2;
          d += " C " + p0[0] + " " + midY + ", " + p1[0] + " " + midY + ", " + p1[0] + " " + p1[1];
        }

        var SVG_NS = "http://www.w3.org/2000/svg";
        var svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("viewBox", "0 0 " + W + " " + H);
        svg.setAttribute("preserveAspectRatio", "none");
        svg.setAttribute("focusable", "false");
        var path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", d);
        svg.appendChild(path);
        while (spineHost.firstChild) spineHost.removeChild(spineHost.firstChild);
        spineHost.appendChild(svg);
        spineHost.style.height = H + "px";

        var len = path.getTotalLength();
        path.style.strokeDasharray = len + " " + len;

        if (spineTween) {
          spineTween.scrollTrigger.kill();
          spineTween.kill();
        }

        spineTween = gsap.fromTo(path,
          { strokeDashoffset: len },
          {
            strokeDashoffset: len * 0.08,
            ease: "none",
            scrollTrigger: {
              trigger: document.body,
              start: "top top",
              end: "bottom bottom",
              scrub: 2.2
            }
          }
        );
      };

      buildSpine();

      var resizeTimer = null;
      var lastW = document.documentElement.clientWidth;
      var lastH = document.documentElement.scrollHeight;
      window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          var w = document.documentElement.clientWidth;
          var h = document.documentElement.scrollHeight;
          if (w === lastW && h === lastH) return;
          lastW = w;
          lastH = h;
          buildSpine();
          window.ScrollTrigger.refresh();
        }, 240);
      });
    }
  });
})();
