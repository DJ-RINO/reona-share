/* ============================================================
   REONA — Award Layer JS
   main.js（既存演出）の上に載せる。壊れても既存機能は無傷。
   1. 見出しの一字分解
   2. Lenis 慣性スクロール + ScrollTrigger 同期
   3. 透かしのパララックス
   4. ヘッダーの退避（下スクロールで隠れ、上で戻る）
   5. マグネティックCTA
   6. カーソルの呼吸（fine pointer のみ）
   7. クロージングの呼吸ガイド（吸って／吐いて）
   8. 夜トーン
   ============================================================ */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---- 1. 見出しの一字分解 ---- */
  document.querySelectorAll("[data-split-chars]").forEach(function (root) {
    var idx = 0;
    root.querySelectorAll(".mist-line").forEach(function (line) {
      var text = line.textContent;
      line.textContent = "";
      Array.prototype.forEach.call(text, function (ch) {
        var s = document.createElement("span");
        s.className = "char";
        s.textContent = ch;
        s.style.setProperty("--char-i", String(idx++));
        line.appendChild(s);
      });
    });
    root.classList.add("is-split");
  });

  /* ---- 8. 夜トーン（18時〜5時） ---- */
  var hour = new Date().getHours();
  if (hour >= 18 || hour < 5) {
    document.body.classList.add("is-night");
  }

  /* ---- 4. ヘッダーの退避 ---- */
  var header = document.querySelector("[data-header]");
  var lastY = window.scrollY;
  var onScrollHeader = function () {
    var y = window.scrollY;
    if (!header) return;
    header.classList.toggle("is-scrolled", y > 24);
    if (y > 320 && y > lastY + 4) {
      header.classList.add("is-hidden");
    } else if (y < lastY - 4) {
      header.classList.remove("is-hidden");
    }
    lastY = y;
  };
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  window.addEventListener("load", function () {

    /* ---- 2. Lenis 慣性スクロール ---- */
    var lenis = null;
    if (!reduceMotion && window.Lenis) {
      lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true });
      var raf = function (time) {
        lenis.raf(time);
        window.requestAnimationFrame(raf);
      };
      window.requestAnimationFrame(raf);

      if (window.ScrollTrigger) {
        lenis.on("scroll", window.ScrollTrigger.update);
      }

      document.querySelectorAll('a[href^="#"]').forEach(function (a) {
        a.addEventListener("click", function (event) {
          var id = a.getAttribute("href");
          if (id.length > 1 && document.querySelector(id)) {
            event.preventDefault();
            lenis.scrollTo(id, { offset: -64, duration: 1.4 });
          }
        });
      });
    }

    /* ---- 3. 透かしのパララックス ---- */
    if (!reduceMotion && window.gsap && window.ScrollTrigger) {
      document.querySelectorAll("[data-parallax]").forEach(function (el) {
        var factor = parseFloat(el.getAttribute("data-parallax")) || 0.15;
        window.gsap.to(el, {
          yPercent: factor * 100,
          ease: "none",
          scrollTrigger: {
            trigger: el.parentElement,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.4
          }
        });
      });
    }
  });

  /* ---- 5. マグネティックCTA ---- */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll("[data-magnetic]").forEach(function (el) {
      var strength = 7;
      el.addEventListener("pointermove", function (event) {
        var rect = el.getBoundingClientRect();
        var dx = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        var dy = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
        el.style.transform = "translate(" + (dx * strength) + "px, " + (dy * strength) + "px)";
      });
      el.addEventListener("pointerleave", function () {
        el.style.transform = "";
      });
    });
  }

  /* ---- 6. カーソルの呼吸 ---- */
  if (finePointer && !reduceMotion) {
    var cursor = document.createElement("div");
    cursor.className = "award-cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.innerHTML = '<span class="award-cursor__ring"></span>';
    document.body.appendChild(cursor);

    var cx = -100, cy = -100, tx = -100, ty = -100;
    var cursorOn = false;

    document.addEventListener("pointermove", function (event) {
      tx = event.clientX;
      ty = event.clientY;
      if (!cursorOn) {
        cursorOn = true;
        cursor.classList.add("is-on");
      }
      var interactive = event.target.closest("a, button, summary, [data-deal]");
      cursor.classList.toggle("is-link", !!interactive);
    }, { passive: true });

    document.addEventListener("pointerleave", function () {
      cursorOn = false;
      cursor.classList.remove("is-on");
    });

    var lerpCursor = function () {
      cx += (tx - cx) * 0.16;
      cy += (ty - cy) * 0.16;
      cursor.style.transform = "translate(" + cx + "px, " + cy + "px)";
      window.requestAnimationFrame(lerpCursor);
    };
    window.requestAnimationFrame(lerpCursor);
  }

  /* ---- 7. 呼吸ガイド: 吸って／吐いて ---- */
  var breathWord = document.querySelector("[data-breath-word]");
  if (breathWord && !reduceMotion) {
    var words = ["吸って", "止めて", "吐いて"];
    var wi = 0;
    window.setInterval(function () {
      breathWord.classList.add("is-swap");
      window.setTimeout(function () {
        wi = (wi + 1) % words.length;
        breathWord.textContent = words[wi];
        breathWord.classList.remove("is-swap");
      }, 700);
    }, 4200);
  }
})();
