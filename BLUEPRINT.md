# RankHigh SEO - Project Blueprint

## Document Purpose
This blueprint captures critical learnings from deploying the RankHigh SEO Shopify app. It serves as a reference guide for all future Shopify app development work, emphasizing proven patterns and avoiding common pitfalls.

---

## Core Principles

### 1. Start with Official Shopify Templates
**Why:** Official templates are production-tested, up-to-date with latest Shopify patterns, and eliminate 90% of configuration issues.

**Key Learning:** We initially attempted to build from scratch and spent 13+ hours debugging OAuth loops, redirect issues, and configuration problems. Switching to the official template resolved all these issues immediately.

**Best Practice:**
```bash
# Always start with the official template
shopify app init --template=https://github.com/Shopify/shopify-app-template-remix
```

**Benefits:**
- Pre-configured OAuth 2.0 with token exchange
- Working session storage with Prisma
- Proper embedded app setup with App Bridge
- Shopify Polaris UI components already integrated
- Modern Remix routing and loaders
- Vite build configuration optimized for Shopify

### 2. Use Shopify CLI for All Configuration
**Why:** Manual configuration is error-prone and creates inconsistencies between local, Partner Dashboard, and deployment environments.

**Key Learning:** We initially tried manual configuration via Partner Dashboard, which led to mismatched credentials, wrong redirect URLs, and inconsistent scopes.

**Best Practice:**
```bash
# Let CLI handle all configuration
shopify app config link --client-id YOUR_CLIENT_ID
shopify app deploy --force

# CLI automatically updates:
# - shopify.app.toml
# - Partner Dashboard settings
# - OAuth redirect URLs
# - Access scopes
```

**What NOT to do:**
- Don't manually edit Partner Dashboard settings
- Don't copy/paste credentials between environments
- Don't guess at redirect URL formats
- Don't manually sync scopes

### 3. Test Barebone App First
**Why:** Verify the foundation works before adding custom code. This isolates issues to either infrastructure or your custom code.

**Key Learning:** After using the template, we first deployed it as-is to Railway. Once we confirmed OAuth, database, and basic routing worked, we proceeded with migrations.

**Testing Checklist:**
1. App installs successfully in test store
2. OAuth completes without loops
3. Dashboard page loads
4. Database connection established
5. Session storage working
6. No console errors in browser

**Only proceed to customization after all checks pass.**

### 4. Build and Test Incrementally
**Why:** Large changes make debugging impossible. Small changes allow you to identify exactly what breaks the app.

**Key Learning:** We migrated in two distinct phases:
- **Phase 1:** Database schema only (12 models) - Verified app still worked
- **Phase 2:** Dashboard UI components - Verified complete functionality

**Incremental Strategy:**
1. Make one logical change
2. Commit to git
3. Deploy to Railway
4. Test the app thoroughly
5. If broken, you know exactly what caused it
6. Repeat

**What NOT to do:**
- Don't migrate 10 files at once
- Don't make schema + UI + API changes together
- Don't skip testing between changes

---

## Architecture Decisions

### Database Strategy

#### PostgreSQL Everywhere
**Decision:** Use PostgreSQL for both local development and production.

**Why:** Avoids provider mismatch issues and ensures development environment matches production.

**Key Learning:** We initially tried SQLite locally and PostgreSQL on Railway. This caused migration issues and different SQL behavior. Standardizing on PostgreSQL eliminated these problems.

**Implementation:**
```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Local Development:**
```bash
# Use Railway PostgreSQL for local dev
# or run local PostgreSQL:
docker run -e POSTGRES_PASSWORD=password -p 5432:5432 postgres

# .env
DATABASE_URL="postgresql://postgres:password@localhost:5432/rankhigh_dev"
```

#### Use `db push` for Initial Setup
**Decision:** Use `prisma db push` instead of `prisma migrate` for initial deployment.

**Why:**
- `db push` is simpler for initial setup
- No migration history to manage initially
- Faster iteration during development
- Can switch to migrations later for production

**Implementation:**
```json
// package.json
{
  "scripts": {
    "setup": "prisma generate && prisma db push --accept-data-loss --skip-generate"
  }
}
```

**When to switch to migrations:**
- After app is in production
- When you need migration history
- When multiple developers are collaborating

### Deployment Strategy

#### Railway for Hosting
**Why Railway:**
- Automatic Docker deployment from git
- Managed PostgreSQL included
- Simple environment variable management
- Free tier for development
- Git-based continuous deployment

**Alternatives Considered:**
- Heroku (more expensive)
- Fly.io (more complex configuration)
- Vercel (not ideal for full-stack with database)

#### Git-Based Deployment Flow
**Pattern:**
1. Develop locally with `shopify app dev`
2. Commit working changes to git
3. Push to GitHub
4. Railway auto-deploys
5. Test in Shopify admin

**Key Learning:** This flow ensures every deployment is tracked in git and can be rolled back.

### Authentication Strategy

#### OAuth 2.0 with Token Exchange
**Decision:** Use modern token exchange strategy (not legacy cookie-based).

**Why:**
- More secure
- Works better with embedded apps
- Recommended by Shopify
- Already configured in template

**Configuration:**
```typescript
// app/shopify.server.ts
const shopify = shopifyApp({
  // Token exchange enabled by default in template
  future: {
    unstable_newEmbeddedAuthStrategy: true,
  },
});
```

**Key Learning:** Don't try to implement custom auth. Use the template's implementation.

---

## Project Structure

### Enhanced Prisma Schema
**Strategy:** Merge Shopify's Session model with custom business models.

**Structure:**
```
prisma/schema.prisma
├── Session model (from Shopify template - DON'T MODIFY)
├── Core App Models (Store, User)
├── SEO Feature Models (Audit, Page, SEOIssue)
├── Keyword Tracking (Keyword, KeywordRanking)
├── Schema Markup (SchemaMarkup)
├── Redirects (Redirect)
└── Notifications (Notification)
```

**Rules:**
1. NEVER modify the Session model
2. Use foreign keys to Store, not Session
3. Use `@relation` with `onDelete: Cascade`
4. Use UUIDs for all custom model IDs

### Route Organization
```
app/routes/
├── app._index.tsx          # Main dashboard
├── app.audits.tsx          # SEO audit page
├── app.pages.tsx           # Page management
├── app.keywords.tsx        # Keyword tracking
├── app.settings.tsx        # Settings
├── webhooks.*.tsx          # Webhook handlers
└── auth.*.tsx              # OAuth flows (from template)
```

**Key Learning:**
- Don't modify auth routes from template
- Use Remix file-based routing conventions
- Group related functionality in route folders

---

## Common Pitfalls and Solutions

### 1. Import Path Errors
**Problem:** `~/shopify.server` alias not configured.

**Error:**
```
Rollup failed to resolve import "~/shopify.server"
```

**Solution:** Use relative imports in custom files:
```typescript
// ❌ Wrong
import { authenticate } from "~/shopify.server";

// ✅ Correct
import { authenticate } from "../shopify.server";
```

**Why:** The `~` alias may not be configured in all build contexts.

### 2. Missing package-lock.json
**Problem:** Railway build fails because npm ci requires package-lock.json.

**Solution:**
```bash
# Remove from .gitignore
# Keep package-lock.json for Railway deployment (npm ci requires it)
# package-lock.json

# Force add if already ignored
git add -f package-lock.json
```

### 3. Environment Variable Quoting
**Problem:** Railway Raw Editor adds extra quotes to secrets.

**Wrong:**
```
SHOPIFY_API_SECRET=""shpss_abc123"
```

**Correct:**
```
SHOPIFY_API_SECRET="shpss_abc123"
```

**Solution:** Always use Railway's Variables UI, not Raw Editor.

### 4. Database Provider Mismatch
**Problem:** Schema says `sqlite`, Railway provides PostgreSQL URL.

**Error:**
```
Error validating datasource "db": the URL must start with the protocol `file:`.
```

**Solution:** Change provider in schema.prisma:
```prisma
datasource db {
  provider = "postgresql"  // not "sqlite"
  url      = env("DATABASE_URL")
}
```

### 5. OAuth Redirect Loops
**Problem:** App goes into infinite OAuth loop.

**Causes:**
- Mismatched client ID/secret
- Wrong redirect URLs in Partner Dashboard
- Stale session data
- Cache issues

**Solution:** Start with fresh template rather than debugging.

---

## Environment Setup

### Required Environment Variables

#### Local Development (.env)
```bash
# Shopify App Credentials
SHOPIFY_API_KEY=your_client_id
SHOPIFY_API_SECRET=your_secret

# Scopes (comma-separated)
SCOPES=read_products,write_products,read_analytics,...

# Session Secret (generate with: openssl rand -base64 32)
SESSION_SECRET=your_random_secret

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
```

#### Railway Production
```bash
# Shopify credentials (same as local)
SHOPIFY_API_KEY=your_client_id
SHOPIFY_API_SECRET=your_secret
SCOPES=read_products,write_products,...
SESSION_SECRET=your_random_secret

# Railway provides this automatically
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Required for production
NODE_ENV=production
```

### Configuration Files

#### shopify.app.toml
**Purpose:** Defines app configuration for Shopify CLI.

**Auto-managed by CLI:**
- client_id
- application_url
- redirect_urls
- scopes

**Manual settings:**
- app name
- embedded = true

**Don't edit manually** - use `shopify app config link` instead.

---

## Development Workflow

### Day 1: Project Setup
```bash
# 1. Create app from template
shopify app init --template=https://github.com/Shopify/shopify-app-template-remix

# 2. Link to Partner app
shopify app config link --client-id YOUR_CLIENT_ID

# 3. Set up environment
cp .env.example .env
# Edit .env with your credentials

# 4. Install dependencies
npm install

# 5. Set up database
npm run setup

# 6. Test locally
shopify app dev

# 7. Test in Shopify admin
# Visit the URL provided by CLI
# Install app in test store
# Verify OAuth and dashboard load
```

### Day 2+: Incremental Development
```bash
# 1. Create feature branch
git checkout -b feature/add-seo-audit

# 2. Make ONE logical change
# Example: Add Audit model to schema

# 3. Test locally
npm run setup  # Apply schema changes
shopify app dev

# 4. Commit and deploy
git add .
git commit -m "Add Audit model to schema"
git push

# 5. Verify on Railway
# Check deployment logs
# Test in Shopify admin

# 6. Repeat for next change
```

---

## Migration Strategy

### Phase 1: Schema Migration
**Goal:** Get database models in place without breaking app.

**Steps:**
1. Add new models to schema.prisma
2. Keep Session model unchanged
3. Run `npm run setup` locally
4. Test app still loads
5. Commit and deploy
6. Verify production still works

**Testing:**
- App installs
- OAuth works
- Dashboard loads
- No database errors

### Phase 2: UI Migration
**Goal:** Replace template UI with custom components.

**Steps:**
1. Copy one route file (e.g., app._index.tsx)
2. Import Polaris components
3. Fix import paths (use relative, not ~)
4. Test locally
5. Commit and deploy
6. Verify in Shopify admin

**Testing:**
- Page renders correctly
- No console errors
- Polaris components display properly
- Data loads from loader

### Phase 3: API Migration
**Goal:** Add business logic and API endpoints.

**Steps:**
1. Add loader functions
2. Add action functions
3. Add API routes
4. Implement GraphQL queries
5. Add background jobs

**Testing:**
- API returns correct data
- Error handling works
- Loading states work
- Edge cases handled

---

## Quality Checklist

### Before Every Deployment
- [ ] Code runs locally without errors
- [ ] TypeScript compiles (`npm run build`)
- [ ] Git commit created
- [ ] Commit message describes change clearly
- [ ] Changes are minimal and focused
- [ ] Database migrations tested locally

### After Every Deployment
- [ ] Railway deployment succeeds
- [ ] No errors in Railway logs
- [ ] App loads in Shopify admin
- [ ] Main functionality works
- [ ] No console errors in browser
- [ ] Database queries working

### Before Production Launch
- [ ] All features tested end-to-end
- [ ] Error handling implemented
- [ ] Loading states implemented
- [ ] Mobile responsive
- [ ] Accessibility checked
- [ ] Performance tested
- [ ] Security review completed

---

## Next Steps

### Immediate (Week 1-2)
- ✅ Foundation complete (database, auth, routing)
- ✅ Dashboard UI migrated
- ⏳ Implement remaining routes (audits, pages, keywords, settings)

### Short-term (Week 3-4)
- Implement SEO audit functionality
- Add keyword tracking
- Build schema markup generator
- Implement redirect manager

### Medium-term (Week 5-6)
- Add background jobs for audits
- Implement webhooks for product/page updates
- Add analytics and reporting
- Implement bulk operations

### Long-term (Month 2+)
- Add advanced SEO features
- Implement AI recommendations
- Add competitor tracking
- Build white-label features

---

## Resources

### Official Documentation
- [Shopify App Template](https://github.com/Shopify/shopify-app-template-remix)
- [Shopify CLI Docs](https://shopify.dev/docs/apps/tools/cli)
- [Shopify App Remix](https://shopify.dev/docs/api/shopify-app-remix)
- [Remix Framework](https://remix.run/docs)
- [Prisma ORM](https://www.prisma.io/docs)
- [Polaris Components](https://polaris.shopify.com/)

### Deployment Platforms
- [Railway Docs](https://docs.railway.app/)
- [Shopify Deployment Guide](https://shopify.dev/docs/apps/deployment/web)

### Tools
- [Shopify Partner Dashboard](https://partners.shopify.com/)
- [Railway Dashboard](https://railway.app/)
- [GitHub](https://github.com/)

---

## Lessons Learned

### What Worked Well
1. **Using official template** - Saved days of debugging
2. **CLI automation** - Eliminated manual configuration errors
3. **Incremental deployment** - Made debugging trivial
4. **PostgreSQL everywhere** - No environment mismatches
5. **Git-based deployment** - Every change tracked and revertable

### What Didn't Work
1. **Building from scratch** - 13+ hours wasted on OAuth issues
2. **Manual Partner Dashboard config** - Created inconsistencies
3. **Large migrations** - Hard to debug when multiple things changed
4. **SQLite locally, PostgreSQL production** - Caused provider errors
5. **Guessing configuration** - Always led to errors

### Key Insights
1. **Trust the template** - Shopify knows their platform best
2. **Automate everything** - Humans make mistakes, CLI doesn't
3. **Test incrementally** - Small changes = easy debugging
4. **Match environments** - Development should mirror production
5. **Git is your safety net** - Commit early, commit often

---

## Conclusion

This blueprint represents hard-won lessons from deploying a production Shopify app. The core message is simple:

**Start with the official template, use the CLI, and test incrementally.**

Following these principles will save you days of debugging and ensure a smooth path to production.

For detailed step-by-step procedures, see [DETAILED-DESIGN.md](./DETAILED-DESIGN.md).
