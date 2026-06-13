/* ============================================================
   Reona site v2 — main.js 「ひと呼吸」
   1. LINE URL の一括設定（定数1箇所管理）
   2. 追従CTAバーの表示制御（IntersectionObserver）
   3. にじみ出現（is-loaded）
   4. 単発 reveal / ほどける見出し（IntersectionObserver）
   5. 受け方カードのフォーカス（横スワイプ連動）
   6. GSAP scrub: 呼吸の線・円窓・悩みフォーカス・クロージング転調
      ※ GSAP が読めない環境でもサイトは完成形で表示される
   ============================================================ */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- 1. LINE URL（確定したらここを1行変えるだけで全CTAに反映） ---- */
  // TODO data-tbd="line-url": LINE公式アカウントの友だち追加URLに差し替える
  var LINE_URL = "#";

  document.querySelectorAll("[data-line-cta]").forEach(function (el) {
    el.setAttribute("href", LINE_URL);
    if (LINE_URL !== "#") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener");
    }
  });

  /* ---- 2. 追従CTAバー: HeroのCTA表示中とクロージングCTA到達時は隠す ---- */
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

  /* ---- 3. にじみ出現: 読み込み後に1度だけ「息が整う」 ---- */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      document.body.classList.add("is-loaded");
    });
  });

  if (reduceMotion) return; // 以降は演出のみ。reduced-motion では何もしない

  /* ---- 4. 単発 reveal / ほどける見出し ---- */
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

  /* ---- 5. 受け方カード: 横スワイプ中の現在カードに緑を灯す（SPのみ） ---- */
  var track = document.querySelector("[data-channel-track]");
  var channels = Array.prototype.slice.call(document.querySelectorAll("[data-channel]"));
  var progress = document.querySelector("[data-channel-progress]");
  var spMedia = window.matchMedia("(max-width: 899px)");
  var channelObserver = null;

  function armChannels() {
    if (channelObserver) { channelObserver.disconnect(); channelObserver = null; }
    channels.forEach(function (c) { c.classList.remove("is-current"); });

    if (!spMedia.matches || !track || !("IntersectionObserver" in window)) return;

    channelObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var idx = channels.indexOf(entry.target);
          channels.forEach(function (c, i) {
            c.classList.toggle("is-current", i === idx);
          });
          if (progress) {
            Array.prototype.forEach.call(progress.children, function (dot, i) {
              dot.classList.toggle("is-active", i === idx);
            });
          }
        });
      },
      { root: track, threshold: 0.6 }
    );
    channels.forEach(function (c) { channelObserver.observe(c); });
  }

  armChannels();
  spMedia.addEventListener("change", armChannels);

  /* ---- 6. GSAP scrub 演出（読み込み失敗時は静的なまま） ---- */
  window.addEventListener("load", function () {
    if (!window.gsap || !window.ScrollTrigger) return;
    var gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);

    /* 6a. 円窓: スクロールで楕円が開き、写真は逆方向にゆっくり寄る */
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
        gsap.fromTo(img,
          { scale: 1.18 },
          {
            scale: 1,
            ease: "none",
            scrollTrigger: { trigger: win, start: "top bottom", end: "bottom 35%", scrub: 1 }
          }
        );
      }
    });

    /* 6b. 悩みのフォーカス送り: 読んでいる1行だけが浮かぶ */
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

    /* 6c. クロージング: 到達で背景が一度だけ green-tint へ転調（戻れば戻る） */
    var closing = document.querySelector("[data-closing]");
    if (closing) {
      window.ScrollTrigger.create({
        trigger: closing,
        start: "top 70%",
        onEnter: function () { document.body.classList.add("is-exhale"); },
        onLeaveBack: function () { document.body.classList.remove("is-exhale"); }
      });
    }

    /* 6d. 呼吸の線: 文書全体を縫う1本のパスをスクロールで描く */
    var spineHost = document.getElementById("spine");
    if (spineHost) {
      var spineTween = null;

      var buildSpine = function () {
        var W = document.documentElement.clientWidth;
        var H = document.documentElement.scrollHeight;
        var sections = Array.prototype.slice.call(
          document.querySelectorAll("main > section:not([hidden])")
        );
        if (!sections.length) return;

        /* 各セクションの縦中央を、左右交互に緩やかに縫う */
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

        spineHost.style.height = H + "px";

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
        var len = path.getTotalLength();
        path.style.strokeDasharray = len + " " + len;

        if (spineTween) spineTween.scrollTrigger.kill(), spineTween.kill();
        spineTween = gsap.fromTo(path,
          { strokeDashoffset: len },
          {
            strokeDashoffset: 0,
            ease: "none",
            scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 1 }
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
          lastW = w; lastH = h;
          buildSpine();
          window.ScrollTrigger.refresh();
        }, 240);
      });
    }
  });
})();
