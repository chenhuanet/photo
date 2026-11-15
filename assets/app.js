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
  function staticHref(r) {
    if (r.collection === "paintings") {
      if (CFG.staticPaintBase) return CFG.staticPaintBase + r.id + ".html";
      return CFG.site === "paint" ? "painting/" + r.id + ".html" : "../paint/painting/" + r.id + ".html";
    }
    if (CFG.staticPhotoBase) return CFG.staticPhotoBase + r.id + ".html";
    return CFG.site === "photo" ? "photo/" + r.id + ".html" : "../photo/photo/" + r.id + ".html";
  }
  function storyStaticHref(s) {
    if (CFG.staticStoryBase) return CFG.staticStoryBase + s.id + ".html";
    return CFG.site === "main" ? "story/" + s.id + ".html" : "../main/story/" + s.id + ".html";
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
    ledger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5 5h14M5 9h14M5 13h9M5 17h11M5 21h7"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  };
  const TABS = [
    ["today", "今日", ICONS.today],
    ["gallery", "影像", ICONS.gallery],
    ["stories", "专题", ICONS.stories],
    ["search", "搜索", ICONS.search],
    ["ledger", "台账", ICONS.ledger],
  ];

  function shell() {
    var nav = TABS.map(function (t) {
      return '<button data-nav="' + t[0] + '" class="tab" data-tab="' + t[0] + '">' + t[2] + "<span>" + t[1] + "</span></button>";
    }).join("");
    var desk = TABS.map(function (t) {
      return '<button data-nav="' + t[0] + '" data-desk="' + t[0] + '">' + t[1] + "</button>";
    }).join("");
    app.innerHTML =
      '<header class="appbar">' +
        '<div class="brand"><span class="cn">' + esc(CFG.brand || "尘画") + '</span><span class="sub">' + esc(CFG.sub || "") + "</span></div>" +
        '<nav class="desknav">' + desk + "</nav>" +
        '<div class="right">' +
          '<button class="modebtn" data-mode="toggle">非商用</button>' +
          '<button class="iconbtn" data-nav="search" aria-label="搜索">' + ICONS.search + "</button>" +
          '<button class="iconbtn" data-more="1" aria-label="更多">' + ICONS.more + "</button>" +
        "</div>" +
      "</header>" +
      '<main class="app-scroll"><div id="view" class="view"></div></main>' +
      '<nav class="tabbar">' + nav + "</nav>" +
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
      var t = e.target.closest("[data-nav],[data-mode],[data-more],[data-filter],[data-photo],[data-story],[data-lb],[data-lb-close],[data-lb-prev],[data-lb-next],[data-copy],[data-close-sheet],[data-sheet],[data-phone],[data-usage]");
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
        if (key === "usage") { state.usage = val; renderView(); return; }
        state.visible = 30; renderView();
      } else if (t.hasAttribute("data-photo")) {
        e.preventDefault(); navigate("photo/" + t.getAttribute("data-photo"));
      } else if (t.hasAttribute("data-story")) {
        e.preventDefault(); navigate("story/" + t.getAttribute("data-story"));
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
    if (location.hash === "#/" + route) { renderView(); return; }
    location.hash = "#/" + route;
  }
  function currentRoute() {
    var h = (location.hash || "").replace(/^#\/?/, "");
    if (!h) return { name: "today", arg: null };
    var parts = h.split("/");
    return { name: parts[0] || "today", arg: parts[1] || null };
  }
  function renderView() {
    var r = currentRoute();
    state.route = r.name;
    state.arg = r.arg;
    var view = q("#view");
    if (!view) return;
    if (r.name === "photo" && r.arg) view.innerHTML = viewPhoto(r.arg);
    else if (r.name === "story" && r.arg) view.innerHTML = viewStory(r.arg);
    else if (r.name === "gallery") view.innerHTML = viewGallery();
    else if (r.name === "stories") view.innerHTML = viewStories();
    else if (r.name === "search") view.innerHTML = viewSearch();
    else if (r.name === "ledger") view.innerHTML = viewLedger();
    else if (r.name === "rights") view.innerHTML = viewSimple("授权", "本站只做索引与展示，不主张图片权利。每张图的许可以记录页为准；商用前请逐张核对源站。U4 仅非商用，U5 仅外链。");
    else if (r.name === "about") view.innerHTML = viewSimple("怎么做", "内容来自开放馆藏；采集、复核、策展三层都写日志。本站没有人工审核，human_review: false 是事实记录。图片二进制不进内容仓，站点只引用世纪图片站。");
    else view.innerHTML = viewToday();
    syncActiveTab();
    syncMode();
    var sc = q(".app-scroll"); if (sc) sc.scrollTop = 0;
    bindView();
  }
  function syncActiveTab() {
    var active = state.route;
    if (active === "photo") active = "gallery";
    if (active === "story") active = "stories";
    qa("[data-tab]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-tab") === active); });
    qa("[data-desk]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-desk") === active); });
  }
  function bindView() {
    var input = q("#searchInput");
    if (input) {
      input.addEventListener("input", function () {
        state.q = input.value;
        renderSearchResults();
      });
    }
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
    return '<a class="mcard' + (r.isLink ? " linkcard" : "") + '" href="#/photo/' + esc(r.id) + '" data-photo="' + esc(r.id) + '">' +
      pic + '<div class="meta"><div class="yr">' + esc(r.year || "—") + "</div><h3>" + esc(r.title) + "</h3><div class=\"tags\">" + tags + "</div></div></a>";
  }
  function masonry(rows, cls) {
    return '<div class="masonry ' + (cls || "") + '">' + rows.map(card).join("") + "</div>";
  }

  function viewToday() {
    var rows = filtered().filter(function (r) { return imgOf(r); });
    if (!rows.length) {
      return '<div class="empty"><b>绘画档案筹备中</b>下一阶段接入绘画内容后，这里会出现今日一帧与影像长河。</div>';
    }
    var idx = Math.floor(Date.now() / 86400000) % rows.length;
    var r = rows[idx];
    var d = new Date();
    var date = (d.getMonth() + 1) + "月" + d.getDate() + "日";
    var related = filtered().filter(function (x) { return x.id !== r.id && imgOf(x); }).slice(0, 8);
    return '<section class="today-hero" style="background-image:url(\'' + esc(imgOf(r)) + '\')">' +
      '<div class="today-inner">' +
        '<div class="today-date">' + esc(date) + " · 今日一帧</div>" +
        "<h1>" + esc(r.title) + "</h1>" +
        '<p class="today-note">' + (r.note_html || "") + "</p>" +
        '<div class="today-meta"><span>' + esc(r.year || "") + "</span><span>" + esc(r.place || r.region || "") + "</span><span>" + esc(r.source_short || "") + "</span>" + usageTag(r) + "</div>" +
        '<div class="today-actions"><button class="btn gold" data-lb="' + esc(r.id) + '">放大看这一帧</button><button class="btn" data-nav="gallery">进入影像轴</button></div>' +
      "</div></section>" +
      '<div class="section"><div class="section-head"><h2>影像长河</h2><span class="sub">按年代推进 · 向下滚动</span></div></div>' +
      masonry(related) +
      '<div class="more-wrap"><button class="btn" data-nav="gallery">查看全部 ' + SITE_RECORDS.length + " 条</button></div>";
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
    if (!SITE_STORIES.length) {
      return '<div class="empty"><b>专题筹备中</b>专题页会在下一阶段接入，先保留首页与影像轴。</div>';
    }
    return '<div class="section"><div class="section-head"><h2>专题</h2><span class="sub">精选 + 论点，不是标签页</span></div></div>' +
      SITE_STORIES.map(function (s) {
        var cover = byId(s.cover);
        var img = cover ? imgOf(cover) : "";
        var label = s.status === "published" ? "已刊" : (s.status || "筹备中");
        return '<a class="story-card" href="#/story/' + esc(s.id) + '" data-story="' + esc(s.id) + '">' +
          '<div class="pic" style="background-image:url(\'' + esc(img) + '\')"></div>' +
          '<div class="body"><div class="status">' + esc(label) + "</div><h3>" + esc(s.title) + "</h3><p>" + esc(s.subtitle) + '</p><div class="cnt">' + (s.count || 0) + " 帧 · " + esc((s.themes || []).join(" / ")) + "</div></div></a>";
      }).join("");
  }

  function storyItem(r, caption) {
    return '<a class="story-item" href="#/photo/' + esc(r.id) + '" data-photo="' + esc(r.id) + '">' +
      '<img src="' + esc(imgOf(r)) + '" alt="' + esc(r.title) + '" loading="lazy">' +
      '<div class="cap"><b>' + esc(r.title) + "</b>" +
      (caption ? '<span class="caption-text">' + esc(caption) + "</span>" : "") +
      '<span class="caption-meta">' + esc(r.year || "") + " · " + esc(r.place || r.region || "") + " · " + esc(r.source_short || "") + "</span></div></a>";
  }
  function paragraphs(text) {
    return String(text || "").split(/\n\s*\n/).filter(Boolean).map(function (p) {
      return "<p>" + esc(p) + "</p>";
    }).join("");
  }
  function viewStory(id) {
    var s = SITE_STORIES.filter(function (x) { return x.id === id; })[0];
    if (!s) return '<div class="empty"><b>专题不存在</b>它可能还在筹备中。</div>';
    var cover = byId(s.cover);
    var label = s.status === "published" ? "已刊" : (s.status || "筹备中");
    var body;
    if (s.chapters && s.chapters.length) {
      body = '<div class="story-lead">' + paragraphs(s.intro) + "</div>" +
        (s.status !== "published" ? '<div class="notice">专题样板 · 待策展。</div>' : "") +
        s.chapters.map(function (ch, i) {
          return '<section class="story-chapter"><div class="eyebrow">第 ' + (i + 1) + " 章</div><h2>" + esc(ch.title) + "</h2>" +
            '<p class="chapter-text">' + esc(ch.text) + "</p><div class=\"story-grid\">" +
            (ch.items || []).map(function (it) {
              var r = byId(it.id);
              return r ? storyItem(r, it.caption) : "";
            }).join("") + "</div></section>";
        }).join("") +
        (s.rights_summary ? '<div class="story-rights"><b>权利摘要</b><span>' + esc(s.rights_summary) + "</span></div>" : "");
    } else {
      var items = (s.photo_ids || []).map(byId).filter(Boolean);
      body = '<div class="story-body"><p class="lead">' + esc(s.intro) + "</p>" +
        '<div class="notice">这是专题样板：先用现有影像搭出阅读节奏，正式文案与图注在下一阶段撰写。</div>' +
        '<div class="story-grid">' + items.map(function (r) { return storyItem(r, ""); }).join("") + "</div></div>";
    }
    return '<div class="detail-top"><button class="backbtn" data-nav="stories">' + ICONS.back + '返回专题</button>' +
      '<a class="backbtn" href="' + esc(storyStaticHref(s)) + '" target="_blank" rel="noopener">静态页 ↗</a>' +
      '<span class="eyebrow">专题</span></div>' +
      '<div class="story-hero" style="background-image:url(\'' + esc(cover ? imgOf(cover) : "") + '\')"><div class="inner">' +
      '<div class="status eyebrow">' + esc(label) + "</div><h1>" + esc(s.title) + "</h1><p>" + esc(s.subtitle) + "</p></div></div>" + body;
  }

  function searchRows() {
    var rows = SITE_RECORDS.filter(modeOk);
    if (state.searchCollection !== "all") rows = rows.filter(function (r) { return r.collection === state.searchCollection; });
    return rows;
  }
  function search(qtext) {
    var terms = qtext.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    var rows = searchRows().filter(function (r) {
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
      .slice(0, 60).map(function (x) { return x.r; });
  }
  function resultRow(r) {
    var img = imgOf(r);
    var thumb = img
      ? '<img class="thumb" src="' + esc(img) + '" alt="' + esc(r.title) + '" loading="lazy">'
      : '<div class="thumb ph">外链</div>';
    return '<a class="result" href="#/photo/' + esc(r.id) + '" data-photo="' + esc(r.id) + '">' + thumb +
      '<div><h3>' + esc(r.title) + "</h3><div class=\"meta\"><b>" + esc(r.year || "") + "</b><span>" + esc(r.place || r.region || "") + "</span><span>" + esc(r.topic || "") + "</span>" +
      (r.content_type && r.content_type !== "photograph" ? "<span>" + esc(typeLabel(r)) + "</span>" : "") +
      "<span>" + esc(r.source_short || "") + "</span>" + usageTag(r) + "</div></div></a>";
  }
  function viewSearch() {
    var chips = collectionChips(state.searchCollection, "searchCollection");
    return '<div class="searchbar"><div class="search-field">' + ICONS.search +
      '<input id="searchInput" type="search" placeholder="搜标题、地点、作者、主题、年代" value="' + esc(state.q) + '" autocomplete="off">' +
      '<button class="search-clear" id="searchClear">清空</button></div></div>' +
      '<div class="chips" id="searchChips">' + chips + "</div>" +
      '<div class="search-hint" id="searchCount">输入关键词开始搜索</div>' +
      '<div class="results" id="searchResults"></div>';
  }
  function recentSearchHtml() {
    var topics = {};
    searchRows().forEach(function (r) { if (r.topic) topics[r.topic] = (topics[r.topic] || 0) + 1; });
    var tops = Object.keys(topics).sort(function (a, b) { return topics[b] - topics[a]; }).slice(0, 8);
    var rows = searchRows().slice(0, 10);
    return '<div class="recent-topics"><div class="eyebrow" style="margin-bottom:8px">热门主题</div>' +
      '<div class="chips" style="padding:0 0 14px">' + tops.map(function (t) {
        return '<button class="chip" data-search-topic="' + esc(t) + '">' + esc(t) + "</button>";
      }).join("") + "</div>" +
      '<div class="eyebrow" style="margin-bottom:2px">最近收录</div></div>' + rows.map(resultRow).join("");
  }
  function renderSearchResults() {
    var box = q("#searchResults");
    var cnt = q("#searchCount");
    if (!box) return;
    var txt = state.q.trim();
    if (!txt) {
      if (cnt) cnt.textContent = "输入关键词开始搜索";
      box.innerHTML = recentSearchHtml();
      bindSearchTopics();
      return;
    }
    var rows = search(txt);
    if (cnt) cnt.textContent = rows.length ? "找到 " + rows.length + " 条" : "没有匹配结果";
    box.innerHTML = rows.length ? rows.map(resultRow).join("") : '<div class="empty"><b>没有匹配</b>试试地点、作者、主题或年代，例如「上海」「1900」「街巷」。</div>';
  }
  function bindSearchTopics() {
    qa("[data-search-topic]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.q = b.getAttribute("data-search-topic");
        var input = q("#searchInput"); if (input) input.value = state.q;
        renderSearchResults();
      });
    });
  }
  function syncSearchChips() {
    var box = q("#searchChips");
    if (!box) return;
    box.innerHTML = collectionChips(state.searchCollection, "searchCollection");
  }

  function viewLedger() {
    var rows = filtered();
    var sitePhotos = SITE_RECORDS.filter(function (r) { return r.collection === "photos"; }).length;
    var sitePaintings = SITE_RECORDS.filter(function (r) { return r.collection === "paintings"; }).length;
    var siteU4 = SITE_RECORDS.filter(function (r) { return r.usage_code === "U4"; }).length;
    var chips = '<button class="chip ' + (state.usage === "all" ? "on" : "") + '" data-filter="usage" data-value="all">全部</button>' +
      ["U1", "U2", "U3", "U4", "U5"].map(function (u) {
        return '<button class="chip ' + (state.usage === u ? "on" : "") + '" data-filter="usage" data-value="' + u + '">' + u + "</button>";
      }).join("");
    var list = rows.filter(function (r) { return state.usage === "all" || r.usage_code === state.usage; });
    var shown = list.slice(0, state.visible);
    return '<div class="stat-strip">' +
      '<div class="stat-cell"><div class="n">' + sitePhotos + '</div><div class="t">照片</div></div>' +
      '<div class="stat-cell"><div class="n">' + sitePaintings + '</div><div class="t">绘画 / 版画</div></div>' +
      '<div class="stat-cell"><div class="n">' + siteU4 + '</div><div class="t">U4 仅非商用</div></div></div>' +
      '<div class="section"><div class="section-head"><h2>权利台账</h2><span class="sub">' + list.length + " 条</span></div></div>" +
      '<div class="chips">' + chips + "</div>" +
      (state.mode === "commercial" ? '<div class="notice">商用模式：U4 / U5 已隐藏；需要商用请逐张核对源站。</div>' : "") +
      '<div class="ledger-list">' + shown.map(function (r) {
        return '<a class="ledger-row" href="#/photo/' + esc(r.id) + '" data-photo="' + esc(r.id) + '"><div><h3>' + esc(r.title) + "</h3><div class=\"meta\"><span>" + esc(r.year || "") + "</span><span>" + esc(r.source_short || "") + "</span><span>" + esc(r.license || "") + "</span></div></div><div class=\"right\">" + usageTag(r) + '<div class="lic">' + esc(r.rights_status || "") + "</div></div></a>";
      }).join("") + "</div>" +
      (state.visible < list.length ? '<div class="more-wrap"><button class="btn" id="loadMore">加载更多</button></div>' : '<div class="endnote">已到末尾</div>');
  }

  function viewPhoto(id) {
    var r = byId(id);
    if (!r) return '<div class="empty"><b>记录不存在</b>它可能已被下架。</div>';
    var blocked = state.mode === "commercial" && r.commercial_ok !== true;
    var img = imgOf(r);
    var hero = "";
    if (img) {
      hero = '<div class="detail-img-wrap"><img class="detail-img" src="' + esc(img) + '" alt="' + esc(r.title) + '" data-lb="' + esc(r.id) + '"></div>';
    }
    var meta = [
      ["作者", r.creator || "不详"],
      ["来源", r.source_short || r.source || ""],
      ["年代", r.date_label || r.year || ""],
      ["地域", r.region || ""],
      ["类型", (typeLabel(r) || "—") + " / " + (r.medium || "")],
      ["主题", (r.theme || "") + " / " + (r.topic || "")],
      ["许可", r.license || ""],
      ["使用性质", (r.usage_code || "") + " " + (r.usage_short || "")],
      ["馆藏编号", (r.evidence && r.evidence.catalog_id) || ""],
      ["抓取时间", r.fetched_at || ""],
      ["哈希", (r.image_sha256 || "").slice(0, 16) + "…"],
    ];
    var ev = r.evidence || {};
    var related = filtered().filter(function (x) { return x.id !== r.id && x.topic === r.topic && imgOf(x); }).slice(0, 4);
    return '<div class="detail-top"><button class="backbtn" data-nav="gallery">' + ICONS.back + "返回</button>" +
      '<a class="backbtn" href="' + esc(staticHref(r)) + '" target="_blank" rel="noopener">静态页 ↗</a>' +
      '<span class="eyebrow">' + esc(r.collection === "links" ? "仅外链" : (typeLabel(r) + "记录")) + "</span></div>" +
      (blocked ? '<div class="notice">此影像为仅非商用 / 仅外链，商用模式下不展示图片。切换左上角用途模式可查看。</div>' : hero) +
      '<div class="detail-body"><div class="eyebrow">' + esc(r.year || "") + " · " + esc(r.kind || "") + "</div><h1>" + esc(r.title) + "</h1>" +
      '<div class="detail-sub"><span>' + esc(r.place || r.region || "") + "</span><span>·</span><span>" + esc(r.medium || "") + "</span>" + usageTag(r) + "</div>" +
      '<div class="detail-note">' + (r.note_html || "") + "</div>" +
      '<div class="meta-grid">' + meta.map(function (m) {
        return "<div><b>" + esc(m[0]) + "</b>" + esc(m[1] || "—") + "</div>";
      }).join("") + "</div>" +
      '<div class="usage-card"><div class="uh"><span class="un">' + esc(r.usage_label || "") + '</span><span class="uc">' + esc(r.usage_code || "") + "</span></div><p>" + esc(r.usage_obligation || "") + "</p>" +
      '<div class="credit">' + esc(r.credit_line || "") + '</div><button class="btn copybtn" data-copy="' + esc(r.credit_line || "") + '">复制署名行</button></div>' +
      '<div class="evidence"><h3>史实依据</h3><p><b>陈述：</b>' + esc(ev.claim || "—") + "</p><p><b>依据：</b>" + esc(ev.basis || "—") + "</p><p><b>核验：</b>" + esc(ev.checked_at || "—") + " · " + esc(ev.status || "—") + "</p>" +
      (ev.reference_url ? '<p><b>源页：</b><a href="' + esc(ev.reference_url) + '" target="_blank" rel="noopener">打开对象页 ↗</a></p>' : "") + "</div>" +
      '<div class="evidence"><h3>来源与许可</h3>' +
      (r.page_url ? '<p><b>对象页：</b><a href="' + esc(r.page_url) + '" target="_blank" rel="noopener">打开 ↗</a></p>' : "") +
      (r.license_url ? '<p><b>许可原文：</b><a href="' + esc(r.license_url) + '" target="_blank" rel="noopener">打开 ↗</a></p>' : "") +
      (r.source_url ? '<p><b>来源页：</b><a href="' + esc(r.source_url) + '" target="_blank" rel="noopener">打开 ↗</a></p>' : "") +
      "<p><b>审核：</b>" + esc((r.audit && r.audit.reviewer) || "AI 自动审核") + " · human_review: " + esc(String(r.audit && r.audit.human_review)) + "</p></div>" +
      (related.length ? '<div class="related"><h3>同一主题</h3>' + masonry(related) + "</div>" : "") +
      "</div>";
  }

  function viewSimple(title, text) {
    return '<div class="section"><div class="section-head"><h2>' + esc(title) + '</h2><span class="sub">' + esc(CFG.brand || "尘画") + "</span></div><p class=\"muted\" style=\"font-size:13px;line-height:1.9\">" + esc(text) + "</p></div>";
  }

  function openSheet() {
    var sheet = q("#sheet");
    if (!sheet) return;
    sheet.innerHTML = '<div class="handle"></div>' +
      '<div class="sect">站内</div>' +
      '<button class="row" data-sheet="ledger"><span>台账</span><span class="s">权利与溯源</span></button>' +
      '<button class="row" data-sheet="rights"><span>授权</span><span class="s">U1–U5</span></button>' +
      '<button class="row" data-sheet="about"><span>怎么做</span><span class="s">采集与复核</span></button>' +
      '<div class="sect">站点</div>' +
      '<button class="row" data-sheet="' + esc(CFG.home || "/next/dist/main/") + '"><span>主站</span><span class="s">www</span></button>' +
      '<button class="row" data-sheet="' + esc(CFG.photoBase || "/next/dist/photo/") + '"><span>摄影</span><span class="s">photo</span></button>' +
      '<button class="row" data-sheet="' + esc(CFG.paintBase || "/next/dist/paint/") + '"><span>绘画</span><span class="s">paint</span></button>' +
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
    if (state.route === "photo" && state.arg) {
      var r = byId(state.arg);
      var rel = filtered().filter(function (x) { return imgOf(x) && (!r || x.topic === r.topic); });
      return [r].concat(rel).filter(Boolean).filter(function (x, i, a) { return a.indexOf(x) === i; });
    }
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
    if (new URLSearchParams(location.search).get("phone")) document.body.classList.add("phone-mode");
    shell();
    syncMode();
    var target = new URLSearchParams(location.search).get("photo");
    if (target && byId(target)) location.hash = "#/photo/" + target;
    renderView();
    window.addEventListener("hashchange", renderView);
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
