# Axiom — Design & Strategy Document

A premium, original news portal built to compete on engagement, SEO and AdSense
revenue with BBC, CNN, Bloomberg, Reuters and Yahoo News. The reference
("snug." magazine) was used only as loose inspiration — this is a clean-sheet design.

- **Brand:** Axiom
- **Accent:** Signal Red `#E11D2A`
- **Aesthetic:** Bloomberg premium · Apple minimalism · modern magazine
- **Stack:** Hand-built HTML5 + CSS (design-token system) + vanilla JS. No frameworks, no build step — opens by double-clicking `index.html`.

---

## 0. Decisions locked before designing (the strategy questions, answered)

| Question | Decision | Why |
|---|---|---|
| Primary goal | **AdSense revenue**, with newsletter as the retention engine | Page views + session depth drive ad RPM; email brings them back |
| Target markets | Global, **US-first** English | Highest CPMs; widest reach |
| Language | English (i18n-ready: one `lang` attr, semantic structure) | Scope control now, expandable later |
| Device priority | **Mobile-first, desktop-enhanced** | ~70% of news traffic is mobile |
| Design direction | Bloomberg + Apple + magazine | Premium feel = trust = lower bounce |
| Feed customization | Not in v1 (chips/topics scaffold the path to it) | Keep the core fast; personalize later |

---

## 1. Sitemap

```
Home (/)
├── World            (/world)        → Regions, Politics, Climate, Migration, Elections
├── Business         (/business)     → Markets, Economy, Deals/M&A, Startups, Energy, Real Estate
├── Technology       (/technology)   → Gadgets, Software, Security, Big Tech, Reviews, Chips
├── AI               (/ai)           → Research, Products, Policy, Ethics
├── Science          (/science)      → Space, Climate, Health science
├── Sport            (/sport)        → Football, Basketball, Tennis, …
├── Culture          (/culture)      → Film, Music, Books, Gaming
├── Health           (/health)
├── Travel           (/travel)
├── Lifestyle        (/lifestyle)
├── Live             (/live)         → Live blogs / breaking
│
├── Article          (/<section>/<slug>)        ← article.html template
├── Category/Section (/<section>)               ← category.html template
├── Topic hub        (/topic/<topic>)           ← reuses category template
├── Author profile   (/author/<name>)
├── Search           (/search?q=)
└── Static           /about /ethics /careers /advertise /contact /privacy /terms
```

**Files delivered:** `index.html` (Home), `article.html` (Article), `category.html`
(Category/Section/Topic). Category, Topic-hub and Author pages share one template.

---

## 2. Homepage section order (revenue-optimized)

1. Utility bar (date, region temps, subscribe)
2. Sticky header + mega menu + search + theme toggle
3. **Breaking news ticker** (auto-scroll, pauses on hover)
4. **Hero**: 1 lead story + 4 side stories
5. **Ad — Leaderboard** (970×90 / 728×90)
6. **Trending now** (horizontal ranked rail)
7. **Latest** grid **+ sticky sidebar** (most-read, MPU ad, markets, crypto, newsletter)
   - In-feed native ad injected inside the grid
8. **Technology & AI** category block (feature + list)
9. **Ad — in-content leaderboard**
10. **Business / World / Sport** three-column block
11. **Weather** + **Reader poll** widgets
12. **Newsletter band** (the conversion moment)
13. Mega footer
14. **Anchor ad** (dismissible sticky footer) + back-to-top

This produces more scroll depth and more ad-eligible viewport than the reference's
single magazine grid — the core lever for AdSense revenue.

---

## 3. Wireframes

### 3a. Desktop — Home
```
┌───────────────────────────────────────────────────────────┐
│ utility bar: date · regional temps         subscribe · ◯◯◯ │
├───────────────────────────────────────────────────────────┤
│ [A] Axiom.   World Business Tech AI Sci Sport …  🔍 ☾ [Sub]│ sticky
├───────────────────────────────────────────────────────────┤
│ ● BREAKING  ⟵ scrolling headlines ……………………………………………… ⟶   │
├───────────────────────────────────────────────────────────┤
│ ┌─────────────────────────┐ ┌───────────────────────────┐ │
│ │                         │ │ ▢ side story              │ │
│ │      HERO LEAD          │ │ ▢ side story              │ │
│ │   headline + byline     │ │ ▢ side story              │ │
│ │                         │ │ ▢ side story              │ │
│ └─────────────────────────┘ └───────────────────────────┘ │
│ ┌───────────────── AD · LEADERBOARD 728×90 ──────────────┐ │
│ TRENDING ▸ [01][02][03][04][05]  (horizontal scroll)      │
│ ┌──────────────────────────────┐ ┌──────────────────────┐ │
│ │ LATEST  ▢▢  ▢▢               │ │ Most read            │ │
│ │ ▢▢  [IN-FEED AD]  ▢▢         │ │ ▭ AD · MPU 300×250   │ │
│ │ ▢▢                          │ │ Markets (live)       │ │
│ │ [ Load more ]               │ │ Crypto (live)        │ │
│ │                             │ │ Newsletter mini      │ │
│ └──────────────────────────────┘ └──────────────────────┘ │
│ TECHNOLOGY & AI  (feature + 4-item list)                  │
│ ┌──────────── AD · IN-CONTENT LEADERBOARD ───────────────┐ │
│ BUSINESS │ WORLD │ SPORT   (3 columns)                    │
│ Weather (4-day) │ Reader poll                             │
│ ┌──────────────── NEWSLETTER BAND (dark) ────────────────┐ │
│ FOOTER (brand · News · Tech · Life · Company · legal)     │
├───────────────────────────────────────────────────────────┤
│ ✕  ───────── ANCHOR AD 728×90 (dismissible) ───────────── │ fixed
└───────────────────────────────────────────────────────────┘
```

### 3b. Mobile — Home (single column)
```
┌──────────────────────┐
│ [A] Axiom   🔍 ☾  ☰  │ sticky
├──────────────────────┤
│ ● BREAKING ⟵ … ⟶     │
│ ┌──────────────────┐ │
│ │   HERO LEAD      │ │
│ └──────────────────┘ │
│ ▢ side  ▢ side …     │
│ ── AD 300×250 ──     │
│ TRENDING ▸ swipe     │
│ ▢ card               │
│ ▢ card               │
│ ── IN-FEED AD ──     │
│ ▢ card  (infinite ↓) │
│ Most read            │
│ Markets / Crypto     │
│ NEWSLETTER           │
│ FOOTER               │
│ ✕ anchor ad (fixed)  │
└──────────────────────┘
☰ → slide-in drawer nav
```

### 3c. Desktop — Article
```
Reading-progress bar (top, fills on scroll)
Breadcrumb ▸ Home › Technology › AI
┌────────────────────────────────┐ ┌──────────────┐
│ KICKER · H1 · dek               │ │ ▭ AD MPU     │ sticky
│ author · date · read · [share]  │ │ Most read    │ rail
│ ▢ hero image + caption          │ │ Newsletter   │
│ ¶ ¶                             │ │ ▭ AD MPU     │
│ ── AD after ¶2 ──               │ └──────────────┘
│ ¶ H2 ¶  ❝ pull quote ❞          │
│ ── AD after ¶5 ──               │
│ ¶ ▢ inline figure ¶ list        │
│ ── AD after ¶8 ──               │
│ ¶ #tags  [author box]           │
└────────────────────────────────┘
MORE IN TECHNOLOGY ▢▢▢▢ (related)
```

---

## 4. User-flow diagram

```
                 ┌────────── Search / Google News / Social ──────────┐
                 ▼                                                    ▼
   Homepage ──────────────► Category ──────────► Article ──────────► Related Article
      │  ▲                     │  ▲                 │  │  ▲                │
      │  └── ticker/trending ──┘  └── filters ──────┘  │  └── "More in …" ─┘
      ▼                                                ▼
  Newsletter signup  ◄───────── in-article + band + sidebar CTAs
      │
      ▼
  Returning visitor (email) ──► Homepage (loop)
```
Every surface routes toward **(a) the next article** (session depth → ad views)
and **(b) the newsletter** (retention → returning visitors).

---

## 5. Component list

Layout: container, section, with-aside, grid (2/3/4), rail (snap scroll).
Navigation: utility-bar, sticky header, brand mark, primary-nav, **mega menu**,
mobile **drawer**, **search overlay** (`/` or ⌘K), breadcrumb, back-to-top.
Content: hero lead, side-story, **card** (column + row), rank-card, section-head,
duotone **media** placeholders (12 topic gradients), tag/kicker/chip, pull-quote,
inline figure, author box, tags row.
Widgets: most-read, **live markets**, **live crypto**, **4-day weather**, reader
poll, newsletter (band + mini), breaking ticker.
Monetization: 6 ad formats (see §6).
Article: reading-progress bar, share row (native + copy), drop-cap, related grid.
System: light/dark theme toggle (persisted), lazy scroll-reveal, infinite scroll
+ load-more, toast-free newsletter validation, live clock.

---

## 6. Ad placement map (AdSense)

| # | Slot | Format | Where | Why it exists | CTR / RPM impact | UX guardrail |
|---|------|--------|-------|---------------|------------------|--------------|
| 1 | Leaderboard | 970×90 / 728×90 | Home, below hero | First high-viewability unit after engagement | High viewability → strong RPM | Below the fold of the hero, never above H1 |
| 2 | In-feed native | responsive | Inside Latest grid (every ~6 cards) | Matches card rhythm; readers in browse mode | **Highest CTR** of all placements | Labelled "Advertisement"; styled distinct from editorial |
| 3 | Sidebar MPU | 300×250 | Sticky sidebar | Travels down the page = repeat impressions | High viewability seconds | Sticky stops at footer; one primary + one lower |
| 4 | In-content | 728×90 / 300×250 | Article after ¶2, ¶5, ¶8 | Engaged readers, natural pauses | ¶2 = best CTR; deeper = high viewability | Min 1 full screen between ads (policy-safe) |
| 5 | In-content leaderboard | 728×90 | Between home sections | Monetizes the scroll between blocks | Incremental impressions | Spaced by a full section |
| 6 | Anchor | 728×90 sticky footer | All pages, after 2.5s | Always-on viewport presence | Consistent viewable impressions | **Dismissible**, remembers choice per session |

**Policy & CWV discipline:** every unit is reserved with a fixed height (no layout
shift → protects CLS), labelled, and spaced to respect AdSense's "valuable inventory"
and ad-density rules. No ads in the nav, no pop-ups, no interstitials on entry.
Mobile drops to 300×250 / 320×100 equivalents. Swap the `.ad` placeholders for real
`<ins class="adsbygoogle">` units at launch.

---

## 7. SEO architecture

- **Schema.org / JSON-LD** on every template:
  - Home → `NewsMediaOrganization` + `WebSite` (with `SearchAction` sitelinks box)
  - Article → `NewsArticle` (headline, author, datePublished/Modified, publisher logo, image, section)
  - Category → `CollectionPage`
  - All inner pages → `BreadcrumbList`
- **Google News readiness:** semantic `<article>`, visible byline + author profile
  path, publish & modified timestamps, `max-image-preview:large`, clean canonical
  URLs, section taxonomy that maps to a news sitemap.
- **URL architecture:** `/section/article-slug` — shallow, keyword-rich, stable.
- **Internal linking:** breadcrumbs, "More in …" related grid, most-read, trending,
  topic chips, and mega-menu cross-links → strong crawl depth and link equity flow.
- **On-page:** one `<h1>` per page, descriptive `<title>`/meta, OG + Twitter cards,
  `lang` set, descriptive `aria-label`s and `alt`/`aria` on media.
- **Topic hubs & author pages** give evergreen, rankable landing surfaces.
- **At launch add:** `sitemap.xml` + `news-sitemap.xml`, `robots.txt`, real OG images.

---

## 8. Content architecture

13 top sections (World, Business, Technology, AI, Science, Sport, Culture, Health,
Travel, Lifestyle, Live + Gaming under Culture). Each section = sub-topics → topic
hubs → articles. Editorial hierarchy on the home page: **Lead → Trending → Latest →
Section blocks**, so the most valuable inventory sits where attention is highest.

---

## 9. Design system

### Color
| Token | Light | Dark | Use |
|---|---|---|---|
| Accent (Signal Red) | `#E11D2A` | `#FF3B47` | CTAs, kickers, links, breaking |
| Ink | `#0A0A0B` | `#F4F5F7` | Headlines |
| Text / secondary | `#17191D` / `#565B63` | `#E7E9ED` / `#A1A7B1` | Body / meta |
| Background / surface | `#FFFFFF` / `#F6F7F9` | `#0B0C0E` / `#131519` | Page / cards |
| Border | `#E6E8EC` | `#23262D` | Hairlines |
| Positive / negative | `#0E8A4F` / `#D32030` | `#34C77B` / `#FF5A66` | Markets |

Full **light + dark** themes via CSS custom properties; respects
`prefers-color-scheme`, user choice persisted to `localStorage`.

### Typography
- **Display / headlines:** Fraunces (premium variable serif) — the magazine voice
- **UI / nav / meta / cards:** Inter — Apple-clean, neutral, legible
- **Long-form body:** Source Serif 4 — reading comfort on articles
- Fluid `clamp()` scaling for H1/section heads; drop-cap on article lead.

### Spacing & layout
- 4px base scale (`--s1…--s9` = 4→96px), `1280px` container, `24px` gutter (16px mobile).
- Radius scale 6→20px; three shadow tiers; one motion easing curve.

### Motion
- 160–280ms transitions, scroll-reveal, ticker, pulse "live" dot, market flashes.
- Fully gated by `prefers-reduced-motion: reduce`.

---

## 10. Performance (targets & how they're met)

Target: **Lighthouse 95+ / Core Web Vitals green.**
- **No framework / no build** → tiny JS, fast parse; `<script defer>`.
- **CLS:** every image/ad slot has a reserved aspect-ratio/height.
- **LCP:** hero is CSS (gradient) — instant; font `display=swap` + preconnect.
- **Lazy:** `loading="lazy"` on real images (swap-in); IntersectionObserver reveal
  and infinite scroll only hydrate what's near the viewport.
- **CSS-first widgets** (weather, markets shell) — no heavy chart libs.
- At launch: serve real images as AVIF/WebP `srcset`, self-host fonts, add caching.

---

## 11. Conversion & monetization strategy

**The flywheel:** SEO/News traffic → premium, fast, trustworthy UX → low bounce →
deep sessions (trending, related, infinite scroll) → more ad impressions → newsletter
capture → returning direct visits (cheapest, highest-LTV traffic) → repeat.

Conversion levers in the build:
1. **Three newsletter capture points** (sidebar mini, dark band, in-section) with
   inline validation and social proof (2.4M, 4.8★, 5-min read).
2. **Session-depth engines:** trending rail, most-read, related grid, infinite scroll.
3. **Trust signals:** bylines + author bios, ethics link, clean ad labelling.
4. **Return triggers:** breaking ticker, "Live" nav, daily reader poll.

Revenue mix: **AdSense (display + native + anchor)** primary; newsletter sponsorship
and a future subscription/"premium" tier as secondary lines.

---

## 12. How to run / next steps

- **Run:** double-click `index.html` (or `npx serve .` for a local server). Navigate
  Home → category → article; try dark mode (☾), search (`/`), load-more/infinite
  scroll, and the live market widgets.
- **Go live:** replace `.ad` placeholders with AdSense `<ins>` units; swap duotone
  media blocks for real `<img srcset>`; add `sitemap.xml` + `news-sitemap.xml` +
  `robots.txt`; wire the newsletter form to your ESP; connect real market/weather APIs.

```
n website claude/
├── index.html        # Homepage
├── article.html      # Article template (schema, in-content ads, progress bar)
├── category.html     # Section / topic / author template
├── DESIGN.md         # This document
└── assets/
    ├── css/styles.css   # Design-token system + all components (light/dark)
    ├── js/main.js       # Theme, nav, widgets, infinite scroll, progress
    └── img/             # (for production images)
```
