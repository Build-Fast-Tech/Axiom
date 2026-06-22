/* =====================================================================
   AXIOM — Supabase integration
   Public reads use the publishable key (safe to expose; RLS protects data).
   Admin uses Supabase Auth; writes are allowed by RLS only for the two
   allow-listed admin emails (enforced server-side via public.is_admin()).
   Requires supabase.min.js (UMD) loaded first.
   ===================================================================== */
(function () {
  "use strict";
  var SUPABASE_URL = "https://aiupteocubknkbgchtme.supabase.co";
  var SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-5TKJxNdCUP7l_q67tU_Yg_IxI1xt6k";
  if (!window.supabase || !window.supabase.createClient) { console.error("supabase-js not loaded"); return; }
  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  // DB row -> the shape the renderers expect
  function mapRow(r) {
    return {
      id: r.id, title: r.title, category: r.category, excerpt: r.excerpt || "",
      body: r.body || "", author: r.author || "", status: r.status,
      read: r.read_time || "", tags: r.tags || [],
      date: (r.published_at || r.created_at || "").slice(0, 10),
      image_url: r.image_url || "", seoTitle: r.seo_title || "", seoDesc: r.seo_description || ""
    };
  }
  var clean = function (s) { return String(s == null ? "" : s).replace(/[%_,()]/g, " ").trim(); };

  /* ---------- PUBLIC (publishable key) ---------- */
  window.AXIOM_DB = {
    client: sb,
    async published(limit) {
      var q = sb.from("articles").select("*").eq("status", "published").order("published_at", { ascending: false, nullsFirst: false }).limit(limit || 60);
      var r = await q; if (r.error) { console.warn("published:", r.error.message); return []; } return r.data.map(mapRow);
    },
    async bySection(slug, limit) {
      var r = await sb.from("articles").select("*").eq("status", "published").eq("category", slug).order("published_at", { ascending: false, nullsFirst: false }).limit(limit || 60);
      if (r.error) { console.warn("bySection:", r.error.message); return []; } return r.data.map(mapRow);
    },
    async byId(id) {
      var r = await sb.from("articles").select("*").eq("id", id).maybeSingle();
      if (r.error || !r.data) return null; return mapRow(r.data);
    },
    async search(qstr) {
      var t = clean(qstr); if (!t) return [];
      var r = await sb.from("articles").select("*").eq("status", "published").ilike("title", "%" + t + "%").limit(8);
      if (r.error) return []; return r.data.map(mapRow);
    },
    async subscribe(email) { return await sb.from("subscribers").insert({ email: email }); },
    async submitComment(articleId, name, body) {
      return await sb.from("comments").insert({ article_id: articleId, author_name: name, body: body, status: "pending" });
    },
    async approvedComments(articleId) {
      var r = await sb.from("comments").select("*").eq("article_id", articleId).eq("status", "approved").order("created_at", { ascending: false });
      return r.error ? [] : r.data;
    }
  };

  /* ---------- ADMIN (Supabase Auth + writes) ---------- */
  window.AXIOM_ADMIN = {
    client: sb,
    ADMIN_EMAILS: ["abdullah.xf90@gmail.com", "i250072@isb.nu.edu.pk"],
    isAllowed: function (email) { return this.ADMIN_EMAILS.indexOf(String(email || "").trim().toLowerCase()) > -1; },
    async getSession() { var r = await sb.auth.getSession(); return r.data ? r.data.session : null; },
    async currentEmail() { var s = await this.getSession(); return s && s.user ? (s.user.email || "").toLowerCase() : null; },
    onChange: function (cb) { return sb.auth.onAuthStateChange(function (_e, session) { cb(session); }); },
    async sendMagicLink(email, redirect) {
      return await sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: redirect, shouldCreateUser: true } });
    },
    async signInPassword(email, password) { return await sb.auth.signInWithPassword({ email: email, password: password }); },
    async signOut() { return await sb.auth.signOut(); },
    // articles (RLS: only admin emails may write)
    async listArticles() { var r = await sb.from("articles").select("*").order("created_at", { ascending: false }); return r.error ? [] : r.data.map(mapRow); },
    async saveArticle(a) {
      var row = {
        title: a.title, slug: a.slug || null, excerpt: a.excerpt || null, body: a.body || null,
        category: a.category, author: a.author || null, status: a.status,
        tags: a.tags || [], read_time: a.read || null, image_url: a.image_url || null,
        seo_title: a.seoTitle || null, seo_description: a.seoDesc || null
      };
      if (a.id) return await sb.from("articles").update(row).eq("id", a.id);
      return await sb.from("articles").insert(row);
    },
    async deleteArticle(id) { return await sb.from("articles").delete().eq("id", id); },
    // comments
    async listComments() { var r = await sb.from("comments").select("*").order("created_at", { ascending: false }); return r.error ? [] : r.data; },
    async setComment(id, status) { return await sb.from("comments").update({ status: status }).eq("id", id); },
    async deleteComment(id) { return await sb.from("comments").delete().eq("id", id); },
    // subscribers
    async listSubscribers() { var r = await sb.from("subscribers").select("*").order("created_at", { ascending: false }); return r.error ? [] : r.data; }
  };
})();
