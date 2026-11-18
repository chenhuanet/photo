(function () {
  "use strict";
  var root = document.documentElement;
  var THEME_KEY = "chenhua-theme";
  var LANG_KEY = "chenhua-lang";

  function meta() { return document.querySelector('meta[name="theme-color"]'); }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    var m = meta();
    if (m) m.setAttribute("content", theme === "light" ? "#f6f2ea" : "#0d0c0b");
    var b = document.querySelector("[data-themebtn]");
    if (b) {
      var lang = root.getAttribute("data-lang") || "zh";
      b.setAttribute("aria-label", theme === "light"
        ? (lang === "en" ? "Switch to dark" : "切换到深色")
        : (lang === "en" ? "Switch to light" : "切换到浅色"));
    }
  }

  function bodyData(name) {
    return document.body ? (document.body.getAttribute(name) || "") : "";
  }

  function applyLang(lang) {
    root.setAttribute("data-lang", lang);
    root.setAttribute("lang", lang === "en" ? "en" : "zh-CN");
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    var t = bodyData(lang === "en" ? "data-title-en" : "data-title-zh");
    if (t) document.title = t;
    var d = bodyData(lang === "en" ? "data-desc-en" : "data-desc-zh");
    var m = document.querySelector('meta[name="description"]');
    if (m && d) m.setAttribute("content", d);
    var b = document.querySelector("[data-lang-toggle]");
    if (b) b.setAttribute("aria-label", lang === "en" ? "Switch to Chinese" : "切换到英文");
    if (window.history && history.replaceState) {
      var u = new URL(location.href);
      if (lang === "en") u.searchParams.set("lang", "en");
      else u.searchParams.delete("lang");
      history.replaceState(null, "", u.toString());
    }
    Array.prototype.forEach.call(document.querySelectorAll("img[data-alt-en]"), function (img) {
      var zh = img.getAttribute("data-alt-zh") || img.getAttribute("alt") || "";
      img.setAttribute("alt", lang === "en" ? (img.getAttribute("data-alt-en") || zh) : zh);
    });
  }

  var initialTheme = "";
  try { initialTheme = localStorage.getItem(THEME_KEY) || ""; } catch (e) {}
  if (initialTheme !== "light" && initialTheme !== "dark") {
    initialTheme = root.getAttribute("data-theme") ||
      (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  }
  applyTheme(initialTheme);
  var lang = "";
  try { lang = new URLSearchParams(location.search).get("lang") || localStorage.getItem(LANG_KEY) || ""; } catch (e) {}
  if (lang !== "en" && lang !== "zh") lang = root.getAttribute("data-lang") || "zh";
  applyLang(lang);

  document.addEventListener("click", function (e) {
    var tb = e.target.closest("[data-themebtn]");
    if (tb) {
      applyTheme(root.getAttribute("data-theme") === "light" ? "dark" : "light");
      return;
    }
    var lb = e.target.closest("[data-lang-toggle]");
    if (lb) {
      applyLang(root.getAttribute("data-lang") === "en" ? "zh" : "en");
    }
  });

  var TAB_ICONS = [
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M4 10.5L12 4l8 6.5V20H4z"/><path d="M9.5 20v-5h5v5"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16M8 7h8M8 11h6"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 3v18"/><path d="M10 7h8M10 12h6M10 17h9"/><circle cx="6" cy="7" r="1.6" fill="currentColor" stroke="none"/><circle cx="6" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="6" cy="17" r="1.6" fill="currentColor" stroke="none"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="6" width="18" height="14" rx="2.5"/><circle cx="12" cy="13" r="4"/><path d="M8 6l1.5-2h5L16 6"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h4a5 5 0 0 0 5-5c0-2.8-4-5-9-5z"/><circle cx="7.5" cy="10" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="14" cy="7" r="1"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2.2 5.3-5.3 2.2 2.2-5.3z"/></svg>'
  ];

  function addTabbar() {
    if (document.querySelector(".tabbar")) return;
    var foot = document.querySelector(".site-foot .sf-nav");
    if (!foot) return;
    var links = Array.prototype.slice.call(foot.querySelectorAll("a"));
    if (links.length < 6) return;
    var current = location.pathname.replace(/\/index\.html$/, "/");
    var best = -1;
    var bestLen = -1;
    links.forEach(function (a, i) {
      try {
        var u = new URL(a.href, location.href);
        if (u.origin === location.origin && u.pathname !== "/" &&
            current.indexOf(u.pathname) === 0 && u.pathname.length > bestLen) {
          best = i;
          bestLen = u.pathname.length;
        }
      } catch (e) {}
    });
    var nav = document.createElement("nav");
    nav.className = "tabbar site-tabbar";
    nav.setAttribute("aria-label", root.getAttribute("data-lang") === "en" ? "Site navigation" : "全站导航");
    links.forEach(function (a, i) {
      var href = a.getAttribute("href") || "";
      var label = a.innerHTML;
      nav.innerHTML += '<a class="tab' + (i === best ? " on" : "") + '" href="' + href + '"' +
        (i === best ? ' aria-current="page"' : "") + '>' +
        (TAB_ICONS[i] || "") + '<span class="tab-label">' + label + "</span></a>";
    });
    var style = document.createElement("style");
    style.textContent =
      ".site-tabbar{display:none}" +
      "html[data-lang=\"en\"] .site-tabbar [data-l=\"zh\"]{display:none}" +
      "html[data-lang=\"zh\"] .site-tabbar [data-l=\"en\"]{display:none}" +
      "@media(max-width:899px){" +
      "body.has-site-tabbar{padding-bottom:calc(62px + env(safe-area-inset-bottom))}" +
      ".site-tabbar{display:grid;position:fixed;left:0;right:0;bottom:0;z-index:40;" +
      "grid-template-columns:repeat(8,minmax(0,1fr));gap:2px;align-items:center;" +
      "border-top:1px solid var(--line,var(--rule,#302b25));" +
      "background:var(--tabbar-bg,var(--bg,var(--paper,#0d0c0b)));" +
      "backdrop-filter:blur(20px);padding:5px 4px calc(5px + env(safe-area-inset-bottom))}" +
      ".site-tabbar .tab{display:flex;flex-direction:column;align-items:center;gap:2px;" +
      "min-width:0;padding:3px 0 2px;border-radius:10px;text-decoration:none;" +
      "color:var(--dim,var(--muted,var(--ink,#9b9184)));font-size:9.5px;letter-spacing:.02em}" +
      ".site-tabbar .tab svg{width:20px;height:20px;flex:none}" +
      ".site-tabbar .tab.on{color:var(--accent,#c8a24a)}" +
      ".site-tabbar .tab-label{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      "@media(max-width:430px){.site-tabbar .tab{font-size:8.5px;letter-spacing:0}.site-tabbar .tab svg{width:19px;height:19px}}" +
      "body.has-site-tabbar .site-foot .sf-nav{display:none}" +
      "body.has-site-tabbar .site-foot{margin-top:18px}" +
      "}";
    document.head.appendChild(style);
    document.body.appendChild(nav);
    document.body.classList.add("has-site-tabbar");
  }
  addTabbar();
})();
