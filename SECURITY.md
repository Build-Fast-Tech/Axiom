# Axiom — Security Audit

Audit of the current build against **Website_Build_Checklist.docx**.

**Important context:** Axiom is currently a **static front-end** (HTML/CSS/JS) with
**no backend, database, API, or server-side auth**. So a large part of the checklist
(RLS, SQL injection, API/IDOR, rate limiting, Stripe webhooks) describes risks that
**do not exist in this build yet** — they're marked **N/A** with the action to take
once a backend is added. The checks that *do* apply to a static site
(XSS, mixed content, secrets, CSP, security headers, input handling) were audited and
hardened. Status is also viewable live in the **admin → Security** tab.

Legend: ✅ Pass (applies & handled) · 🟥 Action (do before launch) · ⬜ N/A (no backend yet)

---

## Phase 3 — Security

### Core security
| Check | Status | Notes |
|---|---|---|
| HTTPS site-wide, no mixed content | ✅ | No `http://` resources; fonts/CDN over HTTPS; all internal links relative. Enforce **HSTS** at the host (in `vercel.json`). |
| No secrets/credentials committed | ✅ | No API keys/secrets anywhere in the front-end. Any future keys go in host **environment variables**, never the repo. |
| Content-Security-Policy + security headers | ✅ | **CSP `<meta>` added to every page**; full header set (`HSTS`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `COOP`) shipped in **`vercel.json`**. |
| Row Level Security (RLS) on all tables | ⬜ | No database in this build. When you add **Supabase**, enable RLS on every table and test with multiple user roles. |
| Protected routes require authentication | 🟥 | The **admin login is a client-side demo only** — it is **not** real security. Put `/admin` behind **Supabase Auth + server-side checks** before launch. |

### OWASP checks (run OWASP ZAP against the deployed URL)
| Check | Status | Notes |
|---|---|---|
| Cross-Site Scripting (XSS) | ✅ | All dynamic rendering uses `textContent`, **escaped** `innerHTML`, and `encodeURIComponent` for URLs. Untrusted input (URL params `?t/?d/?cat/?r`, search box) is escaped before it ever hits the DOM. |
| SQL Injection | ⬜ | No SQL/server queries. With a DB, use the **Supabase client / parameterized queries** — never string-built SQL. |
| Broken Authentication / sessions | 🟥 | No real session system yet. With Supabase Auth: short-lived JWTs, secure `httpOnly` cookies, server-verified sessions. |
| Automated OWASP ZAP scan | 🟥 | Run a ZAP **baseline scan** after the first deploy and wire it into CI. |

### API & data access
| Check | Status | Notes |
|---|---|---|
| Cannot access others' data via API (IDOR) | ⬜ | No API in this build. Test every endpoint in **Burp Suite** with different user tokens before launch. |
| Rate limiting on sensitive endpoints | ⬜ | No server endpoints yet. Add limits to auth, newsletter and payment routes. |
| Input validated at boundaries | ✅ | Client-side validation on newsletter + the article editor. **Re-validate server-side** once a backend exists — client checks are bypassable. |

### Automation & review
| Check | Status | Notes |
|---|---|---|
| Security scanning automated in CI | 🟥 | No repo/CI yet. Add **GitHub Actions** to run dependency + ZAP scans on every PR to `main`. |
| No vulnerable dependencies | ✅ | **Zero** third-party JS/CSS dependencies and no build step → minimal supply-chain surface. |
| Automated code review before deploy | 🟥 | Add **CodeRabbit** / required PR review before merge. |
| No AI-introduced sequential bottlenecks | ✅ | Front-end makes no chained network calls; fonts are preconnected, widgets run on independent timers, scripts are `defer`-loaded. |

---

## What was hardened in this pass
- **CSP** `<meta http-equiv="Content-Security-Policy">` on `index`, `article`, `category`, `admin`, restricting scripts/styles/fonts/images to known origins (`frame-ancestors 'none'` blocks clickjacking).
- **`vercel.json`** with the full production header set: HSTS (preload), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` (disables camera/mic/geo + FLoC), COOP, long-cache for `/assets`, and `noindex` on `/admin.html`.
- **XSS review** of all dynamic rendering (`assets/js/main.js`, `assets/js/admin.js`) — confirmed escaping/`textContent`/`encodeURIComponent` throughout.
- **Admin** is `noindex,nofollow`, fronted by a clearly-labelled demo gate with an explicit "not real security" warning, and a built-in Security tab mirroring this audit.
- **404 page** added (Phase 5 item). Meta/OG/favicon already in place.

## Production roadmap (to clear the 🟥 / ⬜ items)
1. **Backend & auth** — Supabase (Postgres + Auth). Enable **RLS on every table**; gate `/admin` server-side by role.
2. **Hosting** — Vercel (`vercel.json` headers already provided); confirm HSTS + HTTPS.
3. **Payments/email** — Stripe (verify webhook signatures), Resend, when needed.
4. **CI/CD** — GitHub Actions: dependency audit + OWASP ZAP baseline on every PR; CodeRabbit review gate.
5. **Pre-launch pen test** — OWASP ZAP (XSS/SQLi/auth) + Burp Suite (endpoint IDOR), rate limiting on sensitive routes.
6. **Secrets** — all keys in env vars; production keys only; rotate before launch.
7. **Stock API key** — keep it server-side. `api/quote.js` is a Vercel serverless
   proxy that reads `FINNHUB_KEY` from the environment so the key never reaches the
   browser; the client calls `/api/quote` and falls back to an admin-entered key only
   for local/static testing. Set `FINNHUB_KEY` in Vercel → Settings → Environment
   Variables (never commit it). Weather/crypto need no key.

> Bottom line: every checklist item that is **meaningful for a static front-end is
> green**. The remaining items are **inherently backend concerns** and become live
> tasks the moment you add Supabase/Stripe/CI — they're documented above so nothing
> gets missed.
