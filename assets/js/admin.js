/* =====================================================================
   AXIOM Admin — dashboard logic
   NOTE: This is a FRONT-END DEMO. The login gate is client-side only and is
   NOT real security. In production, enforce authentication/authorization
   server-side (Supabase Auth + RLS) and put this page behind it.
   No sample/fake data: everything starts empty and reflects what you create.
   Content is stored in localStorage and shared with the public site.
   ===================================================================== */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);
  const A = window.AXIOM || { sections: {}, slugify: (s) => s, articleHref: () => "#" };
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const LS = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem("axiom-admin-" + k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { localStorage.setItem("axiom-admin-" + k, JSON.stringify(v)); }
  };
  const todayStr = () => new Date().toISOString().slice(0, 10);

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
    t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2600);
  }

  /* ---------- AUTH (demo, client-side only) ---------- */
  const DEMO_USER = "admin", DEMO_PASS = "axiom2026";
  function isAuthed() { return sessionStorage.getItem("axiom-admin-auth") === "1"; }

  /* ---------- STORES (empty by default) ---------- */
  const getArticles = () => LS.get("articles", []);
  const getComments = () => LS.get("comments", []);
  const getSubs = () => LS.get("subs", []);
  function getAds() {
    // ad-slot configuration (real structure, not content) — created once
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
    { phase: "Core Security", note: "Applies to the live deployment.", items: [
      { id: "https", t: "HTTPS enforced site-wide, no mixed content", s: "pass", d: "All assets load over HTTPS or relative paths. Enforce HSTS at the host (see vercel.json)." },
      { id: "secrets", t: "No secrets/credentials committed", s: "pass", d: "No API keys or secrets in the front-end. Use host environment variables for any keys." },
      { id: "csp", t: "Content-Security-Policy + security headers", s: "pass", d: "CSP meta on every page; full header set in vercel.json (X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy)." },
      { id: "rls", t: "Row Level Security (RLS) on all DB tables", s: "na", d: "No database in this build. With Supabase, enable RLS on every table and test with multiple roles." },
      { id: "authroutes", t: "Protected routes require authentication", s: "action", d: "Admin uses a CLIENT-SIDE demo gate only — not real security. Put admin behind Supabase Auth + server checks before launch." }
    ]},
    { phase: "OWASP Checks", note: "Run OWASP ZAP against the deployed URL.", items: [
      { id: "xss", t: "Cross-Site Scripting (XSS)", s: "pass", d: "Dynamic rendering uses textContent / escaped innerHTML / encodeURIComponent. URL params are escaped before display." },
      { id: "sqli", t: "SQL Injection", s: "na", d: "No SQL/server queries. Use the Supabase client / parameterized queries when a DB is added." },
      { id: "brokenauth", t: "Broken Authentication / sessions", s: "action", d: "No real session system yet. With Supabase Auth: short-lived JWTs, secure cookies, server-verified sessions." },
      { id: "zap", t: "Automated OWASP ZAP scan completed", s: "action", d: "Run a ZAP baseline scan after deploy and wire it into CI." }
    ]},
    { phase: "API & Data Access", note: "For when the backend exists.", items: [
      { id: "idor", t: "Cannot access other users' data via API (IDOR)", s: "na", d: "No API in this build. Test every endpoint in Burp Suite with different user tokens before launch." },
      { id: "ratelimit", t: "Rate limiting on sensitive endpoints", s: "na", d: "No server endpoints yet. Add limits to auth, newsletter and payment routes." },
      { id: "validation", t: "Input validated at boundaries", s: "pass", d: "Client-side validation on the newsletter + editor. Re-validate server-side once a backend exists." }
    ]},
    { phase: "Automation & Review", note: "CI / process.", items: [
      { id: "ci", t: "Security scanning automated in CI", s: "action", d: "No repo/CI yet. Add GitHub Actions to run dependency + ZAP scans on every PR to main." },
      { id: "deps", t: "No vulnerable dependencies", s: "pass", d: "Zero third-party JS/CSS dependencies and no build step — minimal supply-chain surface." },
      { id: "review", t: "Automated code review before deploy", s: "action", d: "Add CodeRabbit / required PR review before merge." }
    ]}
  ];
  const secState = () => LS.get("sec", {});
  function secCounts() { let pass = 0, action = 0, na = 0, total = 0; SECURITY.forEach((p) => p.items.forEach((i) => { total++; i.s === "pass" ? pass++ : i.s === "action" ? action++ : na++; })); return { pass, action, na, total }; }

  /* ---------- VIEWS ---------- */
  const V = {};

  V.dashboard = function () {
    const arts = getArticles(), subs = getSubs(), comments = getComments();
    const published = arts.filter((a) => a.status === "published").length;
    const drafts = arts.filter((a) => a.status === "draft").length;
    const pending = comments.filter((c) => c.status === "pending").length;
    const top = arts.slice().sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
    return `
      <div class="stat-grid">
        ${statCard("Published", published, "live on the site", "M4 19V5l16 7z")}
        ${statCard("Drafts", drafts, "in your library", "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z")}
        ${statCard("Comments pending", pending, "awaiting moderation", "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z")}
        ${statCard("Subscribers", subs.length, "newsletter audience", "M16 21v-2a4 4 0 0 0-8 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z")}
      </div>
      <div class="cols-2">
        <div class="panel"><div class="panel__head"><h3>Traffic</h3><span class="note-src">Not connected</span></div>
          <div class="panel__body"><div class="empty" style="border:none;background:transparent">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="3 17 9 11 13 15 21 7"/></svg>
            <h3>No analytics connected</h3><p>Connect an analytics provider (e.g. Plausible or GA4) to see traffic, page views and Core Web Vitals here.</p></div></div>
        </div>
        <div class="panel"><div class="panel__head"><h3>Top articles</h3><a class="more" href="#articles" data-go="articles" style="font-size:12px;color:var(--text-2)">View all</a></div>
          <div class="panel__body" style="padding:6px 18px 12px">
            ${top.length ? top.map((a, i) => `<div style="display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
              <span style="font-family:var(--font-display);font-weight:600;color:var(--accent);font-size:16px;width:18px">${i + 1}</span>
              <span style="font-size:13.5px;color:var(--ink);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.title)}</span>
              <span class="muted" style="font-size:12px;white-space:nowrap">${a.status}</span></div>`).join("")
              : `<div class="empty" style="border:none;background:transparent"><h3>No articles yet</h3><p>Create your first story in the Articles tab.</p></div>`}
          </div>
        </div>
      </div>
      <div class="panel" style="margin-top:16px"><div class="panel__head"><h3>Get started</h3></div>
        <div class="panel__body" style="padding:6px 18px 14px">
          ${checklist([
            [arts.length > 0, "Publish your first article", "Articles → New article"],
            [subs.length > 0, "Grow your newsletter list", "Audience → Subscribers"],
            [!!LS.get("adsense_pub", ""), "Add your AdSense publisher ID", "Ads & revenue"],
            [false, "Run the pre-launch security checklist", "Security tab"]
          ])}
        </div>
      </div>`;
  };
  function statCard(lbl, num, sub, path) {
    return `<div class="stat"><div class="lbl"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>${esc(lbl)}</div><div class="num">${num}</div><div class="delta" style="color:var(--text-3)">${esc(sub)}</div></div>`;
  }
  function checklist(rows) {
    return rows.map((r) => `<div style="display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
      <span style="width:18px;height:18px;border-radius:5px;border:1.5px solid ${r[0] ? "var(--positive)" : "var(--border-strong)"};background:${r[0] ? "var(--positive)" : "transparent"};display:grid;place-items:center;color:#fff;flex:none">${r[0] ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>' : ""}</span>
      <span style="font-size:13.5px;color:var(--ink);${r[0] ? "text-decoration:line-through;color:var(--text-3)" : ""}">${esc(r[1])}</span>
      <span class="muted" style="margin-left:auto;font-size:12px">${esc(r[2])}</span></div>`).join("");
  }

  V.articles = function () {
    return `<div class="view__head"><div class="sub">Your article library</div>
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
    let arts = getArticles().slice().sort((a, b) => b.id - a.id);
    arts = arts.filter((a) => (!q || a.title.toLowerCase().includes(q)) && (!fc || a.category === fc) && (!fs || a.status === fs));
    if (!arts.length) { body.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:44px;color:var(--text-3)">${getArticles().length ? "No articles match your filters." : "No articles yet — click “New article” to create your first story."}</td></tr>`; return; }
    body.innerHTML = arts.map((a) => `<tr data-id="${a.id}">
      <td class="ttl">${esc(a.title)}</td>
      <td>${esc(A.sections[a.category] ? A.sections[a.category].name : a.category)}</td>
      <td>${esc(a.author || "—")}</td>
      <td><span class="badge-st st-${a.status}">${a.status === "review" ? "In review" : a.status[0].toUpperCase() + a.status.slice(1)}</span></td>
      <td class="muted">${esc(a.date || "—")}</td>
      <td><div class="row-actions">
        <button class="icon-act" data-edit="${a.id}" title="Edit"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>
        <button class="icon-act" data-view-art="${a.id}" title="Preview"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg></button>
        <button class="icon-act danger" data-del="${a.id}" title="Delete"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6m5 0V4h4v2"/></svg></button>
      </div></td></tr>`).join("");
  }

  let editingId = null;
  V.editor = function () {
    const a = editingId ? getArticles().find((x) => x.id === editingId) : null;
    const cats = Object.keys(A.sections);
    return `<div class="view__head"><div class="sub">${a ? "Editing article #" + a.id : "Draft a new story"}</div>
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
          <div class="side-box"><h4>SEO</h4>
            <div class="fld"><label>SEO title</label><input data-f="seoTitle" value="${esc(a ? a.seoTitle : "")}" maxlength="70"><div class="hint"><span>Aim ≤ 60 chars</span><span data-count="seoTitle">0</span></div></div>
            <div class="fld"><label>Meta description</label><textarea data-f="seoDesc" maxlength="170">${esc(a ? a.seoDesc : "")}</textarea><div class="hint"><span>Aim ≤ 155 chars</span><span data-count="seoDesc">0</span></div></div>
            <div class="fld"><label>URL slug</label><input data-f="slug" value="${esc(a ? A.slugify(a.title) : "")}" readonly style="color:var(--text-3)"></div>
          </div>
        </div>
      </div>`;
  };

  V.categories = function () {
    const arts = getArticles();
    const rows = Object.keys(A.sections).map((k) => {
      const cnt = arts.filter((a) => a.category === k).length;
      return `<tr><td class="ttl">${esc(A.sections[k].name)}</td><td class="muted">/${k}</td><td>${cnt}</td><td class="muted">${esc(A.sections[k].topics.slice(0, 4).join(", "))}</td></tr>`;
    }).join("");
    return `<div class="view__head"><div class="sub">${Object.keys(A.sections).length} sections</div></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Slug</th><th>Articles</th><th>Top topics</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  };

  V.comments = function () {
    return `<div class="view__head"><div class="sub">Moderate reader comments</div></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Author</th><th>Comment</th><th>On</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead><tbody data-cmt-body></tbody></table></div>`;
  };
  function renderComments() {
    const body = $("[data-cmt-body]"); if (!body) return;
    const c = getComments();
    if (!c.length) { body.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:44px;color:var(--text-3)">No comments yet. Reader comments appear here once a comment backend is connected.</td></tr>`; return; }
    body.innerHTML = c.map((m) => `<tr data-cid="${m.id}">
      <td class="ttl">${esc(m.name)}</td><td style="max-width:380px">${esc(m.text)}</td>
      <td class="muted" style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.on)}</td>
      <td><span class="badge-st st-${m.status}">${m.status[0].toUpperCase() + m.status.slice(1)}</span></td>
      <td><div class="row-actions">
        <button class="icon-act" data-cmt-ok="${m.id}" title="Approve"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></button>
        <button class="icon-act danger" data-cmt-del="${m.id}" title="Delete"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
      </div></td></tr>`).join("");
  }

  V.subscribers = function () {
    const subs = getSubs();
    return `<div class="view__head"><div class="sub">Newsletter audience</div>
        <button class="btn btn--ghost" data-export-subs><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Export CSV</button></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Email</th><th>List</th><th>Status</th><th>Joined</th></tr></thead><tbody>
        ${subs.length ? subs.map((s) => `<tr><td class="ttl">${esc(s.email)}</td><td>${esc(s.list)}</td><td><span class="badge-st st-${s.status === "active" ? "approved" : "pending"}">${esc(s.status)}</span></td><td class="muted">${esc(s.date)}</td></tr>`).join("")
          : `<tr><td colspan="4" style="text-align:center;padding:44px;color:var(--text-3)">No subscribers yet. Connect the newsletter form to an email service (e.g. Resend) to collect sign-ups.</td></tr>`}
      </tbody></table></div>`;
  };

  V.ads = function () {
    const ads = getAds();
    return `<div class="view__head"><div class="sub">AdSense placements &amp; monetization</div></div>
      <div class="side-box" style="max-width:520px"><h4>AdSense account</h4>
        <div class="fld"><label>Publisher ID</label><input data-ads-pub value="${esc(LS.get("adsense_pub", ""))}" placeholder="ca-pub-XXXXXXXXXXXXXXXX"></div>
        <button class="btn btn--primary btn--sm" data-save-pub>Save</button>
        <p class="muted" style="font-size:12px;margin-top:10px">Slots below map to the live ad positions. Toggle to enable/disable; paste each unit's code when you go live.</p>
      </div>
      <div class="tbl-wrap" style="margin-top:16px"><table class="tbl"><thead><tr><th>Slot</th><th>Size</th><th>Where</th><th>Enabled</th></tr></thead><tbody>
        ${ads.map((a) => `<tr><td class="ttl">${esc(a.name)}</td><td class="muted">${esc(a.size)}</td><td>${esc(a.page)}</td>
          <td><label class="switch"><input type="checkbox" data-ad="${a.id}" ${a.on ? "checked" : ""}><span class="track"></span></label></td></tr>`).join("")}
      </tbody></table></div>`;
  };

  V.media = function () {
    return `<div class="view__head"><div class="sub">Media library</div><button class="btn btn--ghost" data-upload><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload</button></div>
      <div class="empty"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg><h3>No media uploaded</h3><p>Connect a storage provider (e.g. Supabase Storage or S3) to upload and manage images here.</p></div>`;
  };

  V.security = function () {
    const c = secCounts(), state = secState();
    return `<div class="view__head"><div class="sub">Pre-production security audit · sourced from your Website Build Checklist</div></div>
      <div class="sec-summary">
        ${secStat("Applicable &amp; passing", c.pass, "pill-pass")}
        ${secStat("Action before launch", c.action, "pill-action")}
        ${secStat("Not applicable (static)", c.na, "pill-na")}
        ${secStat("Audit coverage", c.total + " checks", "pill-pass")}
      </div>
      <div class="panel" style="margin-bottom:22px"><div class="panel__body" style="display:flex;gap:14px;align-items:flex-start">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" style="flex:none;margin-top:1px"><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>
        <p style="font-size:13.5px;color:var(--text-2)"><b style="color:var(--ink)">Honest status:</b> this is a static front-end, so database/API/auth checks are <span class="pill pill-na">N/A</span> until a backend is added. This admin login is a <b>client-side demo only</b> — real auth must be enforced server-side (Supabase Auth + RLS) before launch.</p>
      </div></div>
      ${SECURITY.map((p) => `<div class="sec-phase"><h3>${esc(p.phase)}</h3><div class="ph-note">${esc(p.note)}</div>
        ${p.items.map((i) => { const done = !!state[i.id]; return `<div class="sec-item ${done ? "done" : ""}" data-sec="${i.id}">
          <button class="chk" data-sec-toggle="${i.id}" aria-label="toggle"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></button>
          <div><div class="ti">${esc(i.t)}</div><div class="de">${esc(i.d)}</div></div>
          <span class="pill pill-${i.s}">${i.s === "pass" ? "Pass" : i.s === "action" ? "Action" : "N/A"}</span></div>`; }).join("")}</div>`).join("")}`;
  };
  function secStat(lbl, num, cls) { return `<div class="stat"><div class="lbl">${lbl}</div><div class="num">${num}</div><div style="margin-top:8px"><span class="pill ${cls}">&nbsp;</span></div></div>`; }

  V.settings = function () {
    const s = settings();
    return `<div class="view__head"><div class="sub">Site configuration</div></div>
      <div class="form-grid"><div>
        <div class="side-box"><h4>General</h4>
          <div class="fld"><label>Site name</label><input data-s="site" value="${esc(s.site)}"></div>
          <div class="fld"><label>Tagline</label><input data-s="tagline" value="${esc(s.tagline)}"></div>
          <div class="fld"><label>Articles per page</label><input type="number" data-s="perPage" value="${esc(s.perPage)}" min="4" max="40"></div>
        </div>
        <div class="side-box"><h4>Appearance</h4>
          <div class="fld"><label>Accent colour</label><input type="color" data-s="accent" value="${esc(s.accent)}" style="height:42px;padding:4px"></div>
          <div class="fld"><label>Default theme</label><select data-s="theme"><option value="light" ${s.theme === "light" ? "selected" : ""}>Light</option><option value="dark" ${s.theme === "dark" ? "selected" : ""}>Dark</option></select></div>
        </div>
        <div class="side-box"><h4>Integrations · live data</h4>
          <div class="fld"><label>Weather — location label</label><input data-s="wloc" value="${esc(s.wloc || "New York")}"></div>
          <div class="fld"><label>Weather — latitude</label><input data-s="wlat" value="${esc(s.wlat != null ? s.wlat : "40.71")}"></div>
          <div class="fld"><label>Weather — longitude</label><input data-s="wlon" value="${esc(s.wlon != null ? s.wlon : "-74.01")}"></div>
          <div class="fld"><label>Stocks — Finnhub API key</label><input data-s="stockKey" value="${esc(s.stockKey || "")}" placeholder="free key from finnhub.io"></div>
          <p class="muted" style="font-size:12px;line-height:1.55">Weather &amp; crypto are live with no key needed. Stocks use a free <b>Finnhub</b> key (indices shown via SPY / DIA / QQQ). Get coordinates from latlong.net.</p>
        </div>
        <button class="btn btn--primary" data-save-settings>Save settings</button>
      </div>
      <div><div class="side-box"><h4>Danger zone</h4>
        <p class="muted" style="font-size:13px;margin-bottom:12px">Remove all content stored in this browser (articles, comments, subscribers, settings).</p>
        <button class="btn btn--ghost" data-reset style="border-color:var(--negative);color:var(--negative)">Clear all data</button>
      </div></div></div>`;
  };

  /* ---------- ROUTER ---------- */
  const TITLES = { dashboard: "Dashboard", articles: "Articles", editor: "Article editor", categories: "Categories", comments: "Comments", subscribers: "Subscribers", ads: "Ads & monetization", media: "Media library", security: "Security", settings: "Settings" };
  function go(view) {
    if (!V[view]) view = "dashboard";
    if (view !== "editor") editingId = null;
    $("#view-host").innerHTML = V[view]();
    $("#page-title").textContent = TITLES[view];
    $$(".side-nav a").forEach((a) => a.classList.toggle("active", a.dataset.view === view));
    if (view !== "editor" && location.hash !== "#" + view) history.replaceState(null, "", "#" + view);
    if (view === "articles") renderArtRows();
    if (view === "comments") renderComments();
    if (view === "editor") hookEditor();
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
  function saveArticle(status) {
    const get = (f) => { const el = $('[data-f="' + f + '"]'); return el ? el.value : ""; };
    const title = get("title").trim();
    if (!title) { const e = $('[data-e="title"]'); if (e) e.textContent = "A headline is required."; return; }
    let arts = getArticles();
    const words = get("body").trim() ? get("body").trim().split(/\s+/).length : 0;
    const data = { title, category: get("category"), author: get("author").trim(), excerpt: get("excerpt").trim(),
      body: get("body").trim(), status, seoTitle: get("seoTitle").trim() || title, seoDesc: get("seoDesc").trim(),
      tags: [A.sections[get("category")].name], read: words ? Math.max(1, Math.round(words / 200)) + " min" : "" };
    if (editingId) { const i = arts.findIndex((a) => a.id === editingId); if (i > -1) arts[i] = Object.assign(arts[i], data); toast("Article updated"); }
    else { data.id = Math.max(0, ...arts.map((a) => a.id)) + 1; data.views = 0; data.date = todayStr(); arts.push(data); toast(status === "published" ? "Article published" : "Draft saved"); }
    LS.set("articles", arts); go("articles");
  }

  function bindBadges() {
    const ab = $('[data-badge="articles"]'); if (ab) ab.textContent = getArticles().length;
    const cb = $('[data-badge="comments"]'); if (cb) cb.textContent = getComments().filter((c) => c.status === "pending").length;
  }

  function boot() {
    $$(".side-nav a").forEach((a) => on(a, "click", (e) => { e.preventDefault(); go(a.dataset.view); }));
    on($("#side-toggle"), "click", () => $(".sidebar").classList.toggle("open"));
    on($("#admin-theme"), "click", () => { const n = root.getAttribute("data-theme") === "dark" ? "light" : "dark"; root.setAttribute("data-theme", n); localStorage.setItem("axiom-theme", n); });
    on($("#logout"), "click", () => { sessionStorage.removeItem("axiom-admin-auth"); location.reload(); });

    on($("#view-host"), "click", (e) => {
      const t = e.target.closest("[data-go],[data-new-article],[data-edit],[data-del],[data-view-art],[data-save],[data-cmt-ok],[data-cmt-del],[data-export-subs],[data-save-settings],[data-reset],[data-save-pub],[data-upload],[data-sec-toggle]");
      if (!t) return;
      if (t.dataset.go) return go(t.dataset.go);
      if (t.hasAttribute("data-new-article")) { editingId = null; return go("editor"); }
      if (t.dataset.edit) { editingId = +t.dataset.edit; return go("editor"); }
      if (t.dataset.viewArt) { const a = getArticles().find((x) => x.id === +t.dataset.viewArt); if (a) window.open(A.articleHref(a.category, { id: a.id, t: a.title, read: a.read, sub: a.excerpt }), "_blank", "noopener"); return; }
      if (t.dataset.del) { if (confirm("Delete this article?")) { LS.set("articles", getArticles().filter((a) => a.id !== +t.dataset.del)); renderArtRows(); bindBadges(); toast("Article deleted"); } return; }
      if (t.dataset.save) return saveArticle(t.dataset.save);
      if (t.dataset.cmtOk || t.dataset.cmtDel) {
        let c = getComments(); const id = +(t.dataset.cmtOk || t.dataset.cmtDel);
        c = t.dataset.cmtDel ? c.filter((m) => m.id !== id) : c.map((m) => m.id === id ? Object.assign(m, { status: "approved" }) : m);
        LS.set("comments", c); renderComments(); bindBadges(); toast("Comment updated"); return;
      }
      if (t.hasAttribute("data-export-subs")) return exportSubs();
      if (t.hasAttribute("data-save-settings")) return saveSettings();
      if (t.hasAttribute("data-save-pub")) { LS.set("adsense_pub", $("[data-ads-pub]").value.trim()); toast("Publisher ID saved"); return; }
      if (t.hasAttribute("data-upload")) { toast("Connect a storage provider to upload media"); return; }
      if (t.hasAttribute("data-reset")) { if (confirm("Clear ALL stored data in this browser?")) { ["articles", "comments", "subs", "ads", "settings", "sec", "adsense_pub"].forEach((k) => localStorage.removeItem("axiom-admin-" + k)); toast("All data cleared"); go("dashboard"); } return; }
      if (t.dataset.secToggle) { const st = secState(); st[t.dataset.secToggle] = !st[t.dataset.secToggle]; LS.set("sec", st); go("security"); return; }
    });
    on($("#view-host"), "change", (e) => {
      if (e.target.matches("[data-ad]")) { const ads = getAds().map((a) => a.id === e.target.dataset.ad ? Object.assign(a, { on: e.target.checked }) : a); LS.set("ads", ads); toast("Ad slot " + (e.target.checked ? "enabled" : "disabled")); }
      if (e.target.matches("[data-art-cat],[data-art-status]")) renderArtRows();
    });
    on($("#view-host"), "input", (e) => { if (e.target.matches("[data-art-search]")) renderArtRows(); });

    bindBadges();
    go((location.hash || "#dashboard").slice(1));
  }

  function exportSubs() {
    const subs = getSubs();
    const csv = "email,list,status,joined\n" + subs.map((s) => [s.email, s.list, s.status, s.date].join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" }), url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "axiom-subscribers.csv"; a.click(); URL.revokeObjectURL(url);
    toast("Exported " + subs.length + " subscriber" + (subs.length === 1 ? "" : "s"));
  }
  function saveSettings() {
    const s = {}; $$("[data-s]").forEach((el) => s[el.dataset.s] = el.type === "number" ? +el.value : el.value);
    LS.set("settings", s);
    if (s.accent) document.documentElement.style.setProperty("--accent", s.accent);
    toast("Settings saved");
  }

  /* ---------- START ---------- */
  function start() {
    if (!isAuthed()) {
      $("#app").style.display = "none"; $("#login").style.display = "grid";
      on($("#login-form"), "submit", (e) => {
        e.preventDefault();
        const u = $("#lg-user").value.trim(), p = $("#lg-pass").value, err = $("#lg-err");
        if (u === DEMO_USER && p === DEMO_PASS) { sessionStorage.setItem("axiom-admin-auth", "1"); location.reload(); }
        else err.textContent = "Invalid credentials. Use the demo login shown below.";
      });
      return;
    }
    $("#login").style.display = "none"; $("#app").style.display = "grid";
    boot();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
