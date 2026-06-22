/* =====================================================================
   AXIOM — site engine (content-driven)
   Renders home / category / article from the shared article store
   (created in the admin). No sample data: with an empty store the site
   shows clean empty states. Data-dependent widgets show placeholders
   until a real source is connected. Requires data.js first.
   ===================================================================== */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const on = (el, ev, fn, o) => el && el.addEventListener(ev, fn, o);
  const D = window.AXIOM;
  const DB = window.AXIOM_DB;
  const param = (k) => new URLSearchParams(location.search).get(k);
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const sec = (slug) => (D.sections[slug] || D.sections.world);

  function catFromText(txt) {
    if (!txt) return null;
    const t = txt.split("·")[0].split("|")[0].trim().toLowerCase();
    return D.labelToSlug[t] || (D.sections[t] ? t : null);
  }

  /* ---------- THEME ---------- */
  const root = document.documentElement;
  const savedT = localStorage.getItem("axiom-theme");
  if (savedT) root.setAttribute("data-theme", savedT);
  else if (matchMedia("(prefers-color-scheme: dark)").matches) root.setAttribute("data-theme", "dark");
  $$("[data-theme-toggle]").forEach((b) => on(b, "click", () => {
    const n = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", n); localStorage.setItem("axiom-theme", n);
  }));

  /* ---------- CLOCK ---------- */
  const dateEl = $("[data-date]");
  if (dateEl) {
    const fmt = () => { const n = new Date();
      dateEl.textContent = n.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) +
        " · " + n.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }); };
    fmt(); setInterval(fmt, 30000);
  }

  /* ---------- BUILDERS ---------- */
  function card(a) {
    const s = sec(a.category);
    const el = document.createElement("a");
    el.className = "card fade-up";
    el.href = D.articleHref(a.category, { id: a.id, t: a.title, read: a.read, sub: a.excerpt });
    el.innerHTML =
      `<div class="media ${s.g}">${mediaImg(a)}<span class="media__label"><span class="tag tag--soft">${esc(s.name)}</span></span></div>` +
      `<div class="card__body"><h3>${esc(a.title)}</h3>` +
      (a.excerpt ? `<p>${esc(a.excerpt)}</p>` : "") +
      `<div class="meta"><span class="cat">${esc(s.name)}</span>` + (a.read ? `<span class="sep">·</span><span>${esc(a.read)}</span>` : "") + `</div></div>`;
    return el;
  }
  function emptyEl(title, msg, cls) {
    const d = document.createElement("div");
    d.className = "empty " + (cls || "");
    d.innerHTML = `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 5h16v14H4z"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="13" y2="14"/></svg><h3>${esc(title)}</h3><p>${esc(msg)}</p>`;
    return d;
  }
  function sideStory(a) {
    const s = sec(a.category);
    return `<a class="side-story fade-up" href="${D.articleHref(a.category, { id: a.id, t: a.title, read: a.read, sub: a.excerpt })}">
      <div class="media ${s.g}">${mediaImg(a)}</div>
      <div><span class="kicker">${esc(s.name)}</span><h3>${esc(a.title)}</h3>${a.read ? `<div class="meta"><span>${esc(a.read)}</span></div>` : ""}</div></a>`;
  }
  function leadMarkup(a) {
    const s = sec(a.category);
    return `<a class="hero__lead fade-up" href="${D.articleHref(a.category, { id: a.id, t: a.title, read: a.read, sub: a.excerpt })}">
      <div class="media ${s.g}">${mediaImg(a)}</div><div class="scrim"></div>
      <div class="content"><span class="tag">${esc(s.name)}</span><h1>${esc(a.title)}</h1>
      ${a.excerpt ? `<p>${esc(a.excerpt)}</p>` : ""}
      <div class="byline">${a.author ? `<span class="avatar">${esc(initials(a.author))}</span><span>${esc(a.author)}</span>` : ""}${a.read ? `<span class="sep"></span><span>${esc(a.read)}</span>` : ""}</div></div></a>`;
  }
  function initials(n) { return (n || "").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase(); }
  function revealNow() { requestAnimationFrame(() => $$(".fade-up").forEach((e) => e.classList.add("in"))); }
  function mediaImg(a) { return a && a.image_url ? '<img src="' + esc(a.image_url) + '" alt="" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1">' : ""; }

  /* ---------- TICKER ---------- */
  function renderTicker(pub) {
    const tick = $(".ticker"), track = $("[data-ticker-track]");
    if (!tick) return;
    if (!pub.length) { tick.style.display = "none"; return; }
    tick.style.display = "flex";
    track.innerHTML = pub.slice(0, 6).map((a) =>
      `<a href="${D.articleHref(a.category, { id: a.id, t: a.title, read: a.read })}">${esc(a.title)}</a>`).join("");
  }

  /* ---------- HOME ---------- */
  async function renderHome() {
    const pub = await DB.published();
    renderTicker(pub);

    const hero = $("[data-home-hero]");
    if (hero && pub.length) {
      hero.innerHTML = `<div class="hero__grid"><div data-lead>${leadMarkup(pub[0])}</div>
        <div class="hero__side">${pub.slice(1, 5).map(sideStory).join("") || emptyInline("More stories will appear here")}</div></div>`;
    }

    const feed = $("[data-feed]");
    if (feed) {
      feed.innerHTML = "";
      const rest = pub.slice(5);
      if (!pub.length) feed.appendChild(emptyEl("No articles published yet", "Published stories will appear here. Create one from the admin (Articles → New article).", "empty--row"));
      else if (!rest.length) feed.appendChild(emptyEl("That's everything for now", "More stories will show here as they're published.", "empty--row"));
      else rest.forEach((a) => feed.appendChild(card(a)));
    }

    const mr = $("[data-mostread]");
    if (mr) mr.innerHTML = pub.length
      ? pub.slice(0, 5).map((a, i) => `<li><span class="n">${i + 1}</span><div><a href="${D.articleHref(a.category, { id: a.id, t: a.title })}">${esc(a.title)}</a><div class="meta">${esc(sec(a.category).name)}</div></div></li>`).join("")
      : `<li style="grid-template-columns:1fr"><div class="note-src">No data yet — most-read ranks once articles get traffic.</div></li>`;

    revealNow(); highlightNav(null);
  }
  function emptyInline(msg) { return `<div class="note-src" style="padding:20px 0">${esc(msg)}</div>`; }

  /* ---------- CATEGORY ---------- */
  async function renderCategory() {
    const cat = (D.sections[param("cat")] && param("cat")) || "world";
    const s = sec(cat), list = await DB.bySection(cat);
    document.title = s.name + " — Axiom";

    const h1 = $(".cat-hero h1"); if (h1) h1.innerHTML = '<span class="dot"></span>' + esc(s.name);
    const blurb = $(".cat-hero p"); if (blurb) blurb.textContent = s.blurb;
    const crumb = $(".cat-hero .breadcrumb"); if (crumb) crumb.innerHTML = '<a href="index.html">Home</a><span class="sep">›</span><span>' + esc(s.name) + "</span>";
    const filters = $(".cat-hero .filters");
    if (filters) filters.innerHTML = '<a class="chip chip--active" href="' + D.categoryHref(cat) + '">All</a>' +
      s.topics.map((t) => '<a class="chip" href="' + D.categoryHref(catFromText(t) || cat) + '">' + esc(t) + "</a>").join("");
    const stats = $(".cat-stats");
    if (stats) stats.innerHTML = `<span><b>${list.length}</b> article${list.length === 1 ? "" : "s"}</span><span class="note-src">Updated live from your published content</span>`;

    const feat = $("[data-cat-featured]");
    if (feat) feat.innerHTML = list.length ? leadMarkup(list[0]) :
      `<div class="hero__empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 5h16v14H4z"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="13" y2="14"/></svg><h2>No ${esc(s.name)} stories yet</h2><p>Publish an article in this section from the admin and it will lead this page.</p></div>`;

    const feed = $("[data-feed]");
    if (feed) {
      feed.innerHTML = "";
      const rest = list.slice(1);
      if (!list.length) feed.appendChild(emptyEl("Nothing published in " + s.name, "Create an article in this section from the admin to see it here.", "empty--row"));
      else if (!rest.length) feed.appendChild(emptyEl("That's the only story so far", "More " + s.name + " stories will appear as they're published.", "empty--row"));
      else rest.forEach((a) => feed.appendChild(card(a)));
    }

    const mr = $(".aside .mostread"), mrHead = $(".aside .widget__head h3");
    if (mr) mr.innerHTML = list.length
      ? list.slice(0, 4).map((a, i) => `<li><span class="n">${i + 1}</span><div><a href="${D.articleHref(a.category, { id: a.id, t: a.title })}">${esc(a.title)}</a><div class="meta">${esc(s.name)}</div></div></li>`).join("")
      : `<li style="grid-template-columns:1fr"><div class="note-src">No data yet.</div></li>`;
    if (mrHead) mrHead.innerHTML = mrHead.innerHTML.replace(/Most read.*/i, "Most read in " + esc(s.name));

    revealNow(); highlightNav(cat);
  }

  /* ---------- ARTICLE ---------- */
  async function renderArticle() {
    const id = param("id");
    const rec = id ? await DB.byId(id) : null;
    const cat = (D.sections[param("cat")] && param("cat")) || (rec && rec.category) || "world";
    const s = sec(cat);

    const title = rec ? rec.title : (param("t") || "");
    const dek = rec ? rec.excerpt : (param("d") || "");
    const read = rec ? rec.read : (param("r") || "");
    const author = rec ? rec.author : "";

    const k = $(".article-header .kicker"); if (k) k.textContent = s.name;
    const h1 = $(".article-header h1"); if (h1) h1.textContent = title || "Untitled article";
    const dekEl = $(".article-header .dek"); if (dekEl) { if (dek) dekEl.textContent = dek; else dekEl.style.display = "none"; }
    document.title = (title || "Article") + " — Axiom";

    const av = $(".article-meta .avatar"); if (av) av.textContent = author ? initials(author) : "—";
    const nm = $(".article-meta .name"); if (nm) nm.textContent = author || "Staff writer";
    const subEl = $(".article-meta .sub"); if (subEl) subEl.innerHTML = (rec && rec.date ? esc(rec.date) : "Unpublished draft") + (read ? " · " + esc(read) + " read" : "");

    const hm = $(".article-hero .media"); if (hm) { hm.className = "media " + s.g; if (rec && rec.image_url) hm.innerHTML = mediaImg(rec); }
    const crumb = $(".breadcrumb"); if (crumb) crumb.innerHTML =
      '<a href="index.html">Home</a><span class="sep">›</span><a href="' + D.categoryHref(cat) + '">' + esc(s.name) + "</a>" +
      (title ? '<span class="sep">›</span><span>' + esc(title.length > 42 ? title.slice(0, 42) + "…" : title) + "</span>" : "");

    // body
    const body = $("[data-article-body]");
    if (body) {
      if (rec && rec.body && rec.body.trim()) {
        const paras = rec.body.split(/\n{1,}/).map((p) => p.trim()).filter(Boolean);
        const adSlots = [2, 5, 8], adSizes = { 2: "after ¶2 · 728×90 responsive", 5: "after ¶5 · 300×250 / responsive", 8: "after ¶8 · 728×90 responsive" };
        let html = "";
        paras.forEach((p, i) => {
          html += "<p>" + esc(p) + "</p>";
          if (adSlots.includes(i + 1) && i + 1 < paras.length) html += `<div class="ad ad--inline"><span class="ad__slot">In-content · ${adSizes[i + 1]}</span></div>`;
        });
        body.innerHTML = html;
      } else {
        body.innerHTML = `<div class="empty"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 5h16v14H4z"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="13" y2="14"/></svg><h3>No article content</h3><p>This is the Axiom article template. Open a published article, or add body text to this story in the admin.</p></div>`;
      }
    }

    const tagsRow = $(".tags-row");
    if (tagsRow) tagsRow.innerHTML = (rec && rec.tags && rec.tags.length ? rec.tags : [s.name]).map((t) => `<a class="chip" href="${D.categoryHref(catFromText(t) || cat)}">#${esc(String(t).replace(/\s+/g, ""))}</a>`).join("");

    const abAv = $(".author-box .avatar"); if (abAv) abAv.textContent = author ? initials(author) : "A";
    const abName = $(".author-box h4"); if (abName) abName.textContent = author || "Axiom newsroom";
    const abRole = $(".author-box .role"); if (abRole) abRole.textContent = s.name + " desk";
    const abBio = $(".author-box p"); if (abBio) abBio.textContent = author ? (author + " writes for Axiom. Author bio goes here — edit it in the admin.") : "Bylines and author bios appear here once set in the admin.";

    const relTitle = $("[data-related-title]"); if (relTitle) relTitle.textContent = "More in " + s.name;
    const rel = $("[data-related]");
    if (rel) {
      rel.innerHTML = "";
      const more = (await DB.bySection(cat)).filter((a) => String(a.id) !== String(id)).slice(0, 4);
      if (more.length) more.forEach((a) => rel.appendChild(card(a)));
      else rel.appendChild(emptyEl("No related stories yet", "Other " + s.name + " articles will appear here.", "empty--row"));
    }
    revealNow(); highlightNav(cat);
  }

  function highlightNav(cat) {
    if (!cat || !D.sections[cat]) return;
    const name = D.sections[cat].name.toLowerCase();
    $$(".primary-nav a.nav-link").forEach((a) => { if (a.textContent.trim().toLowerCase().startsWith(name)) a.style.color = "var(--accent)"; });
  }

  /* ---------- LINK WIRING (section nav/footer) ---------- */
  function wireLinks() {
    $$(".primary-nav a.nav-link, .drawer nav a, .footer-col a, .mega__col a").forEach((a) => {
      if (a.dataset.cat) { a.href = D.categoryHref(a.dataset.cat); return; }
      const slug = catFromText(a.textContent);
      if (slug) a.href = D.categoryHref(slug);
    });
    $$('a[href="category.html"]').forEach((a) => { a.href = D.categoryHref(catFromText(a.textContent) || "world"); });
  }

  /* ---------- LOAD MORE (paginates published) ---------- */
  function initFeed() {
    const feed = $("[data-feed]"), loadBtn = $("[data-load-more]");
    if (!loadBtn) return;
    // Pagination only matters when there are many articles; with the empty
    // store this simply has nothing more to add.
    const isCat = !!$(".cat-hero");
    let shown = isCat ? 999 : 999;
    on(loadBtn, "click", () => { loadBtn.disabled = true; loadBtn.textContent = "No more stories"; });
    const sentinel = $("[data-sentinel]"); if (sentinel) sentinel.remove();
  }

  /* ---------- SEARCH (over published articles) ---------- */
  function initSearch() {
    const overlay = $(".search-overlay"); if (!overlay) return;
    const input = $("input", overlay), box = $(".search-box", overlay);
    const hint = $(".hint", box), terms = $(".terms", box);
    let results = $(".search-results", box);
    if (!results) { results = document.createElement("div"); results.className = "search-results"; box.appendChild(results); }
    // replace any trending-term chips with real section links
    if (terms) terms.innerHTML = Object.keys(D.sections).slice(0, 8).map((k) => `<a class="chip" href="${D.categoryHref(k)}">${esc(D.sections[k].name)}</a>`).join("");

    const openS = () => { overlay.classList.add("open"); setTimeout(() => input && input.focus(), 60); };
    const closeS = () => overlay.classList.remove("open");
    $$("[data-open-search]").forEach((b) => on(b, "click", openS));
    $$("[data-close-search]").forEach((b) => on(b, "click", closeS));
    on(overlay, "click", (e) => { if (e.target === overlay) closeS(); });

    let searchT;
    async function show(q) {
      const has = q.trim().length > 0;
      if (hint) hint.textContent = has ? "Results" : "Browse sections";
      if (terms) terms.style.display = has ? "none" : "";
      if (!has) { results.innerHTML = ""; return; }
      const hits = await DB.search(q);
      results.innerHTML = hits.length
        ? hits.map((a) => `<a href="${D.articleHref(a.category, { id: a.id, t: a.title })}"><span class="rc">${esc(sec(a.category).name)}</span><span>${esc(a.title)}</span></a>`).join("")
        : `<div class="none">No results for “${esc(q)}”.</div>`;
    }
    on(input, "input", () => { clearTimeout(searchT); searchT = setTimeout(() => show(input.value), 220); });
    on(input, "keydown", (e) => { if (e.key === "Enter") { const f = $("a", results); if (f) location.href = f.href; } });
    window.__openSearch = openS; window.__closeSearch = closeS;
  }

  /* ---------- CHROME ---------- */
  function initChrome() {
    const drawer = $(".drawer"), scrim = $(".scrim-bg");
    const openD = () => { drawer && drawer.classList.add("open"); scrim && scrim.classList.add("open"); document.body.style.overflow = "hidden"; };
    const closeD = () => { drawer && drawer.classList.remove("open"); scrim && scrim.classList.remove("open"); document.body.style.overflow = ""; };
    $$("[data-open-drawer]").forEach((b) => on(b, "click", openD));
    $$("[data-close-drawer]").forEach((b) => on(b, "click", closeD));
    on(scrim, "click", closeD);
    on(document, "keydown", (e) => {
      if (e.key === "Escape") { window.__closeSearch && window.__closeSearch(); closeD(); }
      if ((e.key === "/" || (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); window.__openSearch && window.__openSearch(); }
    });
    const header = $(".site-header"); if (header) { const f = () => header.classList.toggle("is-stuck", scrollY > 8); f(); on(window, "scroll", f, { passive: true }); }
    const toTop = $(".to-top"); if (toTop) { on(window, "scroll", () => toTop.classList.toggle("show", scrollY > 800), { passive: true }); on(toTop, "click", () => scrollTo({ top: 0, behavior: "smooth" })); }
    const anchor = $(".anchor-ad");
    if (anchor && !sessionStorage.getItem("axiom-anchor-closed")) {
      setTimeout(() => anchor.classList.add("show"), 2500);
      on($(".anchor-ad__close"), "click", () => { anchor.classList.remove("show"); sessionStorage.setItem("axiom-anchor-closed", "1"); });
    }
  }

  /* ---------- NEWSLETTER ---------- */
  function initNewsletter() {
    $$("[data-newsletter]").forEach((form) => on(form, "submit", async (e) => {
      e.preventDefault();
      const input = $("input[type=email]", form), msg = $(".msg", form);
      const email = input.value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { if (msg) { msg.style.color = "var(--accent)"; msg.textContent = "Please enter a valid email address."; } return; }
      if (msg) { msg.style.color = ""; msg.textContent = "Subscribing…"; }
      const res = await DB.subscribe(email);
      const err = res && res.error;
      if (msg) {
        if (!err) { msg.style.color = ""; msg.textContent = "✓ You're subscribed."; input.value = ""; input.disabled = true; }
        else if (/duplicate|unique/i.test(err.message || "")) { msg.style.color = ""; msg.textContent = "✓ You're already on the list."; input.value = ""; }
        else { msg.style.color = "var(--accent)"; msg.textContent = "Couldn't subscribe — please try again."; }
      }
    }));
  }

  /* ---------- REVEAL / PROGRESS / SHARE ---------- */
  function initReveal() {
    const els = $$(".fade-up");
    if ("IntersectionObserver" in window && els.length) {
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -6% 0px" });
      els.forEach((el) => io.observe(el));
    } else els.forEach((el) => el.classList.add("in"));
  }
  function initProgress() {
    const bar = $(".progress"), body = $(".article-body"); if (!bar || !body) return;
    const upd = () => { const r = body.getBoundingClientRect(), total = r.height - innerHeight + 200, done = Math.min(Math.max(-r.top + 120, 0), total); bar.style.width = (total > 0 ? (done / total) * 100 : 0) + "%"; };
    upd(); on(window, "scroll", upd, { passive: true }); on(window, "resize", upd);
  }
  function initShare() {
    $$("[data-share]").forEach((btn) => on(btn, "click", async (e) => {
      if (btn.dataset.share === "native" && navigator.share) { e.preventDefault(); try { await navigator.share({ title: document.title, url: location.href }); } catch (_) {} }
      else if (btn.dataset.share === "copy") { e.preventDefault(); try { await navigator.clipboard.writeText(location.href); const o = btn.getAttribute("aria-label"); btn.setAttribute("aria-label", "Link copied!"); setTimeout(() => btn.setAttribute("aria-label", o), 1500); } catch (_) {} }
    }));
  }

  /* ---------- LIVE DATA (weather / crypto / stocks) ----------
     Weather (Open-Meteo) and crypto (CoinGecko) are keyless + CORS-enabled,
     so they update automatically with no setup. Stocks need a free API key
     (Finnhub) entered in the admin, because index/quote feeds require auth.
     In production, proxy any keyed call through a serverless function so the
     key is never exposed in the browser. */
  function adminSettings() { try { return JSON.parse(localStorage.getItem("axiom-admin-settings")) || {}; } catch (e) { return {}; } }
  const nowTime = () => new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  function flash(row, up) { row.classList.remove("flash-up", "flash-down"); void row.offsetWidth; row.classList.add(up ? "flash-up" : "flash-down"); }

  function wLabel(c) { if (c === 0) return "Clear"; if (c <= 3) return "Cloudy"; if (c <= 48) return "Fog"; if (c <= 67) return "Rain"; if (c <= 77) return "Snow"; if (c <= 82) return "Showers"; return "Storm"; }
  function wIcon(c) {
    const sun = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="4.5"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="3" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="21" y2="12"/><line x1="5.6" y1="5.6" x2="7.7" y2="7.7"/><line x1="16.3" y1="16.3" x2="18.4" y2="18.4"/><line x1="18.4" y1="5.6" x2="16.3" y2="7.7"/><line x1="7.7" y1="16.3" x2="5.6" y2="18.4"/></svg>';
    const cloud = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A3.8 3.8 0 0 1 18 18z"/></svg>';
    const rain = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 15a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A3.8 3.8 0 0 1 18 15z"/><line x1="8" y1="18" x2="7" y2="21"/><line x1="12" y1="18" x2="11" y2="21"/><line x1="16" y1="18" x2="15" y2="21"/></svg>';
    const snow = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 15a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A3.8 3.8 0 0 1 18 15z"/><line x1="8" y1="19" x2="8" y2="19.4"/><line x1="12" y1="20" x2="12" y2="20.4"/><line x1="16" y1="19" x2="16" y2="19.4"/></svg>';
    const storm = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 15a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A3.8 3.8 0 0 1 18 15z"/><polyline points="12 15 10 19 13 19 11 22"/></svg>';
    if (c === 0) return sun; if (c <= 3) return cloud; if (c <= 48) return cloud; if (c <= 67) return rain; if (c <= 77) return snow; if (c <= 82) return rain; return storm;
  }
  function loadWeather() {
    const wrap = $("[data-weather]"); if (!wrap) return;
    const s = adminSettings(), lat = s.wlat || "40.71", lon = s.wlon || "-74.01", loc = s.wloc || "New York";
    const locEl = $("[data-weather-loc]"); if (locEl) locEl.textContent = loc;
    const status = $("[data-weather-status]");
    const url = "https://api.open-meteo.com/v1/forecast?latitude=" + encodeURIComponent(lat) + "&longitude=" + encodeURIComponent(lon) + "&daily=weather_code,temperature_2m_max&timezone=auto&forecast_days=4";
    const run = () => fetch(url).then((r) => r.json()).then((d) => {
      const days = $$("[data-wday]");
      (d.daily.time || []).forEach((t, i) => {
        if (!days[i]) return;
        const code = d.daily.weather_code[i], temp = Math.round(d.daily.temperature_2m_max[i]), date = new Date(t + "T00:00");
        days[i].innerHTML = '<span class="lbl">' + wLabel(code) + "</span>" + wIcon(code) + '<div class="t">' + temp + "°</div><div class=\"d\">" + date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase() + " " + date.getDate() + "</div>";
      });
      if (status) status.textContent = "Live · Open-Meteo";
    }).catch(() => { if (status) status.textContent = "Unavailable"; });
    run(); setInterval(run, 1800000);
  }
  function loadCrypto() {
    if (!$("[data-crypto]")) return;
    const status = $("[data-crypto-status]");
    const url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true";
    const run = () => fetch(url).then((r) => r.json()).then((d) => {
      ["bitcoin", "ethereum", "solana"].forEach((id) => {
        const row = $('[data-crypto="' + id + '"]'); if (!row || !d[id]) return;
        const p = d[id].usd, ch = d[id].usd_24h_change || 0;
        $(".price", row).textContent = "$" + p.toLocaleString("en-US", { maximumFractionDigits: p < 10 ? 4 : 2 });
        const chg = $(".chg", row); chg.textContent = (ch >= 0 ? "▲ " : "▼ ") + Math.abs(ch).toFixed(2) + "%"; chg.className = "chg " + (ch >= 0 ? "up" : "down");
        flash(row, ch >= 0);
      });
      if (status) status.textContent = "Live · " + nowTime();
    }).catch(() => { if (status) status.textContent = "Unavailable"; });
    run(); setInterval(run, 60000);
  }
  function loadStocks() {
    if (!$("[data-stock]")) return;
    const status = $("[data-stock-status]"), note = $("[data-stock-note]");
    const key = (adminSettings().stockKey || "").trim();
    // Prefer a same-origin secure proxy (/api/quote) that keeps the key server-
    // side (FINNHUB_KEY env var). If it isn't deployed (e.g. plain static host),
    // fall back to a key entered in the admin. Otherwise show "Not connected".
    fetch("/api/quote?symbol=SPY")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => { if (j && j.c != null) startStocks(true, status, note); else throw 0; })
      .catch(() => { if (key) startStocks(false, status, note, key); else if (status) status.textContent = "Not connected"; });
  }
  function startStocks(useProxy, status, note, key) {
    if (note) note.style.display = "none";
    const url = useProxy
      ? (s) => "/api/quote?symbol=" + s
      : (s) => "https://finnhub.io/api/v1/quote?symbol=" + s + "&token=" + encodeURIComponent(key);
    const run = () => {
      ["SPY", "DIA", "QQQ"].forEach((sym) => {
        fetch(url(sym)).then((r) => r.json()).then((d) => {
          const row = $('[data-stock="' + sym + '"]'); if (!row || d.c == null) return;
          $(".price", row).textContent = d.c.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const chg = $(".chg", row), dp = d.dp || 0; chg.textContent = (dp >= 0 ? "▲ " : "▼ ") + Math.abs(dp).toFixed(2) + "%"; chg.className = "chg " + (dp >= 0 ? "up" : "down");
          flash(row, dp >= 0);
        }).catch(() => {});
      });
      if (status) status.textContent = "Live · " + nowTime() + (useProxy ? " · secure" : "");
    };
    run(); setInterval(run, 60000);
  }
  function initLiveData() { loadWeather(); loadCrypto(); loadStocks(); }

  /* ---------- INIT ---------- */
  function init() {
    if ($("[data-home-hero]")) renderHome();
    if ($(".cat-hero")) renderCategory();
    if ($(".article-body") || $("[data-article-body]")) renderArticle();
    wireLinks(); initFeed(); initSearch(); initChrome(); initNewsletter(); initReveal(); initProgress(); initShare(); initLiveData();
    $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
