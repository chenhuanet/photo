(function () {
  "use strict";
  const CFG = window.SITE_CONFIG || {};
  const BUNDLE = window.CHENHUA_BUNDLE || { records: [], stories: [], stats: {} };
  const NOTES = window.CHENHUA_TODAY_NOTES || {};
  const SEARCH_INDEX = window.CHENHUA_SEARCH_INDEX || { records: {}, stories: {} };
  const I18N = window.CHENHUA_I18N || { zh: {}, en: {} };
  const app = document.getElementById("app");
  const THEME_KEY = "chenhua-theme";
  const LANG_KEY = "chenhua-lang";
  const state = {
    mode: "noncommercial",
    route: "today",
    arg: null,
    visible: 30,
    q: "",
    searchCollection: "all",
    searchScope: "",
    themeCollection: "",
    filter: { collection: "all", topic: "all", movement: "all" },
    usage: "all",
    lb: { items: [], index: 0 },
    lang: (document.documentElement.getAttribute("data-lang") === "en") ? "en" : "zh",
    theme: document.documentElement.getAttribute("data-theme") || "dark",
  };

  function t(key, vars) {
    var dict = I18N[state.lang] || {};
    var text = dict[key];
    if (text == null) text = (I18N.zh || {})[key];
    if (text == null) text = key;
    if (vars) {
      text = text.replace(/\{(\w+)\}/g, function (_, k) {
        return vars[k] == null ? "" : vars[k];
      });
    }
    return text;
  }
  function isEn() { return state.lang === "en"; }
  function loc(obj, field) {
    if (!obj) return "";
    if (isEn()) {
      var v = obj[field + "_en"];
      if (v != null && v !== "") return v;
    }
    return obj[field] == null ? "" : obj[field];
  }
  function tx(kind, value) {
    if (!isEn() || !value) return value || "";
    var map = (CFG.taxonomy || {})[kind] || {};
    return map[value] || value;
  }
  function tagsText(s) {
    var arr = isEn() ? (s.themes_en || s.themes || []) : (s.themes || []);
    if (isEn()) {
      arr = arr.map(function (x) {
        if (!/[\u4e00-\u9fff]/.test(x)) return x;
        var tax = CFG.taxonomy || {};
        for (var k in tax) {
          if (tax[k] && tax[k][x]) return tax[k][x];
        }
        return x;
      });
    }
    return arr.join(" / ");
  }

  const SITE_RECORDS = (BUNDLE.records || []).filter(function (r) {
    return (CFG.collections || []).indexOf(r.collection) >= 0;
  });
  const SITE_STORIES = CFG.stories === false ? [] : (BUNDLE.stories || []).filter(function (s) {
    return (s.photo_ids || []).some(function (id) {
      return SITE_RECORDS.some(function (r) { return r.id === id; });
    });
  });

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function imgOf(r) { return r.image || r.preview_image || ""; }
  function todayNoteHtml(r) {
    var n = NOTES[r.id] || {};
    if (isEn()) return esc(n.note_en || n.note || loc(r, "note"));
    return n.note_html || n.note || r.note_html || "";
  }
  function recordImage(r) {
    if (r.collection === "paintings" && r.image && /^https?:\/\//.test(r.image)) return r.image;
    return imgOf(r);
  }
  function displayImage(url, width) {
    if (!url || !/^https?:\/\/(thumb|upload)\.wikimedia\.org\//.test(url)) return url;
    var u;
    try { u = new URL(url, location.href); } catch (e) { return url; }
    if (u.hostname === "thumb.wikimedia.org") {
      u.pathname = u.pathname.replace(/\/\d+px-/, "/" + width + "px-");
      return u.href;
    }
    var m = u.pathname.match(/^\/wikipedia\/commons\/([^/]+)\/([^/]+)\/(.+)$/);
    if (!m) return url;
    u.hostname = "thumb.wikimedia.org";
    u.pathname = "/wikipedia/commons/thumb/" + m[1] + "/" + m[2] + "/" + m[3] +
      "/" + width + "px-" + m[3];
    return u.href;
  }
  function heroSrcset(r) {
    var url = recordImage(r), widths = [400, 500, 800], out = [], seen = {};
    for (var i = 0; i < widths.length; i++) {
      var u = displayImage(url, widths[i]);
      if (u && !seen[u]) { seen[u] = 1; out.push(u + " " + widths[i] + "w"); }
    }
    return out.join(", ");
  }
  function heroImage(r) { return displayImage(recordImage(r), 500); }
  function cardImage(url) { return displayImage(url, 500); }
  function modeOk(r) {
    if (state.mode === "commercial") return r.commercial_ok === true;
    return true;
  }
  function filtered() {
    var rows = SITE_RECORDS.filter(modeOk);
    if (state.filter.collection !== "all") {
      rows = rows.filter(function (r) { return r.collection === state.filter.collection; });
    }
    if (state.filter.topic !== "all") {
      rows = rows.filter(function (r) { return r.topic === state.filter.topic; });
    }
    if (state.filter.movement !== "all") {
      rows = rows.filter(function (r) { return r.movement === state.filter.movement; });
    }
    return rows.sort(function (a, b) { return (b.year || 0) - (a.year || 0); });
  }
  function byId(id) { return SITE_RECORDS.filter(function (r) { return r.id === id; })[0]; }
  function usageTag(r) {
    var c = (r.usage_code || "").toLowerCase();
    var label = isEn() ? (r.usage_short_en || r.usage_short) : (r.usage_short || r.usage_code);
    return '<span class="tag ' + c + '">' + esc(label) + "</span>";
  }
  function typeLabel(r) {
    if (isEn()) return tx("content_type", r.content_type);
    return {
      painting: "绘画", print: "版画", drawing: "素描", postcard: "明信片",
      object: "器物", document: "文书", photograph: "照片", link: "外链"
    }[r.content_type] || "";
  }
  function siteUrl(path) {
    return (CFG.base || "/") + path;
  }
  function routeHref(route) {
    var base = CFG.base || "/";
    if (!route || route === "today") return base;
    return base + route + "/";
  }
  function staticHref(r) {
    if (r.collection === "paintings") {
      if (CFG.staticPaintBase) return CFG.staticPaintBase + r.id + ".html";
      return siteUrl(CFG.site === "paint" ? "painting/" + r.id + ".html" : "../paint/painting/" + r.id + ".html");
    }
    if (CFG.staticPhotoBase) return CFG.staticPhotoBase + r.id + ".html";
    return siteUrl(CFG.site === "photo" ? "photo/" + r.id + ".html" : "../photo/photo/" + r.id + ".html");
  }
  function storyStaticHref(s) {
    if (CFG.staticStoryBase) return CFG.staticStoryBase + s.id + ".html";
    return siteUrl(CFG.site === "main" ? "story/" + s.id + ".html" : "../main/story/" + s.id + ".html");
  }
  function topicChips(active) {
    var counts = {};
    SITE_RECORDS.forEach(function (r) { if (r.topic) counts[r.topic] = (counts[r.topic] || 0) + 1; });
    var topics = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 10);
    var out = ['<button class="chip ' + (active === "all" ? "on" : "") + '" data-filter="topic" data-value="all">' + esc(t("common.allTopics")) + "</button>"];
    topics.forEach(function (tp) {
      out.push('<button class="chip ' + (active === tp ? "on" : "") + '" data-filter="topic" data-value="' + esc(tp) + '">' + esc(tx("topic", tp)) + "</button>");
    });
    return out.join("");
  }
  function movementChips(active) {
    var counts = {}, labels = {};
    SITE_RECORDS.forEach(function (r) {
      if (r.collection !== "paintings" || !r.movement) return;
      counts[r.movement] = (counts[r.movement] || 0) + 1;
      labels[r.movement] = isEn() ? (r.movement_en || r.movement) : r.movement;
    });
    var moves = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    if (!moves.length) return "";
    var out = ['<button class="chip ' + (active === "all" ? "on" : "") + '" data-filter="movement" data-value="all">' + esc(t("common.allMovements")) + "</button>"];
    moves.forEach(function (mv) {
      out.push('<button class="chip ' + (active === mv ? "on" : "") + '" data-filter="movement" data-value="' + esc(mv) + '">' + esc(labels[mv]) + "</button>");
    });
    return out.join("");
  }
  function collectionChips(active, key) {
    if (!CFG.collections || CFG.collections.length < 1) return "";
    var f = key === "searchCollection" ? "searchCollection" : "collection";
    var out = ['<button class="chip ' + (active === "all" ? "on" : "") + '" data-filter="' + f + '" data-value="all">' + esc(t("common.all")) + "</button>"];
    if (CFG.collections.indexOf("photos") >= 0) {
      out.push('<button class="chip ' + (active === "photos" ? "on" : "") + '" data-filter="' + f + '" data-value="photos">' + esc(t("common.photos")) + "</button>");
    }
    if (CFG.collections.indexOf("paintings") >= 0) {
      out.push('<button class="chip ' + (active === "paintings" ? "on" : "") + '" data-filter="' + f + '" data-value="paintings">' + esc(t("common.paintings")) + "</button>");
    }
    if (CFG.collections.indexOf("links") >= 0) {
      out.push('<button class="chip ' + (active === "links" ? "on" : "") + '" data-filter="' + f + '" data-value="links">' + esc(t("common.links")) + "</button>");
    }
    return out.join("");
  }

  const ICONS = {
    today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    gallery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    stories: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16M8 7h8M8 11h6"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
    photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="6" width="18" height="14" rx="2.5"/><circle cx="12" cy="13" r="4"/><path d="M8 6l1.5-2h5L16 6"/></svg>',
    paint: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h4a5 5 0 0 0 5-5c0-2.8-4-5-9-5z"/><circle cx="7.5" cy="10" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="14" cy="7" r="1"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M4 10.5L12 4l8 6.5V20H4z"/><path d="M9.5 20v-5h5v5"/></svg>',
    compass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2.2 5.3-5.3 2.2 2.2-5.3z"/></svg>',
    timeline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 3v18"/><path d="M10 7h8M10 12h6M10 17h9"/><circle cx="6" cy="7" r="1.6" fill="currentColor" stroke="none"/><circle cx="6" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="6" cy="17" r="1.6" fill="currentColor" stroke="none"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    sun: '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>',
    lang: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M3.8 12h16.4M12 3.5c2.1 2.4 3.2 5.4 3.2 8.5s-1.1 6.1-3.2 8.5c-2.1-2.4-3.2-5.4-3.2-8.5S9.9 5.9 12 3.5z"/></svg>',
  };

  function navItems() {
    return (CFG.nav || []).filter(function (n) { return n && n.label && !n.search; });
  }
  function navLabel(n) {
    return isEn() ? (n.label_en || n.label) : n.label;
  }
  function deskLabel(n) {
    return isEn() ? (n.deskLabel_en || n.deskLabel || n.label_en || n.label) : (n.deskLabel || n.label);
  }
  function themeHref() {
    if (CFG.site === "main") return routeHref("stories");
    var coll = CFG.site === "photo" ? "?collection=photos" : (CFG.site === "paint" ? "?collection=paintings" : "");
    return (CFG.home || "/") + "stories/" + coll;
  }
  function timelineHref() {
    if (CFG.site === "main") return routeHref("timeline");
    var coll = CFG.site === "photo" ? "?collection=photos" : (CFG.site === "paint" ? "?collection=paintings" : "");
    return (CFG.home || "/") + "timeline/" + coll;
  }
  function brandHref() {
    return CFG.site === "main" ? routeHref("today") : (CFG.home || "/");
  }
  function defaultSearchScope() {
    return CFG.site === "photo" ? "photos" : (CFG.site === "paint" ? "paintings" : "all");
  }
  function searchHref() {
    return CFG.site === "main" ? routeHref("search") : (CFG.home || "/") + "search/";
  }
  function searchUrl(qtext, scope) {
    var parts = [];
    if (qtext) parts.push("q=" + encodeURIComponent(qtext));
    if (scope) parts.push("scope=" + scope);
    return searchHref() + (parts.length ? "?" + parts.join("&") : "");
  }
  function homeSearchLabel() {
    if (CFG.site === "photo") return t("search.ph.photo");
    if (CFG.site === "paint") return t("search.ph.paint");
    return t("search.ph.main");
  }
  function headSearch() {
    return '<form class="head-search" action="' + esc(searchHref()) + '" role="search">' +
      '<input name="q" type="search" placeholder="' + esc(homeSearchLabel()) + '" autocomplete="off" aria-label="' + esc(t("common.search")) + '">' +
      '<button type="submit" aria-label="' + esc(t("common.search")) + '">' + ICONS.search + "</button></form>";
  }
  function searchIcon() {
    return '<a class="iconbtn searchbtn" href="' + esc(searchUrl("", defaultSearchScope())) + '" aria-label="' + esc(t("common.search")) + '">' + ICONS.search + "</a>";
  }
  function langIcon() {
    return '<button class="langbtn" type="button" data-lang-toggle aria-label="' + esc(t("lang.aria")) + '">' + ICONS.lang + "</button>";
  }
  function itemHref(n) {
    if (n.search) return searchUrl("", defaultSearchScope());
    if (n.themes) return themeHref();
    if (n.timeline) return timelineHref();
    return n.href || routeHref(n.route || "today");
  }
  function wordmark() {
    return '<span class="wm"><span class="wm-lite">出</span><span class="wm-strong">尘</span>' +
      '<span class="wm-lite">入</span><span class="wm-strong">画</span></span>' +
      '<span class="wm-en">Frame & Grain</span>';
  }
  function leafSrc(expr) {
    return (CFG.leafBase || "assets/leaf/") + (expr || "calm") + ".svg";
  }
  function leafIcon(expr, size, cls) {
    return '<img class="leaf-mark ' + (cls || "") + '" src="' + esc(leafSrc(expr)) +
      '" width="' + size + '" height="' + size + '" alt="" aria-hidden="true" decoding="async">';
  }
  function siteLeaf() {
    if (CFG.site === "photo") return "curious";
    if (CFG.site === "paint") return "proud";
    return "joy";
  }
  function emptyState(expr, title, text, cls) {
    return '<div class="empty empty-leaf ' + (cls || "") + '">' + leafIcon(expr, 82, "empty-mark") +
      "<b>" + esc(title) + "</b><p>" + esc(text) + "</p></div>";
  }
  function monthName(i) {
    return t("month." + (i + 1));
  }
  function fmtDate(d) {
    if (isEn()) return monthName(d.getMonth()) + " " + d.getDate();
    return (d.getMonth() + 1) + "月" + d.getDate() + "日";
  }

  function shell() {
    var items = navItems();
    var mobile = items.filter(function (n) { return n.mobile !== false && !n.wideOnly; });
    var nav = mobile.map(function (n) {
      var attr = "";
      if (n.route) attr += ' data-tab="' + esc(n.route) + '"';
      if (n.themes) attr += ' data-themes="1"';
      if (n.timeline) attr += ' data-timeline="1"';
      if (n.site) attr += ' data-site="' + esc(n.site) + '"';
      var label = n.icon === "home" ? (isEn() ? "Frame" : "尘画") : navLabel(n);
      return '<a class="tab" href="' + esc(itemHref(n)) + '"' + attr + ">" +
        (ICONS[n.icon] || "") + "<span>" + esc(label) + "</span></a>";
    }).join("");
    var deskItems = items.filter(function (n) { return n.icon !== "home"; });
    var desk = deskItems.map(function (n) {
      var attr = "";
      if (n.route) attr += ' data-desk="' + esc(n.route) + '"';
      if (n.themes) attr += ' data-themes="1"';
      if (n.timeline) attr += ' data-timeline="1"';
      if (n.site) attr += ' data-site="' + esc(n.site) + '"';
      return '<a' + (n.wideOnly ? ' class="wide-only"' : "") + ' href="' + esc(itemHref(n)) + '"' + attr + ">" + esc(deskLabel(n)) + "</a>";
    }).join("");
    app.innerHTML =
      '<header class="appbar has-head-search">' +
        '<a class="brand" href="' + esc(brandHref()) + '">' + leafIcon(siteLeaf(), 30, "brand-mark") + wordmark() + '<span class="sub">' + esc(t("brand.sub")) + "</span></a>" +
        '<nav class="desknav">' + desk + "</nav>" +
        headSearch() +
        '<div class="right">' +
          searchIcon() + langIcon() +
          '<button class="iconbtn themebtn" data-themebtn aria-label="' + esc(state.theme === "light" ? t("theme.toDark") : t("theme.toLight")) + '">' + ICONS.sun + ICONS.moon + "</button>" +
        "</div>" +
      "</header>" +
      '<main class="app-scroll"><div id="view" class="view"></div></main>' +
      '<nav class="tabbar" style="grid-template-columns:repeat(' + Math.max(1, mobile.length) + ',1fr)">' + nav + "</nav>" +
      '<div class="lightbox" id="lightbox">' +
        '<div class="lb-top"><span class="t" id="lbCount">—</span><button class="iconbtn" data-lb-close="1" aria-label="' + esc(t("common.close")) + '">' + ICONS.close + "</button></div>" +
        '<div class="lb-stage" id="lbStage"><img id="lbImg" alt=""></div>' +
        '<div class="lb-nav"><button class="btn" data-lb-prev="1">' + esc(t("common.prev")) + '</button><button class="btn" data-lb-next="1">' + esc(t("common.next")) + "</button></div>" +
        '<div class="lb-cap" id="lbCap"></div>' +
      "</div>" +
      '<div class="toast" id="toast"></div>';
    bindGlobal();
    var sc = app.querySelector(".app-scroll");
    if (sc) sc.addEventListener("scroll", maybeDayLoad, { passive: true });
    window.addEventListener("scroll", maybeDayLoad, { passive: true });
  }

  function bindGlobal() {
    app.addEventListener("click", function (e) {
      var t2 = e.target.closest("[data-mode],[data-lang-toggle],[data-themebtn],[data-filter],[data-lb],[data-lb-close],[data-lb-prev],[data-lb-next],[data-copy],[data-phone],[data-usage]");
      if (!t2) return;
      if (t2.hasAttribute("data-mode")) {
        state.mode = state.mode === "commercial" ? "noncommercial" : "commercial";
        syncMode(); renderView();
      } else if (t2.hasAttribute("data-lang-toggle")) {
        var nextLang = isEn() ? "zh" : "en";
        try { localStorage.setItem(LANG_KEY, nextLang); } catch (err) {}
        try {
          var host = location.hostname;
          var domain = (host === "chenhua.net" || host.slice(-12) === ".chenhua.net") ? "; domain=.chenhua.net" : "";
          document.cookie = LANG_KEY + "=" + nextLang + "; path=/; max-age=31536000; SameSite=Lax" + domain;
        } catch (err) {}
        var u = new URL(location.href);
        u.searchParams.set("lang", nextLang);
        location.href = u.toString();
      } else if (t2.hasAttribute("data-themebtn")) {
        applyTheme(state.theme === "light" ? "dark" : "light");
      } else if (t2.hasAttribute("data-phone")) {
        var u = new URL(location.href);
        if (u.searchParams.get("phone")) u.searchParams.delete("phone");
        else u.searchParams.set("phone", "1");
        location.href = u.toString();
      } else if (t2.hasAttribute("data-filter")) {
        var key = t2.getAttribute("data-filter");
        var val = t2.getAttribute("data-value");
        if (key === "collection") { state.filter.collection = val; state.filter.movement = "all"; }
        if (key === "topic") { state.filter.topic = val; state.filter.movement = "all"; }
        if (key === "movement") { state.filter.movement = val; state.filter.topic = "all"; }
        if (key === "searchCollection") { state.searchCollection = val; renderSearchResults(); syncSearchChips(); return; }
        if (key === "searchScope") { state.searchScope = val; syncSearchUrl(); renderSearchResults(); syncSearchChips(); return; }
        if (key === "usage") { state.usage = val; renderView(); return; }
        state.visible = 30; renderView();
      } else if (t2.hasAttribute("data-lb")) {
        e.preventDefault(); openLightbox(t2.getAttribute("data-lb"));
      } else if (t2.hasAttribute("data-lb-close")) {
        closeLightbox();
      } else if (t2.hasAttribute("data-lb-prev")) {
        stepLightbox(-1);
      } else if (t2.hasAttribute("data-lb-next")) {
        stepLightbox(1);
      } else if (t2.hasAttribute("data-copy")) {
        copyText(t2.getAttribute("data-copy"));
      }
    });
    app.addEventListener("submit", function (e) {
      var f = e.target.closest("[data-search-form]");
      if (!f) return;
      e.preventDefault();
      var input = f.querySelector('input[name="q"]');
      var qtext = input ? input.value.trim() : "";
      location.href = searchUrl(qtext, f.getAttribute("data-scope") || defaultSearchScope());
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeLightbox(); }
      var lb = q("#lightbox");
      if (lb && lb.classList.contains("on")) {
        if (e.key === "ArrowLeft") stepLightbox(-1);
        if (e.key === "ArrowRight") stepLightbox(1);
      }
    });
    var stage = q("#lbStage");
    var sx = null;
    stage.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener("touchend", function (e) {
      if (sx == null) return;
      var dx = e.changedTouches[0].clientX - sx;
      sx = null;
      if (Math.abs(dx) > 45) stepLightbox(dx > 0 ? -1 : 1);
    });
  }

  function applyTheme(theme) {
    state.theme = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", state.theme);
    try { localStorage.setItem(THEME_KEY, state.theme); } catch (e) {}
    try {
      var host = location.hostname;
      var domain = (host === "chenhua.net" || host.slice(-12) === ".chenhua.net") ? "; domain=.chenhua.net" : "";
      document.cookie = THEME_KEY + "=" + state.theme + "; path=/; max-age=31536000; SameSite=Lax" + domain;
    } catch (e) {}
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", state.theme === "light" ? "#f6f2ea" : "#0d0c0b");
    var b = q("[data-themebtn]");
    if (b) b.setAttribute("aria-label", state.theme === "light" ? t("theme.toDark") : t("theme.toLight"));
  }

  function syncMode() {
    var b = q(".modebtn");
    if (!b) return;
    b.textContent = state.mode === "commercial" ? t("mode.commercial") : t("mode.noncommercial");
    b.classList.toggle("commercial", state.mode === "commercial");
  }
  function navigate(route) {
    if (route === "search") { location.href = searchUrl("", defaultSearchScope()); return; }
    location.href = routeHref(route);
  }
  function currentRoute() {
    var known = ["today", "gallery", "stories", "timeline", "search", "about", "rights"];
    var p = location.pathname.replace(/index\.html$/, "");
    var base = CFG.base || "/";
    if (p.indexOf(base) === 0) p = p.slice(base.length);
    var seg = p.replace(/^\/+|\/+$/g, "").split("/")[0] || "today";
    return { name: known.indexOf(seg) >= 0 ? seg : "today", arg: null };
  }
  function renderView() {
    var r = currentRoute();
    state.route = r.name;
    state.arg = r.arg;
    var view = q("#view");
    if (!view) return;
    var html;
    if (r.name === "gallery") html = viewGallery();
    else if (r.name === "stories") html = viewStories();
    else if (r.name === "timeline") html = viewTimeline();
    else if (r.name === "search") html = viewSearch();
    else if (r.name === "rights") html = viewSimple(t("page.rights.title"), t("page.rights.text"), "think");
    else if (r.name === "about") html = viewSimple(t("page.about.title"), t("page.about.text"), "shy");
    else if (CFG.site === "main") html = todayEvent() ? viewTodayEvent() : (themeStories().length ? viewTodayTheme() : viewToday());
    else html = viewToday();
    view.innerHTML = html + appFoot();
    syncActiveTab();
    syncMode();
    var sc = q(".app-scroll"); if (sc) sc.scrollTop = 0;
    bindView();
  }
  function syncActiveTab() {
    var active = state.route;
    qa("[data-tab]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-tab") === active); });
    qa("[data-desk]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-desk") === active); });
    qa("[data-themes]").forEach(function (b) { b.classList.toggle("on", active === "stories"); });
    qa("[data-timeline]").forEach(function (b) { b.classList.toggle("on", active === "timeline"); });
    qa("[data-site]").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-site") === CFG.site);
    });
  }
  function bindView() {
    var input = q("#searchInput");
    if (input) {
      input.addEventListener("input", function () {
        state.q = input.value;
        syncSearchUrl();
        renderSearchResults();
      });
    }
  }
  function syncSearchUrl() {
    if (state.route !== "search" || !window.history || !history.replaceState) return;
    try {
      var u = new URL(location.href);
      if (state.q.trim()) u.searchParams.set("q", state.q.trim());
      else u.searchParams.delete("q");
      if (state.searchScope && state.searchScope !== "all") u.searchParams.set("scope", state.searchScope);
      else u.searchParams.delete("scope");
      history.replaceState(null, "", u.toString());
    } catch (e) {}
  }

  function card(r) {
    var img = imgOf(r);
    var typeTag = (r.collection === "paintings" && r.movement)
      ? loc(r, "movement")
      : (r.content_type && r.content_type !== "photograph" ? typeLabel(r) : "");
    var tags = '<span class="tag gold">' + esc(r.year || "") + "</span>" +
      (r.topic ? '<span class="tag">' + esc(tx("topic", r.topic)) + "</span>" : "") +
      (typeTag ? '<span class="tag">' + esc(typeTag) + "</span>" : "") +
      usageTag(r);
    var pic = img
      ? '<div class="pic"><img src="' + esc(img) + '" alt="' + esc(loc(r, "title")) + '" loading="lazy" decoding="async"></div>'
      : '<div class="pic"><div class="fallback">' + esc(t("common.links")) + "</div></div>";
    return '<a class="mcard' + (r.isLink ? " linkcard" : "") + '" href="' + esc(staticHref(r)) + '">' +
      pic + '<div class="meta"><div class="yr">' + esc(r.year || "—") + "</div><h3>" + esc(loc(r, "title")) + '</h3><div class="tags">' + tags + "</div></div></a>";
  }
  function masonry(rows, cls) {
    return '<div class="masonry ' + (cls || "") + '">' + rows.map(card).join("") + "</div>";
  }

  function dailyIndex(len) {
    var d = new Date();
    var seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    return (seed * 9301 + 49297) % 233280 % len;
  }
  function riverPicks(rows, skipId, count) {
    var sorted = rows.slice().sort(function (a, b) { return (a.year || 0) - (b.year || 0); });
    var out = [], step = Math.max(1, Math.floor(sorted.length / count));
    for (var i = 0; i < sorted.length && out.length < count; i += step) {
      if (sorted[i].id !== skipId) out.push(sorted[i]);
    }
    return out;
  }
  function themeStories() {
    var rows = SITE_STORIES;
    if (state.themeCollection) {
      rows = rows.filter(function (s) {
        return (s.photo_ids || []).some(function (id) {
          var r = byId(id);
          return r && r.collection === state.themeCollection;
        });
      });
    }
    return rows;
  }
  function storySpan(s) {
    if (s.date) {
      var eventYear = Number(String(s.date).slice(0, 4));
      if (isFinite(eventYear)) return { start: eventYear, end: eventYear };
    }
    var years = (s.photo_ids || []).map(function (id) {
      var r = byId(id);
      var y = r && Number(r.year);
      return isFinite(y) ? y : null;
    }).filter(function (y) { return y !== null; });
    if (!years.length) return null;
    return { start: Math.min.apply(null, years), end: Math.max.apply(null, years) };
  }
  function homeSearchBox() {
    return '<div class="home-search-wrap"><form class="home-search" data-search-form data-scope="' + esc(defaultSearchScope()) + '">' +
      '<input name="q" type="search" placeholder="' + esc(homeSearchLabel()) + '" autocomplete="off">' +
      '<button type="submit">' + esc(t("common.search")) + "</button></form>" +
      '<div class="home-search-hint">' + esc(t("search.hints")) + "</div></div>";
  }
  function viewToday() {
    var isPaint = CFG.site === "paint";
    var rows = filtered().filter(function (r) { return imgOf(r); });
    if (!rows.length) {
      return emptyState("sleepy", t("gallery.emptyTitle"), t("gallery.emptyText"));
    }
    var event = todayEvents()[0];
    var cover = event ? byId(event.cover) : null;
    var r = cover && imgOf(cover) ? cover : rows[dailyIndex(rows.length)];
    var d = new Date();
    var date = fmtDate(d);
    var related = riverPicks(rows, r.id, 8);
    return '<section class="today-hero">' +
      '<img class="today-hero-img" src="' + esc(heroImage(r)) + '" srcset="' + esc(heroSrcset(r)) + '" sizes="(max-width: 600px) 100vw, 500px" fetchpriority="high" alt="' + esc(loc(r, "title")) + '">' +
      '<div class="today-inner">' +
        '<div class="today-date">' + esc(date) + " · " + esc(t("brand.name")) + " · " + esc(isPaint ? t("home.todayPainting") : t("home.todayFrame")) + "</div>" +
        "<h1>" + esc(loc(r, "title")) + "</h1>" +
        '<p class="today-note">' + todayNoteHtml(r) + "</p>" +
        '<div class="today-meta"><span>' + esc(r.year || "") + "</span><span>" + esc(loc(r, "place") || tx("region", r.region)) + "</span><span>" + esc(tx("source_short", r.source_short)) + "</span>" + usageTag(r) + "</div>" +
        '<div class="today-actions"><a class="btn gold" href="' + esc(staticHref(r)) + '">' + esc(isPaint ? t("home.openPainting") : t("home.readFrame")) + '</a><button class="btn" data-lb="' + esc(r.id) + '">' + esc(t("common.zoom")) + '</button><a class="btn" href="' + esc(routeHref("gallery")) + '">' + esc(isPaint ? t("home.enterPaintAxis") : t("home.enterPhotoAxis")) + "</a></div>" +
      "</div></section>" +
      (dayStreamBlock(r.id) || masonry(related)) +
      '<div class="more-wrap"><a class="btn" href="' + esc(routeHref("gallery")) + '">' + esc(t("home.viewAll", { n: SITE_RECORDS.length })) + "</a></div>";
  }
  function dailyThemes() {
    var rows = themeStories().filter(function (s) { return !s.date; });
    return rows.length ? rows : themeStories();
  }
  function todayEvents() {
    var d = new Date();
    var mmdd = ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
    return themeStories().filter(function (s) {
      return String(s.date || "").slice(5, 10) === mmdd;
    }).sort(function (a, b) { return (a.today_rank || 1) - (b.today_rank || 1); });
  }
  function todayEvent() {
    var rows = todayEvents();
    return rows.length ? rows[0] : null;
  }
  function storyImage(s) {
    var r = byId(s.cover);
    if (r && imgOf(r)) return imgOf(r);
    var ids = s.photo_ids || [];
    for (var i = 0; i < ids.length; i++) {
      var x = byId(ids[i]);
      if (x && imgOf(x)) return imgOf(x);
    }
    return "";
  }
  function dayParts(s) {
    var m = String(s.date || "").slice(5, 10).split("-");
    return m.length === 2 ? { mm: +m[0], dd: +m[1] } : null;
  }
  function dayLabel(s) {
    var p = dayParts(s);
    if (!p) return "";
    if (isEn()) return ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][p.mm - 1] + " " + p.dd;
    return p.mm + "月" + p.dd + "日";
  }
  function homeDayItems() {
    var map = {}, order = [];
    themeStories().forEach(function (s) {
      var p = dayParts(s);
      if (!p || !storyImage(s)) return;
      var md = (p.mm < 10 ? "0" : "") + p.mm + "-" + (p.dd < 10 ? "0" : "") + p.dd;
      if (!map[md]) { map[md] = s; order.push(md); }
    });
    var now = new Date();
    var base = new Date(2024, now.getMonth(), now.getDate());
    var todayMd = ("0" + (now.getMonth() + 1)).slice(-2) + "-" + ("0" + now.getDate()).slice(-2);
    var out = [];
    for (var i = 1; i <= 183; i++) {
      [-i, i].forEach(function (off) {
        var d = new Date(base.getTime());
        d.setDate(base.getDate() + off);
        var md = ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
        if (md !== todayMd && map[md]) out.push({ s: map[md], md: md });
      });
    }
    if (out.length < 12) {
      order.forEach(function (md) {
        if (md !== todayMd && map[md] && !out.some(function (x) { return x.md === md; })) out.push({ s: map[md], md: md });
      });
    }
    return out;
  }
  function dayCardTitle(s) {
    var title = loc(s, "title") || s.id;
    return String(title)
      .replace(/^\d{4}年\d{1,2}月\d{1,2}日[：:]\s*/, "")
      .replace(/^[A-Z][a-z]+\s+\d{1,2},\s+\d{4}[：:]\s*/, "");
  }
  function recordDayCard(r) {
    var year = r.year ? String(r.year) : "";
    var kind = r.collection === "paintings" ? (isEn() ? "Painting" : "绘画") : (isEn() ? "Photography" : "摄影");
    return '<a class="day-card" href="' + esc(staticHref(r)) + '">' +
      '<div class="day-pic"><img src="' + esc(cardImage(recordImage(r))) + '" alt="' + esc(loc(r, "title")) + '" loading="lazy"></div>' +
      '<div class="day-copy"><span class="day-date">' + esc(year || "—") + ' <i class="day-kind">' + esc(kind) + "</i></span><h3>" + esc(loc(r, "title") || r.id) + "</h3></div></a>";
  }
  function dayCard(item) {
    if (item.r) return recordDayCard(item.r);
    var s = item.s;
    var title = dayCardTitle(s);
    var year = String(s.date || "").slice(0, 4);
    return '<a class="day-card" href="' + esc(storyStaticHref(s)) + '">' +
      '<div class="day-pic"><img src="' + esc(cardImage(storyImage(s))) + '" alt="' + esc(loc(s, "title")) + '" loading="lazy"></div>' +
      '<div class="day-copy"><span class="day-date">' + esc(dayLabel(s)) + (year ? ' <b>' + esc(year) + "</b>" : "") + ' <i class="day-kind">' + esc(isEn() ? "Photography" : "摄影") + "</i></span><h3>" + esc(title) + "</h3></div></a>";
  }
  function homeItemYear(item) {
    if (item.r) return Number(item.r.year) || 0;
    var s = item.s;
    return Number(String(s.date || "").slice(0, 4)) || 0;
  }
  function homeStreamItems(skipId) {
    var items = homeDayItems();
    if (CFG.site === "main") {
      var paintings = filtered().filter(function (r) {
        return r.collection === "paintings" && imgOf(r) && r.id !== skipId;
      }).map(function (r) { return { r: r }; });
      items = items.concat(paintings);
      var photos = items.filter(function (x) { return !x.r; }).sort(function (a, b) { return homeItemYear(b) - homeItemYear(a); });
      var paints = items.filter(function (x) { return !!x.r; }).sort(function (a, b) { return homeItemYear(b) - homeItemYear(a); });
      var mixed = [], p = 0, q = 0;
      while (p < photos.length || q < paints.length) {
        for (var k = 0; k < 2 && p < photos.length; k++) mixed.push(photos[p++]);
        if (q < paints.length) mixed.push(paints[q++]);
      }
      return mixed;
    }
    if (items.length) return items;
    if (CFG.site !== "paint") return [];
    return filtered().filter(function (r) { return imgOf(r) && r.id !== skipId; })
      .map(function (r) { return { r: r }; });
  }
  function dayStreamBlock(skipId) {
    var items = homeStreamItems(skipId);
    if (!items.length) return "";
    state.dayItems = items;
    state.dayVisible = Math.min(18, items.length);
    return '<section class="day-stream" id="dayStream"><div class="day-masonry" id="dayMasonry">' +
      items.slice(0, state.dayVisible).map(dayCard).join("") + "</div></section>";
  }
  function appendDayCards() {
    var wall = q("#dayMasonry");
    if (!wall || !state.dayItems || !state.dayItems.length) return;
    if (state.dayVisible >= state.dayItems.length) return;
    var next = state.dayItems.slice(state.dayVisible, state.dayVisible + 18);
    state.dayVisible += next.length;
    wall.insertAdjacentHTML("beforeend", next.map(dayCard).join(""));
  }
  function maybeDayLoad() {
    if (state.route !== "today") return;
    if (!q("#dayMasonry")) return;
    var sc = q(".app-scroll");
    var near = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 560;
    if (sc && sc.scrollHeight > sc.clientHeight + 8) {
      near = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 560;
    }
    if (near) appendDayCards();
  }
  function renderThemeFeature(s, isEvent) {
    var cover = byId(s.cover);
    var d = new Date();
    var date = fmtDate(d);
    var label = isEvent ? t("home.historyToday") : t("home.todayTheme");
    var dateText = isEvent ? (s.date_label || s.date || date) : date;
    var intro = loc(s, "subtitle") || String(loc(s, "intro") || "").split(/\n\s*\n/)[0] || "";
    var seen = {}, preview = [];
    [s.cover].concat(s.photo_ids || []).forEach(function (id) {
      if (!id || seen[id] || preview.length >= 4) return;
      var r = byId(id);
      if (!r || !imgOf(r)) return;
      seen[id] = 1; preview.push(r);
    });
    var chapters = (s.chapters || []).map(function (ch) { return loc(ch, "title"); }).filter(Boolean);
    var meta = isEvent
      ? '<span>' + esc(dateText) + "</span><span>" + esc(loc(s, "place")) + "</span>"
      : '<span>' + esc(tagsText(s)) + "</span>";
    return '<section class="today-hero theme-hero">' +
      '<img class="today-hero-img" src="' + esc(cover ? heroImage(cover) : (preview[0] ? heroImage(preview[0]) : "")) + '" srcset="' + esc(cover ? heroSrcset(cover) : (preview[0] ? heroSrcset(preview[0]) : "")) + '" sizes="(max-width: 600px) 100vw, 500px" fetchpriority="high" alt="' + esc(loc(s, "title")) + '">' +
      '<div class="today-inner">' +
        '<div class="today-date">' + esc(dateText) + " · " + esc(label) + " · " + esc(t("brand.name")) + "</div>" +
        "<h1>" + esc(loc(s, "title")) + "</h1>" +
        '<h2 class="sr-only"><span data-l="zh">今日条目</span><span data-l="en">Today\u2019s entries</span></h2>' +
        '<p class="today-note">' + esc(intro) + "</p>" +
        '<div class="today-meta">' + meta + "</div>" +
        '<div class="today-actions"><a class="btn gold" href="' + esc(storyStaticHref(s)) + '">' + esc(isEvent ? t("home.readEvent") : t("home.readTheme")) + '</a><a class="btn" href="' + esc(routeHref("stories")) + '">' + esc(t("story.allStories")) + '</a><a class="btn" href="' + esc(routeHref("timeline")) + '">' + esc(t("timeline.title")) + "</a></div>" +
      "</div></section>";
  }
  function viewTodayTheme() {
    var stories = dailyThemes();
    if (!stories.length) return viewToday();
    return renderThemeFeature(stories[dailyIndex(stories.length)], false) + dayStreamBlock();
  }
  function viewTodayEvent() {
    var rows = todayEvents();
    var s = rows.length ? rows[0] : null;
    if (!s) return viewTodayTheme();
    return renderThemeFeature(s, true) + dayStreamBlock();
  }
  function viewTimeline() {
    var items = themeStories().map(function (s) {
      return { s: s, span: storySpan(s) };
    }).filter(function (x) { return x.span; }).sort(function (a, b) {
      return a.span.start - b.span.start;
    });
    if (!items.length) {
      return emptyState("curious", t("timeline.emptyTitle"), t("timeline.emptyText"));
    }
    return '<div class="section"><div class="section-head"><h2>' + esc(t("timeline.title")) + '</h2><span class="sub">' + esc(t("timeline.sub", { n: items.length })) + '</span></div></div>' +
      '<div class="timeline">' + items.map(function (x) {
        var cover = byId(x.s.cover);
        var img = cover ? imgOf(cover) : "";
        var span = x.span.start + (x.span.end !== x.span.start ? "–" + x.span.end : "");
        return '<a class="tl-item" href="' + esc(storyStaticHref(x.s)) + '">' +
          '<div class="tl-year">' + esc(span) + '</div>' +
          '<div class="tl-pic" style="background-image:url(\'' + esc(img) + '\')"></div>' +
          '<div class="tl-body"><div class="status">' + esc(isEn() ? (x.s.type_en || "Story") : (x.s.type || "长文")) + '</div><h3>' + esc(loc(x.s, "title")) + '</h3><p>' + esc(loc(x.s, "subtitle")) + '</p>' +
          '</div></a>';
      }).join("") + "</div>";
  }

  function viewGallery() {
    var rows = filtered();
    var shown = rows.slice(0, state.visible);
    var chips = collectionChips(state.filter.collection, "collection") + topicChips(state.filter.topic);
    var mchips = CFG.site === "paint" ? movementChips(state.filter.movement) : "";
    return '<div class="section"><div class="section-head"><h2>' + esc(CFG.site === "photo" ? t("gallery.photoTitle") : CFG.site === "paint" ? t("gallery.paintTitle") : t("gallery.mainTitle")) + '</h2></div></div>' +
      '<div class="chips">' + chips + "</div>" +
      (mchips ? '<div class="chips chips-movement">' + mchips + "</div>" : "") +
      (state.mode === "commercial" ? '<div class="notice">' + esc(t("gallery.commercialNotice")) + "</div>" : "") +
      (shown.length ? masonry(shown) : emptyState("sleepy", t("gallery.emptyTitle"), t("gallery.emptyText"))) +
      (state.visible < rows.length ? '<div class="more-wrap"><button class="btn" id="loadMore">' + esc(t("common.loadMore")) + "</button></div>" : '<div class="endnote">' + esc(t("common.end")) + "</div>");
  }

  function viewStories() {
    var stories = themeStories();
    if (!stories.length) {
      return emptyState("think", t("stories.emptyTitle"), t("stories.emptyText"));
    }
    return '<div class="section"><div class="section-head"><h2>' + esc(t("stories.title")) + '</h2><span class="sub">' + esc(t("stories.sub")) + '</span></div></div>' +
      '<div class="chips"><a class="chip" href="' + esc(timelineHref()) + '">' + esc(t("stories.byTimeline")) + "</a></div>" +
      stories.map(function (s) {
        var cover = byId(s.cover);
        var img = cover ? imgOf(cover) : "";
        var type = isEn() ? (s.type_en || "Story") : (s.type || "长文");
        var status = type + (s.date ? " · " + s.date : "") + (s.status === "published" ? " · " + t("stories.published") : "");
        return '<a class="story-card" href="' + esc(storyStaticHref(s)) + '">' +
          '<div class="pic" style="background-image:url(\'' + esc(img) + '\')"></div>' +
          '<div class="body"><div class="status">' + esc(status) + "</div><h3>" + esc(loc(s, "title")) + "</h3><p>" + esc(loc(s, "subtitle")) + '</p></div></a>';
      }).join("");
  }

  function storyItem(r, caption) {
    return '<a class="story-item" href="' + esc(staticHref(r)) + '">' +
      '<img src="' + esc(imgOf(r)) + '" alt="' + esc(loc(r, "title")) + '" loading="lazy">' +
      '<div class="cap"><b>' + esc(loc(r, "title")) + "</b>" +
      (caption ? '<span class="caption-text">' + esc(caption) + "</span>" : "") +
      '<span class="caption-meta">' + esc(r.year || "") + " · " + esc(loc(r, "place") || tx("region", r.region)) + " · " + esc(tx("source_short", r.source_short)) + "</span></div></a>";
  }
  function searchRows(scope) {
    var rows = SITE_RECORDS.filter(modeOk);
    if (scope === "photos") rows = rows.filter(function (r) { return r.collection === "photos"; });
    else if (scope === "paintings") rows = rows.filter(function (r) { return r.collection === "paintings"; });
    else if (scope === "objects") rows = rows.filter(function (r) { return r.collection === "objects" || r.collection === "links"; });
    else if (scope === "themes") rows = [];
    return rows;
  }
  var SEARCH_SYNONYMS = {
    "照片": ["摄影", "影像", "photo", "photograph"],
    "摄影": ["照片", "影像", "photo", "photograph"],
    "绘画": ["画", "油画", "painting", "paint"],
    "画": ["绘画", "油画", "painting", "paint"],
    "灾难": ["灾害", "火灾", "火山", "disaster", "fire", "volcano"],
    "灾害": ["灾难", "火灾", "火山", "disaster", "fire", "volcano"],
    "火灾": ["大火", "灾难", "fire", "great fire"],
    "太空": ["宇宙", "航天", "space", "cosmos"],
    "宇宙": ["太空", "航天", "space", "cosmos"],
    "铁路": ["火车", "铁道", "rail", "railway", "train"],
    "火车": ["铁路", "铁道", "rail", "railway", "train"],
    "城市": ["都市", "街道", "city", "urban"],
    "夜": ["夜晚", "夜景", "night"],
    "宗教": ["信仰", "神", "religion", "faith"],
    "photo": ["photograph", "摄影", "照片"],
    "photograph": ["photo", "摄影", "照片"],
    "painting": ["paint", "绘画", "画"],
    "paint": ["painting", "绘画", "画"],
    "space": ["cosmos", "太空", "宇宙"],
    "cosmos": ["space", "太空", "宇宙"],
    "rail": ["railway", "train", "铁路", "火车"],
    "railway": ["rail", "train", "铁路", "火车"],
    "city": ["urban", "城市", "都市"],
    "night": ["夜", "夜晚", "夜景"],
    "disaster": ["灾难", "灾害", "火灾", "火山"],
    "死亡与记忆": ["死亡", "记忆", "death", "memory"],
    "信仰与仪式": ["信仰", "仪式", "faith", "ritual"],
    "西亚北非": ["西亚", "北非", "west asia", "north africa"],
    "西亚·北非": ["西亚", "北非", "west asia", "north africa"]
  };
  function searchTermGroups(qtext) {
    return qtext.toLowerCase().trim().split(/\s+/).filter(Boolean).map(function (term) {
      return [term].concat(SEARCH_SYNONYMS[term] || []);
    });
  }
  function search(qtext, scope) {
    var groups = searchTermGroups(qtext);
    var terms = qtext.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!groups.length) return [];
    var rows = searchRows(scope).filter(function (r) {
      var ix = (SEARCH_INDEX.records || {})[r.id];
      var txt = String(
        ix ? (isEn() ? (ix[1] || ix[0]) : ix[0]) :
          (isEn() ? (r.search_text_en || r.search_text) : r.search_text)
      ).toLowerCase();
      return groups.every(function (group) {
        return group.some(function (term) { return txt.indexOf(term) >= 0; });
      });
    });
    return rows.map(function (r) {
      var title = String(loc(r, "title") || "").toLowerCase();
      var score = 0;
      if (title === qtext.toLowerCase()) score += 20;
      if (title.indexOf(qtext.toLowerCase()) >= 0) score += 10;
      terms.forEach(function (term) {
        if (title.indexOf(term) >= 0) score += 5;
        if (String(loc(r, "place")).toLowerCase().indexOf(term) >= 0) score += 3;
        if (String(r.creator || "").toLowerCase().indexOf(term) >= 0) score += 3;
        if (String(tx("topic", r.topic)).toLowerCase().indexOf(term) >= 0) score += 2;
        if (String(tx("region", r.region)).toLowerCase().indexOf(term) >= 0) score += 2;
        if (String(r.year) === term) score += 4;
      });
      return { r: r, score: score };
    }).sort(function (a, b) { return b.score - a.score || (b.r.year || 0) - (a.r.year || 0); })
      .map(function (x) { return x.r; });
  }
  function themeSearchText(s) {
    var ix = (SEARCH_INDEX.stories || {})[s.id];
    if (ix) return String((isEn() ? (ix[1] || ix[0]) : ix[0]) || "").toLowerCase();
    var chapterText = (s.chapters || []).map(function (ch) {
      return loc(ch, "title") + " " + loc(ch, "text");
    }).join(" ");
    return [loc(s, "title"), loc(s, "subtitle"), loc(s, "intro"), chapterText,
      isEn() ? (s.themes_en || []).join(" ") : (s.themes || []).join(" ")].join(" ").toLowerCase();
  }
  function searchThemes(qtext) {
    var groups = searchTermGroups(qtext);
    var terms = qtext.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!groups.length) return [];
    return themeStories().filter(function (s) {
      var txt = themeSearchText(s);
      return groups.every(function (group) {
        return group.some(function (term) { return txt.indexOf(term) >= 0; });
      });
    }).map(function (s) {
      var title = String(loc(s, "title") || "").toLowerCase();
      var score = title.indexOf(qtext.toLowerCase()) >= 0 ? 10 : 0;
      terms.forEach(function (term) { if (title.indexOf(term) >= 0) score += 5; });
      return { s: s, score: score };
    }).sort(function (a, b) { return b.score - a.score; }).slice(0, 20).map(function (x) { return x.s; });
  }
  function resultRow(r) {
    var img = imgOf(r);
    var thumb = img
      ? '<img class="thumb" src="' + esc(img) + '" alt="' + esc(loc(r, "title")) + '" loading="lazy">'
      : '<div class="thumb ph">' + esc(t("common.links")) + "</div>";
    return '<a class="result" href="' + esc(staticHref(r)) + '">' + thumb +
      '<div><h3>' + esc(loc(r, "title")) + "</h3><div class=\"meta\"><b>" + esc(r.year || "") + "</b><span>" + esc(loc(r, "place") || tx("region", r.region)) + "</span><span>" + esc(tx("topic", r.topic)) + "</span>" +
      (r.content_type && r.content_type !== "photograph" ? "<span>" + esc(typeLabel(r)) + "</span>" : "") +
      "<span>" + esc(tx("source_short", r.source_short)) + "</span>" + usageTag(r) + "</div></div></a>";
  }
  function themeResultRow(s) {
    var cover = byId(s.cover);
    var img = cover ? imgOf(cover) : "";
    var thumb = img
      ? '<img class="thumb" src="' + esc(img) + '" alt="' + esc(loc(s, "title")) + '" loading="lazy">'
      : '<div class="thumb ph">' + esc(t("common.themes")) + "</div>";
    return '<a class="result theme-result" href="' + esc(storyStaticHref(s)) + '">' + thumb +
      '<div><h3>' + esc(loc(s, "title")) + '</h3><div class="meta"><b>' + esc(isEn() ? (s.type_en || "Story") : (s.type || "长文")) + "</b><span>" +
      (s.count || 0) + " " + esc(t("common.frames")) + "</span><span>" + esc(tagsText(s)) +
      "</span></div><p>" + esc(loc(s, "subtitle")) + "</p></div></a>";
  }
  function searchScopeChips() {
    var defs = [["all", t("common.all")], ["themes", t("common.themes")], ["photos", t("common.photos")], ["paintings", t("common.paintings")], ["objects", t("common.objects")]];
    return defs.map(function (d) {
      return '<button class="chip ' + (state.searchScope === d[0] ? "on" : "") + '" data-filter="searchScope" data-value="' + d[0] + '">' + esc(d[1]) + "</button>";
    }).join("");
  }
  function viewSearch() {
    return '<h1 class="search-h1">' + esc(t("search.title")) + "</h1>" +
      '<h2 class="sr-only"><span data-l="zh">搜索结果</span><span data-l="en">Search results</span></h2>' +
      '<div class="searchbar"><div class="search-field">' + ICONS.search +
      '<input id="searchInput" type="search" placeholder="' + esc(t("search.ph.main")) + '" value="' + esc(state.q) + '" autocomplete="off">' +
      '<button class="search-clear" id="searchClear">' + esc(t("common.clear")) + "</button></div></div>" +
      '<div class="chips" id="searchChips">' + searchScopeChips() + "</div>" +
      '<div class="search-hint" id="searchCount">' + esc(t("search.start")) + "</div>" +
      '<div class="results" id="searchResults"></div>';
  }
  function recentSearchHtml() {
    var scope = state.searchScope || "all";
    var stories = (scope === "all" || scope === "themes") ? themeStories().slice(0, 4) : [];
    var rows = scope === "themes" ? [] : searchRows(scope).slice(0, 8);
    var html = "";
    if (stories.length) {
      html += '<div class="recent-topics"><div class="eyebrow" style="margin-bottom:8px">' + esc(t("common.themes")) + "</div></div>" +
        stories.map(themeResultRow).join("");
    }
    if (rows.length) {
      html += '<div class="recent-topics"><div class="eyebrow" style="margin-bottom:2px">' + esc(t("search.recent")) + "</div></div>" +
        rows.map(resultRow).join("");
    }
    return html || emptyState("curious", t("search.emptyTitle"), t("search.emptyText"));
  }
  function renderSearchResults() {
    var box = q("#searchResults");
    var cnt = q("#searchCount");
    if (!box) return;
    var txt = state.q.trim();
    var scope = state.searchScope || "all";
    if (!txt) {
      if (cnt) cnt.textContent = t("search.start");
      box.innerHTML = recentSearchHtml();
      bindSearchTopics();
      return;
    }
    var themes = (scope === "all" || scope === "themes") ? searchThemes(txt) : [];
    var rows = scope === "themes" ? [] : search(txt, scope);
    var total = themes.length + rows.length;
    if (cnt) cnt.textContent = total ? t("search.found", { n: total }) : t("search.noMatch");
    if (!total) {
      var tips = isEn() ? ["disaster", "space", "rail", "night", "portrait"] : ["灾难", "太空", "铁路", "夜", "肖像"];
      box.innerHTML = emptyState("surprised", t("search.noMatchTitle"), t("search.noMatchText")) +
        '<div class="search-suggest"><div class="eyebrow">' + esc(t("search.try")) + "</div>" +
        tips.map(function (x) { return '<button class="chip" data-search-topic="' + esc(x) + '">' + esc(x) + "</button>"; }).join("") +
        "</div>";
      bindSearchTopics();
      return;
    }
    var html = "";
    if (themes.length) {
      html += '<div class="result-group"><div class="result-group-head"><span>' + esc(t("common.themes")) + "</span><span>" + themes.length + " " + esc(t("common.items")) + "</span></div>" +
        themes.slice(0, 8).map(themeResultRow).join("") + "</div>";
    }
    var groups = [["photos", t("common.photos")], ["paintings", t("common.paintings")], ["objects", t("common.objects") + " / " + t("common.links")]];
    groups.forEach(function (g) {
      var list = rows.filter(function (r) {
        if (g[0] === "objects") return r.collection === "objects" || r.collection === "links";
        return r.collection === g[0];
      });
      if (!list.length) return;
      html += '<div class="result-group"><div class="result-group-head"><span>' + esc(g[1]) + "</span><span>" + list.length + " " + esc(t("common.items")) + "</span></div>" +
        list.slice(0, 8).map(resultRow).join("") + "</div>";
    });
    box.innerHTML = html;
  }
  function bindSearchTopics() {
    qa("[data-search-topic]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.q = b.getAttribute("data-search-topic");
        var input = q("#searchInput"); if (input) input.value = state.q;
        syncSearchUrl();
        renderSearchResults();
      });
    });
  }
  function syncSearchChips() {
    var box = q("#searchChips");
    if (!box) return;
    box.innerHTML = searchScopeChips();
  }

  function viewSimple(title, text, expr) {
    return '<div class="section simple-page"><div class="simple-mark">' + leafIcon(expr || "calm", 74, "about-mark") +
      '</div><div class="section-head"><h2>' + esc(title) + '</h2><span class="sub">' + esc(t("brand.name")) + "</span></div><p class=\"muted\" style=\"font-size:13px;line-height:1.9\">" + esc(text) + "</p></div>";
  }
  function footerHomeLabel() {
    return '<span data-l="zh">出尘入画</span><span data-l="en"><span class="sf-brand-long">Frame &amp; Grain</span><span class="sf-brand-short">Frame</span></span>';
  }

  function appFoot() {
    var links = navItems().map(function (n, i) {
      var label = i === 0 ? footerHomeLabel() : esc(navLabel(n));
      return '<a href="' + esc(itemHref(n)) + '">' + label + "</a>";
    }).join("");
    var library = '<a href="https://chenhua.net/images/">' + (isEn() ? "Image Library" : "图片库") + "</a>";
    var navAria = isEn() ? "Site navigation" : "站内导航";
    return '<footer class="site-foot">' +
      '<div class="sf-left"><span data-l="zh">© 2026 尘画 · <a href="https://chenhua.net">chenhua.net</a></span>' +
      '<span data-l="en">© 2026 <span class="sf-brand-long">Frame &amp; Grain</span><span class="sf-brand-short">Frame</span> · <a href="https://chenhua.net">chenhua.net</a></span></div>' +
      '<nav class="sf-nav" aria-label="' + navAria + '">' + links + library + "</nav>" +
      '<div class="sf-right"><a href="' + esc(routeHref("legal")) + '">' + (isEn() ? "Disclaimer" : "免责条款") + "</a></div>" +
      "</footer>";
  }

  function currentList() {
    if (state.route === "search" && state.q.trim()) return search(state.q).filter(function (r) { return imgOf(r); });
    return filtered().filter(function (r) { return imgOf(r); });
  }
  function openLightbox(id) {
    var list = currentList();
    var idx = list.findIndex(function (r) { return r.id === id; });
    if (idx < 0) { list = [byId(id)].filter(Boolean); idx = 0; }
    state.lb.items = list;
    state.lb.index = Math.max(0, idx);
    renderLightbox();
    q("#lightbox").classList.add("on");
  }
  function renderLightbox() {
    var it = state.lb.items[state.lb.index];
    if (!it) return;
    q("#lbImg").src = imgOf(it);
    q("#lbImg").alt = loc(it, "title") || "";
    q("#lbCap").innerHTML = "<b>" + esc(loc(it, "title")) + "</b>" + esc(it.year || "") + " · " + esc(loc(it, "place") || tx("region", it.region)) + " · " + esc(tx("source_short", it.source_short));
    q("#lbCount").textContent = (state.lb.index + 1) + " / " + state.lb.items.length;
  }
  function stepLightbox(d) {
    if (!state.lb.items.length) return;
    state.lb.index = (state.lb.index + d + state.lb.items.length) % state.lb.items.length;
    renderLightbox();
  }
  function closeLightbox() {
    var lb = q("#lightbox"); if (lb) lb.classList.remove("on");
  }
  function copyText(text) {
    var done = function () { toast(t("common.copied")); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text); done(); });
    } else { fallbackCopy(text); done(); }
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }
  function toast(msg) {
    var el = q("#toast");
    if (!el) return;
    el.textContent = msg; el.classList.add("on");
    clearTimeout(el._tm);
    el._tm = setTimeout(function () { el.classList.remove("on"); }, 1600);
  }

  function boot() {
    state.lang = document.documentElement.getAttribute("data-lang") === "en" ? "en" : "zh";
    state.theme = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    if (isEn()) {
      document.documentElement.lang = "en";
      var dt = document.body.getAttribute("data-title-en");
      if (dt) document.title = dt;
      var dd = document.body.getAttribute("data-desc-en");
      var dm = document.querySelector('meta[name="description"]');
      if (dd && dm) dm.setAttribute("content", dd);
    }
    var params = new URLSearchParams(location.search);
    if (params.get("phone")) document.body.classList.add("phone-mode");
    if (params.get("q")) state.q = params.get("q");
    if (params.get("collection")) state.themeCollection = params.get("collection");
    state.searchScope = params.get("scope") || defaultSearchScope();
    if (["all", "themes", "photos", "paintings", "objects"].indexOf(state.searchScope) < 0) {
      state.searchScope = defaultSearchScope();
    }
    shell();
    syncMode();
    renderView();
    applyTheme(state.theme);
    app.addEventListener("click", function (e) {
      if (e.target.id === "loadMore") {
        state.visible += 30;
        renderView();
      }
    });
    app.addEventListener("click", function (e) {
      if (e.target.id === "searchClear") {
        state.q = ""; var input = q("#searchInput"); if (input) { input.value = ""; input.focus(); }
        syncSearchUrl();
        renderSearchResults();
      }
    });
    if (state.route === "search") renderSearchResults();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
