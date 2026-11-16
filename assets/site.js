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

  var initialTheme = root.getAttribute("data-theme") ||
    (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  applyTheme(initialTheme);
  var lang = root.getAttribute("data-lang") || "zh";
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
})();
