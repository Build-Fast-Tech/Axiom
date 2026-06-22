/* =====================================================================
   AXIOM Admin — Supabase-backed
   Auth: Supabase Auth magic-link, restricted to the two allow-listed emails
   (also enforced server-side by public.is_admin() + RLS).
   Data: articles / comments / subscribers live in Supabase. Ads + integration
   settings are local config (localStorage). Requires supabase.min.js,
   data.js, supabase.js to load first.
   ===================================================================== */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);
  const A = window.AXIOM || { sections: {}, slugify: (s) => s, articleHref: () => "#", categoryHref: () => "#" };
  const ADM = window.AXIOM_ADMIN;
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const fmt = (n) => n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "k" : "" + n;
  const LS = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem("axiom-admin-" + k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { localStorage.setItem("axiom-admin-" + k, JSON.stringify(v)); }
  };

  /* ---------- THEME ---------- */
  const root = document.documentElement;
  const savedT = localStorage.getItem("axiom-theme");
  if (savedT) root.setAttribute("data-theme", savedT);
  else if (matchMedia("(prefers-color-scheme: dark)").matches) root.setAttribute("data-theme", "dark");

  /* ---------- TOAST ---------- */
  let toastT;
  function toast(msg) {
    let t = $(".toast"); if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' + esc(msg);
    t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2800);
  }

  /* ---------- LOCAL CONFIG (ads + integrations) ---------- */
  function getAds() {
    let a = LS.get("ads", null);
    if (a) return a;
    a = [
      { id: "lead", name: "Homepage leaderboard", size: "970×90 / 728×90", page: "Home", on: true },
      { id: "infeed", name: "In-feed native", size: "responsive", page: "Home / Category", on: true },
      { id: "mpu", name: "Sidebar MPU", size: "300×250", page: "All", on: true },
      { id: "incontent", name: "In-content (¶2/¶5/¶8)", size: "728×90 / 300×250", page: "Article", on: true },
      { id: "anchor", name: "Anchor (sticky footer)", size: "728×90", page: "All", on: true }
    ];
    LS.set("ads", a); return a;
  }
  function settings() { return LS.get("settings", { site: "Axiom", tagline: "Independent world news", accent: "#E11D2A", perPage: 12, theme: root.getAttribute("data-theme") || "light" }); }

  /* ---------- SECURITY CHECKLIST ---------- */
  const SECURITY = [
    { phase: "Core Security", note: "Live deployment.", items: [
      { id: "https", t: "HTTPS enforced site-wide, no mixed content", s: "pass", d: "All assets over HTTPS / relative. HSTS set in vercel.json." },
      { id: "secrets", t: "No secrets/credentials committed", s: "pass", d: "Only the publishable key is in the front-end (safe). service_role stays server-side." },
      { id: "csp", t: "Content-Security-Policy + security headers", s: "pass", d: "CSP on every page (Supabase allow-listed); full header set in vercel.json." },
      { id: "rls", t: "Row Level Security on all tables", s: "pass", d: "articles / comments / subscribers all have RLS enabled with least-privilege policies." },
      { id: "authroutes", t: "Admin requires real authentication", s: "pass", d: "Supabase Auth + the two-email allow-list (public.is_admin); writes blocked by RLS for anyone else." }
    ]},
    { phase: "OWASP Checks", note: "Run OWASP ZAP on the deployed URL.", items: [
      { id: "xss", t: "Cross-Site Scripting (XSS)", s: "pass", d: "textContent / escaped innerHTML / encodeURIComponent throughout; search terms sanitised." },
      { id: "sqli", t: "SQL Injection", s: "pass", d: "All DB access via the Supabase client (parameterised) — no string-built SQL." },
      { id: "brokenauth", t: "Auth / session handling", s: "pass", d: "Supabase-managed JWT sessions; admin gated client + server (RLS)." },
      { id: "zap", t: "Automated OWASP ZAP scan", s: "action", d: "Run a ZAP baseline after deploy and wire into CI." }
    ]},
    { phase: "API & Data Access", note: "", items: [
      { id: "idor", t: "No cross-user data access (IDOR)", s: "pass", d: "RLS: public reads only published/approved rows; writes require admin." },
      { id: "ratelimit", t: "Rate limiting on sensitive endpoints", s: "action", d: "Supabase Auth is rate-limited; add limits to any custom serverless routes." },
      { id: "validation", t: "Input validated at boundaries", s: "pass", d: "Client validation + DB CHECK constraints (status enums, email format)." }
    ]},
    { phase: "Automation & Review", note: "CI / process.", items: [
      { id: "ci", t: "Security scanning in CI", s: "action", d: "Add GitHub Actions: dependency + ZAP scans on every PR." },
      { id: "deps", t: "No vulnerable dependencies", s: "pass", d: "Only supabase-js (vendored, pinned). No build step." },
      { id: "review", t: "Automated code review before deploy", s: "action", d: "Add CodeRabbit / required PR review." }
    ]}
  ];
  const secState = () => LS.get("sec", {});
  function secCounts() { let pass = 0, action = 0, na = 0, total = 0; SECURITY.forEach((p) => p.items.forEach((i) => { total++; i.s === "pass" ? pass++ : i.s === "action" ? action++ : na++; })); return { pass, action, na, total }; }

  /* ---------- DATA CACHE (loaded from Supabase) ---------- */
  let articles = [], comments = [], subs = [];
  async function refresh() {
    [articles, comments, subs] = await Promise.all([ADM.listArticles(), ADM.listComments(), ADM.listSubscribers()]);
  }

  /* ---------- VIEWS ---------- */
  const V = {};

  V.dashboard = function () {
    const published = articles.filter((a) => a.status === "published").length;
    const drafts = articles.filter((a) => a.status === "draft").length;
    const pending = comments.filter((c) => c.status === "pending").length;
    const top = articles.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 5);
    return `
      <div class="stat-grid">
        ${statCard("Published", published, "live on the site", "M4 19V5l16 7z")}
        ${statCard("Drafts", drafts, "in your library", "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z")}
        ${statCard("Comments pending", pending, "awaiting moderation", "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z")}
        ${statCard("Subscribers", subs.length, "newsletter audience", "M16 21v-2a4 4 0 0 0-8 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z")}
      </div>
      <div class="cols-2">
        <div class="panel"><div class="panel__head"><h3>Recent articles</h3><a class="more" href="#articles" data-go="articles" style="font-size:12px;color:var(--text-2)">View all</a></div>
          <div class="panel__body" style="padding:6px 18px 12px">
            ${top.length ? top.map((a, i) => `<div style="display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
              <span style="font-family:var(--font-display);font-weight:600;color:var(--accent);font-size:16px;width:18px">${i + 1}</span>
              <span style="font-size:13.5px;color:var(--ink);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.title)}</span>
              <span class="badge-st st-${a.status}" style="white-space:nowrap">${a.status}</span></div>`).join("")
              : `<div class="empty" style="border:none;background:transparent"><h3>No articles yet</h3><p>Create your first story in the Articles tab.</p></div>`}
          </div>
        </div>
        <div class="panel"><div class="panel__head"><h3>Traffic</h3><span class="note-src">Not connected</span></div>
          <div class="panel__body"><div class="empty" style="border:none;background:transparent">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="3 17 9 11 13 15 21 7"/></svg>
            <h3>Connect analytics</h3><p>Add Plausible or GA4 to see page views and Core Web Vitals here.</p></div></div>
        </div>
      </div>`;
  };
  function statCard(lbl, num, sub, path) {
    return `<div class="stat"><div class="lbl"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>${esc(lbl)}</div><div class="num">${num}</div><div class="delta" style="color:var(--text-3)">${esc(sub)}</div></div>`;
  }

  V.articles = function () {
    return `<div class="view__head"><div class="sub">Your article library — stored in Supabase</div>
        <button class="btn btn--primary" data-new-article><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> New article</button></div>
      <div class="tbl-tools">
        <input type="search" placeholder="Search articles…" data-art-search>
        <select data-art-cat><option value="">All sections</option>${Object.keys(A.sections).map((k) => `<option value="${k}">${esc(A.sections[k].name)}</option>`).join("")}</select>
        <select data-art-status><option value="">Any status</option><option value="published">Published</option><option value="draft">Draft</option><option value="review">In review</option></select>
      </div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Title</th><th>Section</th><th>Author</th><th>Status</th><th>Date</th><th style="text-align:right">Actions</th></tr></thead><tbody data-art-body></tbody></table></div>`;
  };
  function renderArtRows() {
    const body = $("[data-art-body]"); if (!body) return;
    const q = ($("[data-art-search]").value || "").toLowerCase();
    const fc = $("[data-art-cat]").value, fs = $("[data-art-status]").value;
    let list = articles.filter((a) => (!q || (a.title || "").toLowerCase().includes(q)) && (!fc || a.category === fc) && (!fs || a.status === fs));
    if (!list.length) { body.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:44px;color:var(--text-3)">${articles.length ? "No articles match your filters." : "No articles yet — click “New article” to create your first story."}</td></tr>`; return; }
    body.innerHTML = list.map((a) => `<tr data-id="${esc(a.id)}">
      <td class="ttl">${esc(a.title)}</td>
      <td>${esc(A.sections[a.category] ? A.sections[a.category].name : a.category)}</td>
      <td>${esc(a.author || "—")}</td>
      <td><span class="badge-st st-${a.status}">${a.status === "review" ? "In review" : a.status[0].toUpperCase() + a.status.slice(1)}</span></td>
      <td class="muted">${esc(a.date || "—")}</td>
      <td><div class="row-actions">
        <button class="icon-act" data-edit="${esc(a.id)}" title="Edit"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>
        <button class="icon-act" data-view-art="${esc(a.id)}" title="Preview"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg></button>
        <button class="icon-act danger" data-del="${esc(a.id)}" title="Delete"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6m5 0V4h4v2"/></svg></button>
      </div></td></tr>`).join("");
  }

  let editingId = null;
  V.editor = function () {
    const a = editingId ? articles.find((x) => String(x.id) === String(editingId)) : null;
    const cats = Object.keys(A.sections);
    return `<div class="view__head"><div class="sub">${a ? "Editing article" : "Draft a new story"}</div>
        <div style="display:flex;gap:8px"><button class="btn btn--ghost" data-go="articles">Cancel</button>
        <button class="btn btn--ghost" data-save="draft">Save draft</button>
        <button class="btn btn--primary" data-save="published">${a && a.status === "published" ? "Update" : "Publish"}</button></div></div>
      <div class="form-grid">
        <div>
          <div class="fld"><label>Headline</label><input data-f="title" value="${esc(a ? a.title : "")}" placeholder="A clear, specific headline"><div class="err" data-e="title"></div></div>
          <div class="fld"><label>Excerpt / dek</label><textarea data-f="excerpt" placeholder="One or two sentences summarising the story">${esc(a ? a.excerpt : "")}</textarea></div>
          <div class="fld"><label>Body</label><textarea class="ed-body" data-f="body" placeholder="Write the article… (blank lines separate paragraphs)">${esc(a ? a.body : "")}</textarea><div class="hint"><span>Plain text — paragraphs split on blank lines. In-content ads auto-insert after ¶2/¶5/¶8.</span><span data-count="body">0 words</span></div></div>
        </div>
        <div>
          <div class="side-box"><h4>Publish</h4>
            <div class="fld"><label>Section</label><select data-f="category">${cats.map((k) => `<option value="${k}" ${a && a.category === k ? "selected" : ""}>${esc(A.sections[k].name)}</option>`).join("")}</select></div>
            <div class="fld"><label>Author</label><input data-f="author" value="${esc(a ? a.author : "")}" placeholder="Author name"></div>
            <div class="fld"><label>Status</label><select data-f="status"><option value="draft" ${a && a.status === "draft" ? "selected" : ""}>Draft</option><option value="review" ${a && a.status === "review" ? "selected" : ""}>In review</option><option value="published" ${a && a.status === "published" ? "selected" : ""}>Published</option></select></div>
          </div>
          <div class="side-box"><h4>Media &amp; SEO</h4>
            <div class="fld"><label>Hero image URL</label><input data-f="image_url" value="${esc(a ? a.image_url : "")}" placeholder="https://…/photo.jpg"><div class="hint"><span>Optional — falls back to a tint</span></div></div>
            <div class="fld"><label>SEO title</label><input data-f="seoTitle" value="${esc(a ? a.seoTitle : "")}" maxlength="70"><div class="hint"><span>Aim ≤ 60 chars</span><span data-count="seoTitle">0</span></div></div>
            <div class="fld"><label>Meta description</label><textarea data-f="seoDesc" maxlength="170">${esc(a ? a.seoDesc : "")}</textarea><div class="hint"><span>Aim ≤ 155 chars</span><span data-count="seoDesc">0</span></div></div>
            <div class="fld"><label>URL slug</label><input data-f="slug" value="${esc(a ? (a.slug || A.slugify(a.title)) : "")}" readonly style="color:var(--text-3)"></div>
          </div>
        </div>
      </div>`;
  };

  V.categories = function () {
    const rows = Object.keys(A.sections).map((k) => {
      const cnt = articles.filter((a) => a.category === k).length;
      return `<tr><td class="ttl">${esc(A.sections[k].name)}</td><td class="muted">/${k}</td><td>${cnt}</td><td class="muted">${esc(A.sections[k].topics.slice(0, 4).join(", "))}</td></tr>`;
    }).join("");
    return `<div class="view__head"><div class="sub">${Object.keys(A.sections).length} sections</div></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Slug</th><th>Articles</th><th>Top topics</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  };

  V.comments = function () {
    if (!comments.length) return `<div class="view__head"><div class="sub">Moderate reader comments</div></div><div class="empty"><h3>No comments yet</h3><p>Reader comments submitted on articles appear here for moderation.</p></div>`;
    return `<div class="view__head"><div class="sub">Moderate reader comments</div></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Author</th><th>Comment</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead><tbody>
        ${comments.map((m) => `<tr data-cid="${esc(m.id)}">
          <td class="ttl">${esc(m.author_name)}</td><td style="max-width:420px">${esc(m.body)}</td>
          <td><span class="badge-st st-${m.status}">${m.status[0].toUpperCase() + m.status.slice(1)}</span></td>
          <td><div class="row-actions">
            <button class="icon-act" data-cmt-ok="${esc(m.id)}" title="Approve"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></button>
            <button class="icon-act danger" data-cmt-del="${esc(m.id)}" title="Delete"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
          </div></td></tr>`).join("")}
      </tbody></table></div>`;
  };

  V.subscribers = function () {
    return `<div class="view__head"><div class="sub">${subs.length} subscriber${subs.length === 1 ? "" : "s"}</div>
        ${subs.length ? '<button class="btn btn--ghost" data-export-subs><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Export CSV</button>' : ""}</div>
      ${subs.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Email</th><th>List</th><th>Status</th><th>Joined</th></tr></thead><tbody>
        ${subs.map((s) => `<tr><td class="ttl">${esc(s.email)}</td><td>${esc(s.list)}</td><td><span class="badge-st st-${s.status === "active" ? "approved" : "pending"}">${esc(s.status)}</span></td><td class="muted">${esc((s.created_at || "").slice(0, 10))}</td></tr>`).join("")}
      </tbody></table></div>` : `<div class="empty"><h3>No subscribers yet</h3><p>Newsletter sign-ups from the site land here (stored in Supabase). Wire Resend to send the emails.</p></div>`}`;
  };

  V.ads = function () {
    const ads = getAds();
    return `<div class="view__head"><div class="sub">AdSense placements &amp; monetization</div></div>
      <div class="side-box" style="max-width:560px"><h4>AdSense</h4>
        <div class="fld"><label>Publisher ID (ca-pub-…)</label><input data-ads-pub value="${esc(LS.get("adsense_pub", ""))}" placeholder="ca-pub-XXXXXXXXXXXXXXXX"></div>
        <button class="btn btn--primary btn--sm" data-save-pub>Save</button>
        <p class="muted" style="font-size:12px;margin-top:10px;line-height:1.55">To show real ads to <b>all visitors</b>, also set <code>ADSENSE_CLIENT</code> in <code>assets/js/ads.js</code> (a constant in code, since visitors don't share your browser storage) and get the site approved in AdSense. Until then, slots render as labelled placeholders.</p>
      </div>
      <div class="tbl-wrap" style="margin-top:16px"><table class="tbl"><thead><tr><th>Slot</th><th>Size</th><th>Where</th><th>Enabled</th></tr></thead><tbody>
        ${ads.map((a) => `<tr><td class="ttl">${esc(a.name)}</td><td class="muted">${esc(a.size)}</td><td>${esc(a.page)}</td>
          <td><label class="switch"><input type="checkbox" data-ad="${a.id}" ${a.on ? "checked" : ""}><span class="track"></span></label></td></tr>`).join("")}
      </tbody></table></div>`;
  };

  V.media = function () {
    return `<div class="view__head"><div class="sub">Media</div></div>
      <div class="empty"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg><h3>Use image URLs for now</h3><p>Each article takes a hero image URL (Article editor → Media &amp; SEO). To host uploads, create a public Supabase Storage bucket and point the field at its public URLs.</p></div>`;
  };

  V.security = function () {
    const c = secCounts(), state = secState();
    return `<div class="view__head"><div class="sub">Security audit · sourced from your Website Build Checklist</div></div>
      <div class="sec-summary">
        ${secStat("Passing", c.pass, "pill-pass")}
        ${secStat("Action before launch", c.action, "pill-action")}
        ${secStat("N/A", c.na, "pill-na")}
        ${secStat("Coverage", c.total + " checks", "pill-pass")}
      </div>
      ${SECURITY.map((p) => `<div class="sec-phase"><h3>${esc(p.phase)}</h3>${p.note ? `<div class="ph-note">${esc(p.note)}</div>` : ""}
        ${p.items.map((i) => { const done = !!state[i.id]; return `<div class="sec-item ${done ? "done" : ""}" data-sec="${i.id}">
          <button class="chk" data-sec-toggle="${i.id}" aria-label="toggle"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></button>
          <div><div class="ti">${esc(i.t)}</div><div class="de">${esc(i.d)}</div></div>
          <span class="pill pill-${i.s}">${i.s === "pass" ? "Pass" : i.s === "action" ? "Action" : "N/A"}</span></div>`; }).join("")}</div>`).join("")}`;
  };
  function secStat(lbl, num, cls) { return `<div class="stat"><div class="lbl">${esc(lbl)}</div><div class="num">${num}</div><div style="margin-top:8px"><span class="pill ${cls}">&nbsp;</span></div></div>`; }

  V.settings = function () {
    const s = settings();
    return `<div class="view__head"><div class="sub">Site configuration</div></div>
      <div class="form-grid"><div>
        <div class="side-box"><h4>General</h4>
          <div class="fld"><label>Site name</label><input data-s="site" value="${esc(s.site)}"></div>
          <div class="fld"><label>Tagline</label><input data-s="tagline" value="${esc(s.tagline)}"></div>
        </div>
        <div class="side-box"><h4>Integrations · live data</h4>
          <div class="fld"><label>Weather — location label</label><input data-s="wloc" value="${esc(s.wloc || "New York")}"></div>
          <div class="fld"><label>Weather — latitude</label><input data-s="wlat" value="${esc(s.wlat != null ? s.wlat : "40.71")}"></div>
          <div class="fld"><label>Weather — longitude</label><input data-s="wlon" value="${esc(s.wlon != null ? s.wlon : "-74.01")}"></div>
          <div class="fld"><label>Stocks — Finnhub key (local testing only)</label><input data-s="stockKey" value="${esc(s.stockKey || "")}" placeholder="prefer the FINNHUB_KEY env var in production"></div>
        </div>
        <button class="btn btn--primary" data-save-settings>Save settings</button>
      </div>
      <div><div class="side-box"><h4>Account</h4>
        <p class="muted" style="font-size:13px;margin-bottom:12px">Signed in as <b data-whoami>—</b>. Admin access is limited to the two allow-listed emails and enforced by Supabase RLS.</p>
        <button class="btn btn--ghost" id="logout2">Sign out</button>
      </div></div></div>`;
  };

  /* ---------- ROUTER ---------- */
  const TITLES = { dashboard: "Dashboard", articles: "Articles", editor: "Article editor", categories: "Categories", comments: "Comments", subscribers: "Subscribers", ads: "Ads & monetization", media: "Media", security: "Security", settings: "Settings" };
  async function go(view, skipRefresh) {
    if (!V[view]) view = "dashboard";
    if (view !== "editor") editingId = null;
    if (!skipRefresh && ["dashboard", "articles", "categories", "comments", "subscribers", "editor"].includes(view)) {
      try { await refresh(); } catch (e) { console.warn(e); }
    }
    $("#view-host").innerHTML = V[view]();
    $("#page-title").textContent = TITLES[view];
    $$(".side-nav a").forEach((a) => a.classList.toggle("active", a.dataset.view === view));
    if (view !== "editor" && location.hash !== "#" + view) history.replaceState(null, "", "#" + view);
    if (view === "articles") renderArtRows();
    if (view === "editor") hookEditor();
    if (view === "settings") { const w = $("[data-whoami]"); if (w) w.textContent = window.__adminEmail || "—"; }
    bindBadges();
    $(".sidebar") && $(".sidebar").classList.remove("open");
  }
  function hookEditor() {
    const counts = { body: (el) => (el.value.trim() ? el.value.trim().split(/\s+/).length : 0) + " words", seoTitle: (el) => el.value.length, seoDesc: (el) => el.value.length };
    function upd() { $$("[data-count]").forEach((c) => { const f = c.dataset.count, el = $('[data-f="' + f + '"]'); if (el) c.textContent = counts[f] ? counts[f](el) : el.value.length; }); }
    const titleEl = $('[data-f="title"]'), slugEl = $('[data-f="slug"]');
    on(titleEl, "input", () => { if (slugEl) slugEl.value = A.slugify(titleEl.value); });
    $$("[data-f]").forEach((el) => on(el, "input", upd));
    upd();
  }
  async function saveArticle(status) {
    const get = (f) => { const el = $('[data-f="' + f + '"]'); return el ? el.value : ""; };
    const title = get("title").trim();
    if (!title) { const e = $('[data-e="title"]'); if (e) e.textContent = "A headline is required."; return; }
    const words = get("body").trim() ? get("body").trim().split(/\s+/).length : 0;
    const obj = {
      id: editingId || undefined, title: title, slug: A.slugify(title), category: get("category"),
      author: get("author").trim(), excerpt: get("excerpt").trim(), body: get("body").trim(), status: status,
      seoTitle: get("seoTitle").trim() || title, seoDesc: get("seoDesc").trim(), image_url: get("image_url").trim(),
      tags: [A.sections[get("category")].name], read: words ? Math.max(1, Math.round(words / 200)) + " min" : null
    };
    const res = await ADM.saveArticle(obj);
    if (res && res.error) { toast("Save failed: " + res.error.message); return; }
    toast(editingId ? "Article updated" : (status === "published" ? "Article published" : "Draft saved"));
    editingId = null; go("articles");
  }
  function bindBadges() {
    const ab = $('[data-badge="articles"]'); if (ab) ab.textContent = articles.length;
    const cb = $('[data-badge="comments"]'); if (cb) cb.textContent = comments.filter((c) => c.status === "pending").length;
  }

  /* ---------- APP EVENTS ---------- */
  function wireApp() {
    $$(".side-nav a").forEach((a) => on(a, "click", (e) => { e.preventDefault(); go(a.dataset.view); }));
    on($("#side-toggle"), "click", () => $(".sidebar").classList.toggle("open"));
    on($("#admin-theme"), "click", () => { const n = root.getAttribute("data-theme") === "dark" ? "light" : "dark"; root.setAttribute("data-theme", n); localStorage.setItem("axiom-theme", n); });
    on($("#logout"), "click", doSignOut);

    on($("#view-host"), "click", async (e) => {
      const t = e.target.closest("[data-go],[data-new-article],[data-edit],[data-del],[data-view-art],[data-save],[data-cmt-ok],[data-cmt-del],[data-export-subs],[data-save-settings],[data-save-pub],[data-sec-toggle],#logout2");
      if (!t) return;
      if (t.id === "logout2") return doSignOut();
      if (t.dataset.go) return go(t.dataset.go);
      if (t.hasAttribute("data-new-article")) { editingId = null; return go("editor"); }
      if (t.dataset.edit) { editingId = t.dataset.edit; return go("editor"); }
      if (t.dataset.viewArt) { const a = articles.find((x) => String(x.id) === String(t.dataset.viewArt)); if (a) window.open(A.articleHref(a.category, { id: a.id, t: a.title, read: a.read, sub: a.excerpt }), "_blank", "noopener"); return; }
      if (t.dataset.del) { if (confirm("Delete this article?")) { const r = await ADM.deleteArticle(t.dataset.del); if (r && r.error) return toast("Delete failed"); toast("Article deleted"); await go("articles"); } return; }
      if (t.dataset.save) return saveArticle(t.dataset.save);
      if (t.dataset.cmtOk) { await ADM.setComment(t.dataset.cmtOk, "approved"); toast("Comment approved"); return go("comments"); }
      if (t.dataset.cmtDel) { if (confirm("Delete comment?")) { await ADM.deleteComment(t.dataset.cmtDel); toast("Comment deleted"); return go("comments"); } return; }
      if (t.hasAttribute("data-export-subs")) return exportSubs();
      if (t.hasAttribute("data-save-settings")) return saveSettings();
      if (t.hasAttribute("data-save-pub")) { LS.set("adsense_pub", $("[data-ads-pub]").value.trim()); toast("Publisher ID saved"); return; }
      if (t.dataset.secToggle) { const st = secState(); st[t.dataset.secToggle] = !st[t.dataset.secToggle]; LS.set("sec", st); return go("security", true); }
    });
    on($("#view-host"), "change", (e) => {
      if (e.target.matches("[data-ad]")) { const ads = getAds().map((a) => a.id === e.target.dataset.ad ? Object.assign(a, { on: e.target.checked }) : a); LS.set("ads", ads); toast("Ad slot " + (e.target.checked ? "enabled" : "disabled")); }
      if (e.target.matches("[data-art-cat],[data-art-status]")) renderArtRows();
    });
    on($("#view-host"), "input", (e) => { if (e.target.matches("[data-art-search]")) renderArtRows(); });
  }
  function exportSubs() {
    const csv = "email,list,status,joined\n" + subs.map((s) => [s.email, s.list, s.status, (s.created_at || "").slice(0, 10)].join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" }), url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "axiom-subscribers.csv"; a.click(); URL.revokeObjectURL(url);
    toast("Exported " + subs.length + " subscriber" + (subs.length === 1 ? "" : "s"));
  }
  function saveSettings() {
    const s = {}; $$("[data-s]").forEach((el) => s[el.dataset.s] = el.value);
    LS.set("settings", s);
    toast("Settings saved");
  }
  async function doSignOut() { await ADM.signOut(); location.reload(); }

  /* ---------- AUTH GATE ---------- */
  async function showApp(email) {
    window.__adminEmail = email;
    $("#login").style.display = "none"; $("#app").style.display = "grid";
    const nm = $(".admin-user .nm"); if (nm) nm.textContent = email;
    const av = $(".admin-user .avatar"); if (av) av.textContent = (email[0] || "A").toUpperCase();
    try { await refresh(); } catch (e) { console.warn(e); }
    wireApp();
    go((location.hash || "#dashboard").slice(1), true);
  }
  function showLogin(msg, isError) {
    $("#app").style.display = "none"; $("#login").style.display = "grid";
    const err = $("#lg-err"); if (err) { err.style.color = isError ? "" : "var(--positive, #2faa6a)"; err.textContent = msg || ""; }
    const form = $("#login-form");
    if (form && !form.dataset.wired) {
      form.dataset.wired = "1";
      on(form, "submit", async (e) => {
        e.preventDefault();
        const email = ($("#lg-user").value || "").trim().toLowerCase();
        const e2 = $("#lg-err");
        if (!ADM.isAllowed(email)) { e2.style.color = ""; e2.textContent = "This email is not authorised for admin access."; return; }
        e2.style.color = ""; e2.textContent = "Sending magic link…";
        const redirect = location.origin + location.pathname;
        const res = await ADM.sendMagicLink(email, redirect);
        if (res && res.error) { e2.textContent = "Couldn't send link: " + res.error.message; }
        else { e2.style.color = "var(--positive, #2faa6a)"; e2.textContent = "✓ Magic link sent to " + email + ". Open it on this device to sign in."; }
      });
    }
  }

  async function start() {
    if (!ADM) { console.error("Supabase admin layer missing"); return; }
    const email = await ADM.currentEmail();
    if (email && ADM.isAllowed(email)) return showApp(email);
    if (email && !ADM.isAllowed(email)) { showLogin("Signed in as " + email + " — not an admin. Sign out and use an authorised email.", true); return; }
    showLogin("");
    // react to returning from the magic link
    ADM.onChange(async (session) => {
      const e = session && session.user ? (session.user.email || "").toLowerCase() : null;
      if (e && ADM.isAllowed(e)) showApp(e);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
