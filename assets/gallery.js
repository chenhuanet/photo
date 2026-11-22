(function () {
  "use strict";
  var CFG = window.GALLERY_CONFIG || {};
  var state = { items: [], filter: "all", visible: 30, counts: {} };
  var masonry = document.getElementById("gMasonry");
  var chips = document.getElementById("gChips");
  var count = document.getElementById("gCount");
  var more = document.getElementById("gMore");

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function lang() {
    return document.documentElement.getAttribute("data-lang") === "en" ? "en" : "zh";
  }
  function L(zh, en) { return lang() === "en" ? en : zh; }
  function urlOf(item) {
    return CFG.preview ? (item.preview_url || item.url) : item.url;
  }
  function detailOf(item) {
    var base = item.detail_collection === "paintings"
      ? (CFG.paintStaticBase || "../../dist/paint/painting/")
      : (CFG.photoStaticBase || "../../dist/photo/photo/");
    return base + encodeURIComponent(item.detail_slug || item.id) + ".html";
  }
  function filtered() {
    if (state.filter === "all") return state.items;
    return state.items.filter(function (x) { return x.collection === state.filter; });
  }
  function renderChips() {
    var defs = [["all", L("全部", "All"), state.items.length],
                ["photos", L("摄影", "Photography"), state.counts.photos || 0]];
    if (state.counts.paintings) defs.push(["paintings", L("绘画", "Painting"), state.counts.paintings]);
    chips.innerHTML = defs.map(function (d) {
      return '<button class="g-chip ' + (state.filter === d[0] ? "on" : "") + '" data-filter="' + d[0] + '">' + d[1] + " " + d[2] + "</button>";
    }).join("");
  }
  function card(item) {
    var img = urlOf(item);
    return '<a class="g-card" href="' + esc(detailOf(item)) + '">' +
      '<div class="pic"><img src="' + esc(img) + '" alt="' + esc(item.title) + '" loading="lazy" decoding="async"></div>' +
      '<div class="body"><div class="yr">' + esc(item.year || "—") + "</div><h3>" + esc(item.title) + "</h3>" +
      '<div class="meta"><span class="tag">' + (item.collection === "paintings" ? L("绘画", "Painting") : L("摄影", "Photography")) + "</span><span>" + esc(item.decade || "") + "</span></div></div></a>";
  }
  function render() {
    var rows = filtered();
    var shown = rows.slice(0, state.visible);
    count.textContent = L(rows.length + " 帧 · 点击进入完整档案",
                          rows.length + " images · open the full archive");
    masonry.innerHTML = shown.length ? shown.map(card).join("") : '<div class="g-empty">' + L("这一类还没有影像。", "No images in this category yet.") + "</div>";
    more.style.display = state.visible < rows.length ? "" : "none";
  }
  function load() {
    var p1 = fetch("manifests/photos.json").then(function (r) { return r.json(); }).catch(function () { return { images: [] }; });
    var p2 = fetch("manifests/paintings.json").then(function (r) { return r.json(); }).catch(function () { return { images: [] }; });
    Promise.all([p1, p2]).then(function (res) {
      state.items = (res[0].images || []).concat(res[1].images || []);
      state.items.sort(function (a, b) { return (b.year || 0) - (a.year || 0); });
      state.counts = state.items.reduce(function (acc, x) {
        acc[x.collection] = (acc[x.collection] || 0) + 1; return acc;
      }, {});
      renderChips();
      render();
    });
  }
  chips.addEventListener("click", function (e) {
    var b = e.target.closest("[data-filter]");
    if (!b) return;
    state.filter = b.getAttribute("data-filter");
    state.visible = 30;
    renderChips();
    render();
  });
  more.addEventListener("click", function () {
    state.visible += 30;
    render();
  });
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-lang-toggle]")) {
      setTimeout(function () { renderChips(); render(); }, 0);
    }
  });
  load();
})();
