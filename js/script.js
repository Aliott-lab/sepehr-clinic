/* ==========================================================================
   کلینیک روان‌شناسی سپهر آرامش — script.js
   ماژول‌ها (هر کدام مستقل، بدون وابستگی و بدون اثر جانبی سراسری):
     Config   — اتصال نشانی رزرو و پیوندهای حقوقی
     Nav      — منوی موبایل، حالت اسکرول هدر، لینک فعال
     Split    — شکستن تیتر به کلمه برای انیمیشن ورود
     Stream   — متن جریانی (الهام‌گرفته از streaming-text در VibeFarsi)
     Reveal   — ظاهر شدن بخش‌ها با IntersectionObserver
     Accordion— سوالات متداول
   ========================================================================== */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasIO = "IntersectionObserver" in window;

  function qs(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  /* ---------- Config ---------- */
  var Config = {
    init: function () {
      var cfg = window.SEPEHR_CONFIG || {};
      var booking = (cfg.bookingUrl || "").trim();

      qsa('[data-link="booking"]').forEach(function (a) {
        if (booking) {
          a.setAttribute("href", booking);
          if (cfg.bookingNewTab !== false) {
            a.setAttribute("target", "_blank");
            a.setAttribute("rel", "noopener noreferrer");
          }
        }
      });
      var dev = qs("[data-booking-dev]");
      if (dev) dev.classList.toggle("is-visible", !booking);

      var embed = (cfg.mapEmbedUrl || "").trim();
      var slot = qs("[data-map-slot]");
      var allowed = ["https://neshan.org/maps/iframe/", "https://www.google.com/maps/embed"];
      var okEmbed = allowed.some(function (p) { return embed.indexOf(p) === 0; });
      if (slot && okEmbed) {
        var f = doc.createElement("iframe");
        f.src = embed;
        f.title = "نقشه‌ی موقعیت کلینیک";
        f.loading = "lazy";
        f.referrerPolicy = "strict-origin-when-cross-origin";
        f.setAttribute("allowfullscreen", "");
        slot.insertBefore(f, slot.firstChild);
        slot.classList.add("has-embed");
      }

      var legalShown = 0;
      [["privacy", cfg.privacyUrl], ["terms", cfg.termsUrl]].forEach(function (pair) {
        var url = (pair[1] || "").trim();
        var a = qs('[data-link="' + pair[0] + '"]');
        if (a && url) {
          a.setAttribute("href", url);
          a.hidden = false;
          legalShown++;
        }
      });
      var ph = qs("[data-legal-placeholder]");
      if (ph && legalShown) ph.hidden = true;

      var yearEl = qs("[data-year]");
      if (yearEl) {
        try {
          yearEl.textContent = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(new Date());
        } catch (e) { /* مقدار پیش‌فرض در HTML می‌ماند */ }
      }
    }
  };

  /* ---------- Nav ---------- */
  var Nav = {
    init: function () {
      var header = qs("#site-header");
      var toggle = qs(".nav-toggle");
      var nav = qs("#site-nav");
      if (!header || !toggle || !nav) return;

      function setOpen(open) {
        header.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "بستن منو" : "باز کردن منو");
      }
      function isMobile() { return window.matchMedia("(max-width: 56rem)").matches; }

      toggle.addEventListener("click", function () { setOpen(!header.classList.contains("is-open")); });
      nav.addEventListener("click", function (e) {
        if (e.target.closest("a")) setOpen(false);
      });
      doc.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && header.classList.contains("is-open")) {
          setOpen(false);
          toggle.focus();
        }
      });
      doc.addEventListener("click", function (e) {
        if (header.classList.contains("is-open") && !header.contains(e.target)) setOpen(false);
      });
      window.addEventListener("resize", function () { if (!isMobile()) setOpen(false); });

      // وقتی منو بسته است، لینک‌های پنهان‌شده در موبایل از ترتیب Tab خارج می‌شوند (visibility در CSS)
      var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 12); };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });

      // لینک فعال بر اساس بخش در دید
      if (hasIO) {
        var links = qsa(".nav__link");
        var map = {};
        links.forEach(function (l) { map[l.getAttribute("href")] = l; });
        var spy = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              links.forEach(function (l) { l.classList.remove("is-active"); l.removeAttribute("aria-current"); });
              var l = map["#" + en.target.id];
              if (l) { l.classList.add("is-active"); l.setAttribute("aria-current", "true"); }
            }
          });
        }, { rootMargin: "-45% 0px -50% 0px" });
        ["services", "team", "about", "faq", "contact"].forEach(function (id) {
          var s = doc.getElementById(id);
          if (s) spy.observe(s);
        });
      }
    }
  };

  /* ---------- Split: تیتر هیرو کلمه‌به‌کلمه (هرگز حرف‌به‌حرف؛ اتصال حروف فارسی حفظ می‌شود) ---------- */
  var Split = {
    init: function () {
      qsa("[data-split]").forEach(function (el) {
        var i = 0;
        (function walk(node) {
          Array.prototype.slice.call(node.childNodes).forEach(function (child) {
            if (child.nodeType === 3) {
              var parts = child.textContent.split(/(\s+)/);
              var frag = doc.createDocumentFragment();
              parts.forEach(function (p) {
                if (!p) return;
                if (/^\s+$/.test(p)) { frag.appendChild(doc.createTextNode(" ")); return; }
                var s = doc.createElement("span");
                s.className = "w";
                s.style.setProperty("--wi", i++);
                s.setAttribute("aria-hidden", "true");
                s.textContent = p;
                frag.appendChild(s);
              });
              node.replaceChild(frag, child);
            } else if (child.nodeType === 1) {
              walk(child);
            }
          });
        })(el);
        // متن کامل برای فناوری‌های کمکی
        el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
        requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add("is-in"); }); });
      });
    }
  };

  /* ---------- Stream: کلمه‌ها یکی‌یکی از دل تاری ---------- */
  var Stream = {
    init: function () {
      qsa("[data-stream]").forEach(function (el) {
        var dot = qs(".stream__dot", el);
        var text = Array.prototype.map.call(el.childNodes, function (n) {
          return n.nodeType === 3 ? n.textContent : "";
        }).join("").replace(/\s+/g, " ").trim();
        if (!text) return;

        var words = text.split(" ");
        el.setAttribute("aria-label", text);
        Array.prototype.slice.call(el.childNodes).forEach(function (n) { if (n.nodeType === 3) el.removeChild(n); });

        var frag = doc.createDocumentFragment();
        words.forEach(function (w, i) {
          var s = doc.createElement("span");
          s.className = "sw";
          s.setAttribute("aria-hidden", "true");
          s.style.setProperty("--si", i);
          s.textContent = w;
          frag.appendChild(s);
          if (i < words.length - 1) frag.appendChild(doc.createTextNode(" "));
        });
        el.insertBefore(frag, dot || null);

        requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add("is-in"); }); });
        var total = 700 + words.length * 45 + 400;
        setTimeout(function () { el.classList.add("is-done"); }, reduceMotion ? 0 : total);
      });
    }
  };

  /* ---------- Reveal ---------- */
  var Reveal = {
    init: function () {
      // stagger: ایندکس هر آیتم داخل گروه
      qsa("[data-stagger]").forEach(function (group) {
        qsa(".reveal", group).forEach(function (item, i) { item.style.setProperty("--i", i); });
      });

      var targets = qsa(".reveal, .hl--scroll, [data-hero-visual]");
      if (!hasIO || reduceMotion) {
        targets.forEach(function (t) { t.classList.add("is-in"); });
        return;
      }
      var io = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            obs.unobserve(en.target);
          }
        });
      }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
      targets.forEach(function (t) { io.observe(t); });
    }
  };

  /* ---------- Accordion ---------- */
  var Accordion = {
    init: function () {
      qsa("[data-accordion]").forEach(function (acc) {
        var items = qsa(".accordion__item", acc);
        items.forEach(function (item, idx) {
          var btn = qs(".accordion__button", item);
          var panel = qs(".accordion__panel", item);
          function set(open) {
            btn.setAttribute("aria-expanded", String(open));
            panel.classList.toggle("is-open", open);
          }
          set(false);
          btn.addEventListener("click", function () {
            var open = btn.getAttribute("aria-expanded") !== "true";
            set(open);
          });
          // کنترل کیبورد: جهت‌های بالا/پایین، Home و End
          btn.addEventListener("keydown", function (e) {
            var next = null;
            if (e.key === "ArrowDown") next = items[(idx + 1) % items.length];
            else if (e.key === "ArrowUp") next = items[(idx - 1 + items.length) % items.length];
            else if (e.key === "Home") next = items[0];
            else if (e.key === "End") next = items[items.length - 1];
            if (next) { e.preventDefault(); qs(".accordion__button", next).focus(); }
          });
        });
      });
    }
  };

  function boot() {
    Config.init();
    Nav.init();
    Split.init();
    Stream.init();
    Reveal.init();
    Accordion.init();
    window.__sepehrReady = true;
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
