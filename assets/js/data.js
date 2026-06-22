/* =====================================================================
   AXIOM — content data layer
   Section taxonomy is real/structural. There is NO sample article content:
   articles are created in the admin and stored in localStorage, then
   rendered across the site. With none created, the site shows empty states.
   ===================================================================== */
/* One-time cleanup: earlier demo builds seeded fake articles/comments/subs
   into localStorage. Purge that stale demo data once so nothing fake lingers
   in a browser that opened a previous version. User-created content created
   after this runs is preserved. */
(function () {
  try {
    var KEY = "axiom-store-v", CURRENT = "2";
    if (localStorage.getItem(KEY) !== CURRENT) {
      ["articles", "comments", "subs", "ads"].forEach(function (k) { localStorage.removeItem("axiom-admin-" + k); });
      localStorage.setItem(KEY, CURRENT);
    }
  } catch (e) {}
})();

window.AXIOM = (function () {
  const sections = {
    world:      { name: "World",        g: "g-world",  blurb: "Global affairs, conflict and the forces reshaping the international order.", topics: ["Politics", "Climate", "Migration", "Elections", "Conflict", "Americas", "Europe", "Asia"] },
    business:   { name: "Business",     g: "g-biz",    blurb: "Markets, economics and the companies moving them.", topics: ["Markets", "Economy", "Deals", "Startups", "Energy", "Real Estate"] },
    technology: { name: "Technology",   g: "g-tech",   blurb: "The companies, chips and code shaping how we live and work.", topics: ["AI", "Gadgets", "Software", "Security", "Chips", "Big Tech", "Reviews"] },
    ai:         { name: "AI",           g: "g-ai",     blurb: "Artificial intelligence, from frontier research to products and policy.", topics: ["Research", "Products", "Policy", "Ethics", "Open Source"] },
    science:    { name: "Science",      g: "g-sci",    blurb: "Space, climate and discovery at the edge of what we know.", topics: ["Space", "Climate", "Physics", "Biology", "Environment"] },
    sport:      { name: "Sport",        g: "g-sport",  blurb: "The games, the rivalries and the moments that matter.", topics: ["Football", "Basketball", "Tennis", "Cricket", "F1", "Olympics"] },
    culture:    { name: "Culture",      g: "g-ent",    blurb: "Film, music, books and the ideas shaping the way we live now.", topics: ["Film", "Music", "Books", "TV", "Art", "Gaming"] },
    health:     { name: "Health",       g: "g-health", blurb: "Evidence-led reporting on medicine, wellbeing and living better.", topics: ["Wellbeing", "Medicine", "Nutrition", "Mental Health", "Fitness"] },
    travel:     { name: "Travel",       g: "g-travel", blurb: "Where to go, how to go and why it's worth it.", topics: ["Destinations", "Guides", "Food", "Adventure", "City Breaks"] },
    lifestyle:  { name: "Lifestyle",    g: "g-life",   blurb: "Design, food, money and the everyday choices that add up to a life.", topics: ["Design", "Food", "Money", "Home", "Style"] },
    gaming:     { name: "Gaming",       g: "g-game",   blurb: "Reviews, releases and the business of play.", topics: ["Reviews", "Releases", "Esports", "Industry", "Hardware"] },
    live:       { name: "Live",         g: "g-pol",    blurb: "Breaking news and live coverage as it happens.", topics: ["Breaking", "Updates", "On the ground"] }
  };

  // No sample stories — content comes from the admin (localStorage).
  const stories = {};
  Object.keys(sections).forEach((k) => { stories[k] = []; });

  function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
  function articleHref(catSlug, story) {
    const id = story && story.id != null ? "&id=" + encodeURIComponent(story.id) : "";
    const sec = sections[catSlug] ? catSlug : "world";
    return "article.html?cat=" + encodeURIComponent(sec) +
      "&t=" + encodeURIComponent(story && story.t ? story.t : "") +
      "&r=" + encodeURIComponent(story && story.read ? story.read : "") +
      (story && story.sub ? "&d=" + encodeURIComponent(story.sub) : "") + id;
  }
  function categoryHref(catSlug) { return "category.html?cat=" + encodeURIComponent(catSlug); }

  const labelToSlug = {};
  Object.keys(sections).forEach((k) => { labelToSlug[sections[k].name.toLowerCase()] = k; });
  Object.assign(labelToSlug, {
    "politics": "world", "markets": "business", "economy": "business", "deals": "business",
    "startups": "business", "energy": "business", "real estate": "business",
    "artificial intelligence": "ai", "space": "science", "climate": "science",
    "gadgets": "technology", "software": "technology", "security": "technology", "chips": "technology",
    "big tech": "technology", "reviews": "technology", "film": "culture", "music": "culture",
    "books": "culture", "tv": "culture", "art": "culture", "regions": "world",
    "united states": "world", "europe": "world", "asia & pacific": "world", "middle east": "world",
    "africa": "world", "americas": "world", "migration": "world", "elections": "world",
    "conflict & security": "world", "wellbeing": "health", "design": "lifestyle", "food": "travel"
  });

  // Shared article store (admin-managed). Public pages read from here.
  function getArticles() { try { return JSON.parse(localStorage.getItem("axiom-admin-articles")) || []; } catch (e) { return []; } }
  function published() { return getArticles().filter((a) => a.status === "published").sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.id - a.id); }
  function bySection(slug) { return published().filter((a) => a.category === slug); }
  function byId(id) { return getArticles().find((a) => String(a.id) === String(id)); }
  // normalise an admin article record to the {t, read, sub, id} shape used by renderers
  function toStory(a) { return { id: a.id, t: a.title, read: a.read || "", sub: a.excerpt || "", category: a.category }; }

  return { sections, stories, all: [], slugify, articleHref, categoryHref, labelToSlug, getArticles, published, bySection, byId, toStory };
})();
