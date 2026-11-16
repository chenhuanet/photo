(function () {
  "use strict";
  const CFG = window.SITE_CONFIG || {};
  const BUNDLE = window.CHENHUA_BUNDLE || { records: [], stories: [], stats: {} };
  const app = document.getElementById("app");
  const state = {
    mode: "noncommercial",
    route: "today",
    arg: null,
    visible: 30,
    q: "",
    searchCollection: "all",
    searchScope: "",
    themeCollection: "",
    filter: { collection: "all", topic: "all" },
    usage: "all",
    lb: { items: [], index: 0 },
    sheet: false,
  };

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
  function imgOf(r) { return r.preview_image || r.image || ""; }
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
    return rows.sort(function (a, b) { return (b.year || 0) - (a.year || 0); });
  }
  function byId(id) { return SITE_RECORDS.filter(function (r) { return r.id === id; })[0]; }
  function usageTag(r) {
    var c = (r.usage_code || "").toLowerCase();
    return '<span class="tag ' + c + '">' + esc(r.usage_short || r.usage_code) + "</span>";
  }
  function typeLabel(r) {
    return {
      painting: "绘画", print: "版画", drawing: "素描", postcard: "明信片",
      object: "器物", document: "文书", photograph: "照片"
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
  function topicChips(active, handlerAttr) {
    var counts = {};
    SITE_RECORDS.forEach(function (r) { if (r.topic) counts[r.topic] = (counts[r.topic] || 0) + 1; });
    var topics = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 10);
    var out = ['<button class="chip ' + (active === "all" ? "on" : "") + '" data-filter="topic" data-value="all">全部主题</button>'];
    topics.forEach(function (t) {
      out.push('<button class="chip ' + (active === t ? "on" : "") + '" data-filter="topic" data-value="' + esc(t) + '">' + esc(t) + "</button>");
    });
    return out.join("");
  }
  function collectionChips(active, key) {
    if (!CFG.collections || CFG.collections.length < 1) return "";
    var f = key === "searchCollection" ? "searchCollection" : "collection";
    var out = ['<button class="chip ' + (active === "all" ? "on" : "") + '" data-filter="' + f + '" data-value="all">全部</button>'];
    if (CFG.collections.indexOf("photos") >= 0) {
      out.push('<button class="chip ' + (active === "photos" ? "on" : "") + '" data-filter="' + f + '" data-value="photos">摄影</button>');
    }
    if (CFG.collections.indexOf("paintings") >= 0) {
      out.push('<button class="chip ' + (active === "paintings" ? "on" : "") + '" data-filter="' + f + '" data-value="paintings">绘画</button>');
    }
    if (CFG.collections.indexOf("links") >= 0) {
      out.push('<button class="chip ' + (active === "links" ? "on" : "") + '" data-filter="' + f + '" data-value="links">仅外链</button>');
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
    more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  };
  function navItems() {
    return (CFG.nav || []).filter(function (n) { return n && n.label; });
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
    if (CFG.site === "photo") return "在摄影档案中搜索";
    if (CFG.site === "paint") return "在绘画作品中搜索";
    return "搜主题、人物、地点、年代";
  }
  function itemHref(n) {
    if (n.search) return searchUrl("", defaultSearchScope());
    if (n.themes) return themeHref();
    if (n.timeline) return timelineHref();
    return n.href || routeHref(n.route || "today");
  }
  function wordmark() {
    return '<span class="wm"><span class="wm-lite">出</span><span class="wm-strong">尘</span>' +
      '<span class="wm-lite">入</span><span class="wm-strong">画</span></span>';
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
      return '<a class="tab" href="' + esc(itemHref(n)) + '"' + attr + ">" +
        (ICONS[n.icon] || "") + "<span>" + esc(n.label) + "</span></a>";
    }).join("");
    var desk = items.map(function (n) {
      var attr = "";
      if (n.route) attr += ' data-desk="' + esc(n.route) + '"';
      if (n.themes) attr += ' data-themes="1"';
      if (n.timeline) attr += ' data-timeline="1"';
      if (n.site) attr += ' data-site="' + esc(n.site) + '"';
      return '<a' + (n.wideOnly ? ' class="wide-only"' : "") + ' href="' + esc(itemHref(n)) + '"' + attr + ">" + esc(n.label) + "</a>";
    }).join("");
    app.innerHTML =
      '<header class="appbar">' +
        '<a class="brand" href="' + esc(brandHref()) + '">' + wordmark() + '<span class="sub">' + esc(CFG.sub || "尘归尘，画归画") + "</span></a>" +
        '<nav class="desknav">' + desk + "</nav>" +
        '<div class="right">' +
          '<button class="modebtn" data-mode="toggle">非商用</button>' +
          '<button class="iconbtn" data-nav="search" aria-label="搜索">' + ICONS.search + "</button>" +
          '<button class="iconbtn" data-more="1" aria-label="更多">' + ICONS.more + "</button>" +
        "</div>" +
      "</header>" +
      '<main class="app-scroll"><div id="view" class="view"></div></main>' +
      '<nav class="tabbar" style="grid-template-columns:repeat(' + Math.max(1, mobile.length) + ',1fr)">' + nav + "</nav>" +
      '<div class="backdrop" id="backdrop" data-close-sheet="1"></div>' +
      '<div class="sheet" id="sheet"></div>' +
      '<div class="lightbox" id="lightbox">' +
        '<div class="lb-top"><span class="t" id="lbCount">—</span><button class="iconbtn" data-lb-close="1" aria-label="关闭">' + ICONS.close + "</button></div>" +
        '<div class="lb-stage" id="lbStage"><img id="lbImg" alt=""></div>' +
        '<div class="lb-nav"><button class="btn" data-lb-prev="1">上一帧</button><button class="btn" data-lb-next="1">下一帧</button></div>' +
        '<div class="lb-cap" id="lbCap"></div>' +
      "</div>" +
      '<div class="toast" id="toast"></div>';
    bindGlobal();
  }

  function bindGlobal() {
    app.addEventListener("click", function (e) {
      var t = e.target.closest("[data-nav],[data-mode],[data-more],[data-filter],[data-lb],[data-lb-close],[data-lb-prev],[data-lb-next],[data-copy],[data-close-sheet],[data-sheet],[data-phone],[data-usage]");
      if (!t) return;
      if (t.hasAttribute("data-nav")) {
        e.preventDefault(); navigate(t.getAttribute("data-nav"));
      } else if (t.hasAttribute("data-mode")) {
        state.mode = state.mode === "commercial" ? "noncommercial" : "commercial";
        syncMode(); renderView();
      } else if (t.hasAttribute("data-more")) {
        openSheet();
      } else if (t.hasAttribute("data-close-sheet")) {
        closeSheet();
      } else if (t.hasAttribute("data-phone")) {
        var u = new URL(location.href);
        if (u.searchParams.get("phone")) u.searchParams.delete("phone");
        else u.searchParams.set("phone", "1");
        location.href = u.toString();
      } else if (t.hasAttribute("data-sheet")) {
        var to = t.getAttribute("data-sheet");
        closeSheet();
        if (to === "phone") {
          var u2 = new URL(location.href);
          u2.searchParams.set("phone", "1");
          location.href = u2.toString();
        } else if (to.indexOf("http") === 0 || to.charAt(0) === "/") {
          location.href = to;
        } else {
          navigate(to);
        }
      } else if (t.hasAttribute("data-filter")) {
        var key = t.getAttribute("data-filter");
        var val = t.getAttribute("data-value");
        if (key === "collection") state.filter.collection = val;
        if (key === "topic") state.filter.topic = val;
        if (key === "searchCollection") { state.searchCollection = val; renderSearchResults(); syncSearchChips(); return; }
        if (key === "searchScope") { state.searchScope = val; syncSearchUrl(); renderSearchResults(); syncSearchChips(); return; }
        if (key === "usage") { state.usage = val; renderView(); return; }
        state.visible = 30; renderView();
      } else if (t.hasAttribute("data-lb")) {
        e.preventDefault(); openLightbox(t.getAttribute("data-lb"));
      } else if (t.hasAttribute("data-lb-close")) {
        closeLightbox();
      } else if (t.hasAttribute("data-lb-prev")) {
        stepLightbox(-1);
      } else if (t.hasAttribute("data-lb-next")) {
        stepLightbox(1);
      } else if (t.hasAttribute("data-copy")) {
        copyText(t.getAttribute("data-copy"));
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
      if (e.key === "Escape") { closeLightbox(); closeSheet(); }
      if (q("#lightbox").classList.contains("on")) {
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

  function syncMode() {
    var b = q(".modebtn");
    if (!b) return;
    b.textContent = state.mode === "commercial" ? "商用" : "非商用";
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
    else if (r.name === "rights") html = viewSimple("授权", "本站只做索引与展示，不主张图片权利。每张图的许可以记录页为准；商用前请逐张核对源站。U4 仅非商用，U5 仅外链。完整条款见「法律声明」。");
    else if (r.name === "about") html = viewSimple("关于", "尘画，出尘入画；尘归尘，画归画。以图为史，记录人间的大事与小事。内容来自开放馆藏；采集、复核、策展三层都写日志。图片二进制不进内容仓，站点只引用世纪图片站。");
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
    var tags = '<span class="tag gold">' + esc(r.year || "") + "</span>" +
      (r.topic ? '<span class="tag">' + esc(r.topic) + "</span>" : "") +
      (r.content_type && r.content_type !== "photograph" ? '<span class="tag">' + esc(typeLabel(r)) + "</span>" : "") +
      usageTag(r);
    var pic = img
      ? '<div class="pic"><img src="' + esc(img) + '" alt="' + esc(r.title) + '" loading="lazy" decoding="async"></div>'
      : '<div class="pic"><div class="fallback">仅外链</div></div>';
    return '<a class="mcard' + (r.isLink ? " linkcard" : "") + '" href="' + esc(staticHref(r)) + '">' +
      pic + '<div class="meta"><div class="yr">' + esc(r.year || "—") + "</div><h3>" + esc(r.title) + "</h3><div class=\"tags\">" + tags + "</div></div></a>";
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
      '<button type="submit">搜索</button></form>' +
      '<div class="home-search-hint">试试：1906 · 巴黎 · 阿波罗 · 无名者</div></div>';
  }
  function viewToday() {
    var isPaint = CFG.site === "paint";
    var rows = filtered().filter(function (r) { return imgOf(r); });
    if (!rows.length) {
      return '<div class="empty"><b>绘画档案筹备中</b>下一阶段接入绘画内容后，这里会出现今日一画与绘画长河。</div>';
    }
    var r = rows[dailyIndex(rows.length)];
    var d = new Date();
    var date = (d.getMonth() + 1) + "月" + d.getDate() + "日";
    var related = riverPicks(rows, r.id, 8);
    return '<section class="today-hero">' +
      '<img class="today-hero-img" src="' + esc(imgOf(r)) + '" alt="' + esc(r.title) + '">' +
      '<div class="today-inner">' +
        '<div class="today-date">' + esc(date) + " · 出尘入画 · " + (isPaint ? "今日一画" : "今日一帧") + "</div>" +
        "<h1>" + esc(r.title) + "</h1>" +
        '<p class="today-note">' + (r.note_html || "") + "</p>" +
        '<div class="today-meta"><span>' + esc(r.year || "") + "</span><span>" + esc(r.place || r.region || "") + "</span><span>" + esc(r.source_short || "") + "</span>" + usageTag(r) + "</div>" +
        '<div class="today-actions"><a class="btn gold" href="' + esc(staticHref(r)) + '">' + (isPaint ? "看这张画" : "读这一帧") + '</a><button class="btn" data-lb="' + esc(r.id) + '">放大</button><a class="btn" href="' + esc(routeHref("gallery")) + '">进入' + (isPaint ? "绘画轴" : "影像轴") + '</a></div>' +
      "</div></section>" +
      homeSearchBox() +
      '<div class="section"><div class="section-head"><h2>' + (isPaint ? "绘画长河" : "影像长河") + '</h2><span class="sub">由远及近 · 8 帧</span></div></div>' +
      masonry(related) +
      '<div class="more-wrap"><a class="btn" href="' + esc(routeHref("gallery")) + '">查看全部 ' + SITE_RECORDS.length + " 条</a></div>";
  }
  function dailyThemes() {
    var rows = themeStories().filter(function (s) { return !s.date; });
    return rows.length ? rows : themeStories();
  }
  function todayEvent() {
    var d = new Date();
    var mmdd = ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
    return themeStories().filter(function (s) {
      return String(s.date || "").slice(5, 10) === mmdd;
    })[0] || null;
  }
  function renderThemeFeature(s, isEvent) {
    var cover = byId(s.cover);
    var d = new Date();
    var date = (d.getMonth() + 1) + "月" + d.getDate() + "日";
    var label = isEvent ? "历史上的今天" : "今日主题";
    var dateText = isEvent ? (s.date_label || s.date || date) : date;
    var intro = s.subtitle || String(s.intro || "").split(/\n\s*\n/)[0] || "";
    var seen = {}, preview = [];
    [s.cover].concat(s.photo_ids || []).forEach(function (id) {
      if (!id || seen[id] || preview.length >= 4) return;
      var r = byId(id);
      if (!r || !imgOf(r)) return;
      seen[id] = 1; preview.push(r);
    });
    var chapters = (s.chapters || []).map(function (ch) { return ch.title; }).filter(Boolean);
    var meta = isEvent
      ? '<span>' + esc(dateText) + "</span><span>" + esc(s.place || "") + "</span><span>" + (s.count || 0) + " 帧</span>"
      : '<span>' + (s.count || 0) + " 帧</span><span>" + chapters.length + " 章</span><span>" + esc((s.themes || []).join(" / ")) + "</span>";
    return '<section class="today-hero theme-hero">' +
      '<img class="today-hero-img" src="' + esc(cover ? imgOf(cover) : (preview[0] ? imgOf(preview[0]) : "")) + '" alt="' + esc(s.title) + '">' +
      '<div class="today-inner">' +
        '<div class="today-date">' + esc(dateText) + " · " + label + " · 出尘入画</div>" +
        "<h1>" + esc(s.title) + "</h1>" +
        '<p class="today-note">' + esc(intro) + "</p>" +
        '<div class="today-meta">' + meta + "</div>" +
        '<div class="today-actions"><a class="btn gold" href="' + esc(storyStaticHref(s)) + '">' + (isEvent ? "读这个事件" : "读这个主题") + '</a><a class="btn" href="' + esc(routeHref("stories")) + '">全部主题</a><a class="btn" href="' + esc(routeHref("timeline")) + '">时间线</a></div>' +
      "</div></section>" +
      homeSearchBox() +
      '<div class="section"><div class="section-head"><h2>' + (isEvent ? "事件预览" : "主题预览") + '</h2><span class="sub">' + (s.count || 0) + " 帧 · " + chapters.length + ' 章</span></div></div>' +
      '<div class="theme-preview">' + preview.map(function (r) {
        return '<a href="' + esc(staticHref(r)) + '"><img src="' + esc(imgOf(r)) + '" alt="' + esc(r.title) + '" loading="lazy"><span>' + esc(r.title) + "</span></a>";
      }).join("") + "</div>" +
      (chapters.length ? '<div class="section"><div class="section-head"><h2>章节</h2><span class="sub">' + (isEvent ? "读这个事件" : "读这个主题") + '</span></div></div><div class="theme-chapters">' + chapters.map(function (t, i) {
        return "<div><b>第 " + (i + 1) + " 章</b><span>" + esc(t) + "</span></div>";
      }).join("") + "</div>" : "");
  }
  function viewTodayTheme() {
    var stories = dailyThemes();
    if (!stories.length) return viewToday();
    return renderThemeFeature(stories[dailyIndex(stories.length)], false);
  }
  function viewTodayEvent() {
    var s = todayEvent();
    return s ? renderThemeFeature(s, true) : viewTodayTheme();
  }
  function viewTimeline() {
    var items = themeStories().map(function (s) {
      return { s: s, span: storySpan(s) };
    }).filter(function (x) { return x.span; }).sort(function (a, b) {
      return a.span.start - b.span.start;
    });
    if (!items.length) {
      return '<div class="empty"><b>时间线筹备中</b>主题有明确年代后，这里会按时间排成一条线。</div>';
    }
    return '<div class="section"><div class="section-head"><h2>时间线</h2><span class="sub">主题按年代排列 · ' + items.length + ' 个</span></div></div>' +
      '<div class="timeline">' + items.map(function (x) {
        var cover = byId(x.s.cover);
        var img = cover ? imgOf(cover) : "";
        var span = x.span.start + (x.span.end !== x.span.start ? "–" + x.span.end : "");
        return '<a class="tl-item" href="' + esc(storyStaticHref(x.s)) + '">' +
          '<div class="tl-year">' + esc(span) + '</div>' +
          '<div class="tl-pic" style="background-image:url(\'' + esc(img) + '\')"></div>' +
          '<div class="tl-body"><div class="status">' + esc(x.s.type || "长文") + '</div><h3>' + esc(x.s.title) + '</h3><p>' + esc(x.s.subtitle) + '</p>' +
          '<div class="cnt">' + (x.s.count || 0) + " 帧 · " + (x.s.chapters || []).length + " 章</div></div></a>";
      }).join("") + "</div>";
  }

  function viewGallery() {
    var rows = filtered();
    var shown = rows.slice(0, state.visible);
    var chips = collectionChips(state.filter.collection, "collection") + topicChips(state.filter.topic, "filter");
    return '<div class="section"><div class="section-head"><h2>' + (CFG.site === "photo" ? "摄影影像" : CFG.site === "paint" ? "绘画与版画" : "影像轴") + '</h2><span class="sub">' + rows.length + " 条</span></div></div>" +
      '<div class="chips">' + chips + "</div>" +
      (state.mode === "commercial" ? '<div class="notice">商用模式：已隐藏仅非商用与仅外链影像。</div>' : "") +
      (shown.length ? masonry(shown) : '<div class="empty"><b>没有符合条件的影像</b>换一个主题或切换用途模式试试。</div>') +
      (state.visible < rows.length ? '<div class="more-wrap"><button class="btn" id="loadMore">加载更多</button></div>' : '<div class="endnote">已到本页末尾</div>');
  }

  function viewStories() {
    var stories = themeStories();
    if (!stories.length) {
      return '<div class="empty"><b>主题筹备中</b>这一集合还没有主题，先去看影像或搜索。</div>';
    }
    return '<div class="section"><div class="section-head"><h2>主题</h2><span class="sub">事件、人物、地方、技艺与长文</span></div></div>' +
      '<div class="chips"><a class="chip" href="' + esc(timelineHref()) + '">按时间线浏览</a></div>' +
      stories.map(function (s) {
        var cover = byId(s.cover);
        var img = cover ? imgOf(cover) : "";
        var type = s.type || "长文";
        var status = type + (s.date ? " · " + s.date : "") + (s.status === "published" ? " · 已刊" : "");
        return '<a class="story-card" href="' + esc(storyStaticHref(s)) + '">' +
          '<div class="pic" style="background-image:url(\'' + esc(img) + '\')"></div>' +
          '<div class="body"><div class="status">' + esc(status) + "</div><h3>" + esc(s.title) + "</h3><p>" + esc(s.subtitle) + '</p><div class="cnt">' + (s.count || 0) + " 帧 · " + esc((s.themes || []).join(" / ")) + "</div></div></a>";
      }).join("");
  }

  function storyItem(r, caption) {
    return '<a class="story-item" href="' + esc(staticHref(r)) + '">' +
      '<img src="' + esc(imgOf(r)) + '" alt="' + esc(r.title) + '" loading="lazy">' +
      '<div class="cap"><b>' + esc(r.title) + "</b>" +
      (caption ? '<span class="caption-text">' + esc(caption) + "</span>" : "") +
      '<span class="caption-meta">' + esc(r.year || "") + " · " + esc(r.place || r.region || "") + " · " + esc(r.source_short || "") + "</span></div></a>";
  }
  function searchRows(scope) {
    var rows = SITE_RECORDS.filter(modeOk);
    if (scope === "photos") rows = rows.filter(function (r) { return r.collection === "photos"; });
    else if (scope === "paintings") rows = rows.filter(function (r) { return r.collection === "paintings"; });
    else if (scope === "objects") rows = rows.filter(function (r) { return r.collection === "objects" || r.collection === "links"; });
    else if (scope === "themes") rows = [];
    return rows;
  }
  function search(qtext, scope) {
    var terms = qtext.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    var rows = searchRows(scope).filter(function (r) {
      var txt = (r.search_text || "").toLowerCase();
      return terms.every(function (t) { return txt.indexOf(t) >= 0; });
    });
    return rows.map(function (r) {
      var title = String(r.title || "").toLowerCase();
      var score = 0;
      if (title === qtext.toLowerCase()) score += 20;
      if (title.indexOf(qtext.toLowerCase()) >= 0) score += 10;
      terms.forEach(function (t) {
        if (title.indexOf(t) >= 0) score += 5;
        if (String(r.place || "").toLowerCase().indexOf(t) >= 0) score += 3;
        if (String(r.creator || "").toLowerCase().indexOf(t) >= 0) score += 3;
        if (String(r.topic || "").toLowerCase().indexOf(t) >= 0) score += 2;
        if (String(r.region || "").toLowerCase().indexOf(t) >= 0) score += 2;
        if (String(r.year) === t) score += 4;
      });
      return { r: r, score: score };
    }).sort(function (a, b) { return b.score - a.score || (b.r.year || 0) - (a.r.year || 0); })
      .map(function (x) { return x.r; });
  }
  function themeSearchText(s) {
    return [s.title, s.subtitle, s.intro,
      (s.chapters || []).map(function (ch) { return (ch.title || "") + " " + (ch.text || ""); }).join(" "),
      (s.themes || []).join(" ")].join(" ").toLowerCase();
  }
  function searchThemes(qtext) {
    var terms = qtext.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return themeStories().filter(function (s) {
      var txt = themeSearchText(s);
      return terms.every(function (t) { return txt.indexOf(t) >= 0; });
    }).map(function (s) {
      var title = String(s.title || "").toLowerCase();
      var score = title.indexOf(qtext.toLowerCase()) >= 0 ? 10 : 0;
      terms.forEach(function (t) { if (title.indexOf(t) >= 0) score += 5; });
      return { s: s, score: score };
    }).sort(function (a, b) { return b.score - a.score; }).slice(0, 20).map(function (x) { return x.s; });
  }
  function resultRow(r) {
    var img = imgOf(r);
    var thumb = img
      ? '<img class="thumb" src="' + esc(img) + '" alt="' + esc(r.title) + '" loading="lazy">'
      : '<div class="thumb ph">外链</div>';
    return '<a class="result" href="' + esc(staticHref(r)) + '">' + thumb +
      '<div><h3>' + esc(r.title) + "</h3><div class=\"meta\"><b>" + esc(r.year || "") + "</b><span>" + esc(r.place || r.region || "") + "</span><span>" + esc(r.topic || "") + "</span>" +
      (r.content_type && r.content_type !== "photograph" ? "<span>" + esc(typeLabel(r)) + "</span>" : "") +
      "<span>" + esc(r.source_short || "") + "</span>" + usageTag(r) + "</div></div></a>";
  }
  function themeResultRow(s) {
    var cover = byId(s.cover);
    var img = cover ? imgOf(cover) : "";
    var thumb = img
      ? '<img class="thumb" src="' + esc(img) + '" alt="' + esc(s.title) + '" loading="lazy">'
      : '<div class="thumb ph">主题</div>';
    return '<a class="result theme-result" href="' + esc(storyStaticHref(s)) + '">' + thumb +
      '<div><h3>' + esc(s.title) + '</h3><div class="meta"><b>' + esc(s.type || "长文") + "</b><span>" +
      (s.count || 0) + " 帧</span><span>" + esc((s.themes || []).join(" / ")) +
      "</span></div><p>" + esc(s.subtitle) + "</p></div></a>";
  }
  function searchScopeChips() {
    var defs = [["all", "全部"], ["themes", "主题"], ["photos", "摄影"], ["paintings", "绘画"], ["objects", "器物"]];
    return defs.map(function (d) {
      return '<button class="chip ' + (state.searchScope === d[0] ? "on" : "") + '" data-filter="searchScope" data-value="' + d[0] + '">' + d[1] + "</button>";
    }).join("");
  }
  function viewSearch() {
    return '<div class="searchbar"><div class="search-field">' + ICONS.search +
      '<input id="searchInput" type="search" placeholder="搜主题、人物、地点、年代" value="' + esc(state.q) + '" autocomplete="off">' +
      '<button class="search-clear" id="searchClear">清空</button></div></div>' +
      '<div class="chips" id="searchChips">' + searchScopeChips() + "</div>" +
      '<div class="search-hint" id="searchCount">输入关键词开始搜索</div>' +
      '<div class="results" id="searchResults"></div>';
  }
  function recentSearchHtml() {
    var scope = state.searchScope || "all";
    var stories = (scope === "all" || scope === "themes") ? themeStories().slice(0, 4) : [];
    var rows = scope === "themes" ? [] : searchRows(scope).slice(0, 8);
    var html = "";
    if (stories.length) {
      html += '<div class="recent-topics"><div class="eyebrow" style="margin-bottom:8px">主题</div></div>' +
        stories.map(themeResultRow).join("");
    }
    if (rows.length) {
      html += '<div class="recent-topics"><div class="eyebrow" style="margin-bottom:2px">最近收录</div></div>' +
        rows.map(resultRow).join("");
    }
    return html || '<div class="empty"><b>还没有内容</b>换一个范围试试。</div>';
  }
  function renderSearchResults() {
    var box = q("#searchResults");
    var cnt = q("#searchCount");
    if (!box) return;
    var txt = state.q.trim();
    var scope = state.searchScope || "all";
    if (!txt) {
      if (cnt) cnt.textContent = "输入关键词开始搜索";
      box.innerHTML = recentSearchHtml();
      bindSearchTopics();
      return;
    }
    var themes = (scope === "all" || scope === "themes") ? searchThemes(txt) : [];
    var rows = scope === "themes" ? [] : search(txt, scope);
    var total = themes.length + rows.length;
    if (cnt) cnt.textContent = total ? "找到 " + total + " 条" : "没有匹配结果";
    if (!total) {
      box.innerHTML = '<div class="empty"><b>没有匹配</b>试试主题、人物、地点或年代，例如「1906」「巴黎」「阿波罗」。</div>';
      return;
    }
    var html = "";
    if (themes.length) {
      html += '<div class="result-group"><div class="result-group-head"><span>主题</span><span>' + themes.length + " 条</span></div>" +
        themes.slice(0, 8).map(themeResultRow).join("") + "</div>";
    }
    var groups = [["photos", "摄影"], ["paintings", "绘画"], ["objects", "器物 / 外链"]];
    groups.forEach(function (g) {
      var list = rows.filter(function (r) {
        if (g[0] === "objects") return r.collection === "objects" || r.collection === "links";
        return r.collection === g[0];
      });
      if (!list.length) return;
      html += '<div class="result-group"><div class="result-group-head"><span>' + g[1] + "</span><span>" + list.length + " 条</span></div>" +
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

  function viewSimple(title, text) {
    return '<div class="section"><div class="section-head"><h2>' + esc(title) + '</h2><span class="sub">' + esc(CFG.brand || "尘画") + "</span></div><p class=\"muted\" style=\"font-size:13px;line-height:1.9\">" + esc(text) + "</p></div>";
  }
  function appFoot() {
    return '<footer class="app-foot">' +
      '<div class="brandline">尘画 · 出尘入画</div>' +
      '<div class="motto">尘归尘，画归画</div>' +
      '<nav><a href="' + esc(routeHref("about")) + '">关于</a><a href="' + esc(routeHref("rights")) + '">授权</a>' +
      '<a href="' + esc(routeHref("legal")) + '">法律声明</a><a href="https://netcn.org/">导航</a></nav>' +
      '<p>影像版权归原作者与收藏机构；本站仅作非商业索引与展示。</p>' +
      "</footer>";
  }

  function openSheet() {
    var sheet = q("#sheet");
    if (!sheet) return;
    var cross = navItems().filter(function (n) { return n.kind === "cross"; }).map(function (n) {
      return '<button class="row" data-sheet="' + esc(itemHref(n)) + '"><span>' + esc(n.label) + '</span><span class="s">' + esc(n.sub || "") + "</span></button>";
    }).join("");
    sheet.innerHTML = '<div class="handle"></div>' +
      '<div class="sect">站内</div>' +
      '<button class="row" data-sheet="about"><span>关于</span><span class="s">采集与复核</span></button>' +
      '<button class="row" data-sheet="rights"><span>授权</span><span class="s">U1–U5</span></button>' +
      '<button class="row" data-sheet="' + esc(routeHref("legal")) + '"><span>法律声明</span><span class="s">免责与隐私</span></button>' +
      '<div class="sect">分站</div>' + cross +
      '<div class="sect">预览</div>' +
      '<button class="row" data-sheet="phone"><span>手机外框预览</span><span class="s">?phone=1</span></button>' +
      '<button class="row" data-close-sheet="1"><span>关闭</span><span class="s">ESC</span></button>';
    q("#backdrop").classList.add("on");
    sheet.classList.add("on");
    state.sheet = true;
  }
  function closeSheet() {
    var sheet = q("#sheet");
    var bd = q("#backdrop");
    if (sheet) sheet.classList.remove("on");
    if (bd) bd.classList.remove("on");
    state.sheet = false;
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
    q("#lbImg").alt = it.title || "";
    q("#lbCap").innerHTML = "<b>" + esc(it.title) + "</b>" + esc(it.year || "") + " · " + esc(it.place || it.region || "") + " · " + esc(it.source_short || "");
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
  function copyText(t) {
    var done = function () { toast("已复制"); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(done).catch(function () { fallbackCopy(t); done(); });
    } else { fallbackCopy(t); done(); }
  }
  function fallbackCopy(t) {
    var ta = document.createElement("textarea");
    ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }
  function toast(msg) {
    var t = q("#toast");
    if (!t) return;
    t.textContent = msg; t.classList.add("on");
    clearTimeout(t._tm);
    t._tm = setTimeout(function () { t.classList.remove("on"); }, 1600);
  }

  function boot() {
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
    // load more
    app.addEventListener("click", function (e) {
      if (e.target.id === "loadMore") {
        state.visible += 30;
        renderView();
      }
    });
    // search clear
    app.addEventListener("click", function (e) {
      if (e.target.id === "searchClear") {
        state.q = ""; var input = q("#searchInput"); if (input) { input.value = ""; input.focus(); }
        syncSearchUrl();
        renderSearchResults();
      }
    });
    // initial search results
    if (state.route === "search") renderSearchResults();
  }

  // 首次进入搜索页时补渲染结果
  var _render = renderView;
  renderView = function () {
    _render();
    if (state.route === "search") renderSearchResults();
  };

  boot();
})();
