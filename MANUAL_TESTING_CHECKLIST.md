# Manual Testing Checklist - RankHigh SEO

**Goal:** Verify all Google integrations and core features work end-to-end
**Status:** Pre-submission testing
**Date:** November 2025

---

## Prerequisites

Before starting, ensure:
- [ ] App is installed on a dev Shopify store
- [ ] You have admin access to the store
- [ ] You have a Google account with Search Console access
- [ ] You have at least one website/property in Google Search Console

---

## 1. OAuth & Installation Flow

### Test OAuth Store Creation
- [ ] After app installation, verify store record was created
  - Navigate to app dashboard
  - Should NOT see "Store not found" error
  - Dashboard should load successfully

### Test Session Persistence
- [ ] Refresh the page
- [ ] You should remain logged in (no redirect to login)
- [ ] Session should persist across page navigation

---

## 2. Google Search Console (GSC) Integration

### Test GSC Connection Flow
1. [ ] Navigate to **Integrations > Google Search Console**
2. [ ] Click "Connect Google Search Console"
3. [ ] You should be redirected to Google OAuth login
4. [ ] Authorize the app to access GSC
5. [ ] You should be redirected back to **Select Property** page
6. [ ] Verify your GSC properties appear in the dropdown

### Test Property Selection
1. [ ] Select a property from the dropdown
2. [ ] Click "Confirm Property"
3. [ ] You should see GSC metrics displaying:
   - [ ] Total Clicks
   - [ ] Total Impressions
   - [ ] Average CTR
   - [ ] Average Position
4. [ ] Metrics should show real data from your GSC property

### Test GSC Data Fetching
1. [ ] Verify "Top Queries" section displays:
   - [ ] Search query names
   - [ ] Click counts
   - [ ] Impression counts
   - [ ] CTR percentages
   - [ ] Average position

2. [ ] Verify "Top Pages" section displays:
   - [ ] Page URLs
   - [ ] Click counts
   - [ ] Impression counts
   - [ ] CTR percentages
   - [ ] Average position

### Test GSC Disconnect
1. [ ] Click "Disconnect Google Search Console"
2. [ ] Confirm disconnection in modal
3. [ ] GSC metrics should disappear
4. [ ] Page should reset to "Connect" state
5. [ ] Verify disconnect removed Google credentials from database

---

## 3. GTM/GA4 Integration

### Test GTM Container ID Setup
1. [ ] Navigate to **Integrations > GTM/GA4**
2. [ ] Enter a valid GTM Container ID (format: GTM-XXXXXX)
3. [ ] Click "Save GTM ID"
4. [ ] Verify success message appears
5. [ ] Refresh page and verify GTM ID persists

### Test GA4 Property ID Setup
1. [ ] Enter a valid GA4 Property ID (numeric, e.g., 123456789)
2. [ ] Click "Save GA4 ID"
3. [ ] Verify success message appears
4. [ ] Refresh page and verify GA4 ID persists

### Test ID Validation
1. [ ] Try entering invalid GTM ID (e.g., "INVALID")
2. [ ] Should show validation error
3. [ ] Try entering invalid GA4 ID (e.g., "not-a-number")
4. [ ] Should show validation error

---

## 4. SEO Audit

### Test Audit Initiation
1. [ ] Navigate to **SEO > Audit**
2. [ ] Click "Start New Audit"
3. [ ] Audit should start and fetch products/pages from Shopify

### Test Audit Results
1. [ ] Audit should complete and show:
   - [ ] SEO Score (0-100)
   - [ ] Issues count by severity (Critical, High, Medium, Low)
   - [ ] Audit timestamp

2. [ ] Verify specific checks work:
   - [ ] Missing meta titles detection
   - [ ] Duplicate meta titles detection
   - [ ] Missing alt text detection
   - [ ] Missing descriptions detection

### Test Audit History
1. [ ] Navigate to **SEO > Audit > History**
2. [ ] Should list all previous audits with:
   - [ ] Dates
   - [ ] Scores
   - [ ] Issue counts
3. [ ] Click on an audit to view details

---

## 5. Meta Editor (Product SEO)

### Test Meta Title & Description Editing
1. [ ] Navigate to **SEO > Meta Editor**
2. [ ] Select a product from the list
3. [ ] Edit meta title and description
4. [ ] Click "Save"
5. [ ] Verify changes are saved and displayed
6. [ ] Verify SERP preview updates

### Test Bulk Edit
1. [ ] Navigate to **Bulk Edit** (if available)
2. [ ] Select multiple products
3. [ ] Apply bulk changes
4. [ ] Verify all selected products updated

### Test Meta Templates
1. [ ] Use template variables like `{title}`, `{type}`, `{vendor}`
2. [ ] Verify variables are replaced with actual product data
3. [ ] Save and verify results

---

## 6. Sitemap Generation

### Test Sitemap Generation
1. [ ] Navigate to **SEO > Sitemap**
2. [ ] Click "Generate Sitemap"
3. [ ] Sitemap should generate and show:
   - [ ] Total URLs count
   - [ ] Last generated timestamp
   - [ ] File size

### Test Sitemap Filtering
1. [ ] Configure exclusion filters (if available):
   - [ ] Exclude password-protected products
   - [ ] Exclude out-of-stock products
   - [ ] Exclude draft products
2. [ ] Regenerate and verify URL count changes accordingly

---

## 7. Schema Markup

### Test Schema Generation
1. [ ] Navigate to **SEO > Schema**
2. [ ] Select a product
3. [ ] Click "Generate Product Schema"
4. [ ] Schema JSON should appear with:
   - [ ] @type: "Product"
   - [ ] name
   - [ ] description
   - [ ] price
   - [ ] availability
   - [ ] image

### Test Organization Schema
1. [ ] Click "Generate Organization Schema"
2. [ ] Should auto-fill from store info:
   - [ ] Store name
   - [ ] Store URL
   - [ ] Contact email
3. [ ] Verify JSON structure is valid

### Test Schema Validation
1. [ ] Verify generated schemas pass validation
2. [ ] Copy schema JSON
3. [ ] Paste into https://schema.org validator
4. [ ] Should show "Valid" with no errors

---

## 8. Images SEO

### Test Alt Text Analysis
1. [ ] Navigate to **SEO > Images**
2. [ ] Should scan products for missing alt text
3. [ ] Display products missing alt text
4. [ ] Allow editing alt text inline

### Test Alt Text Bulk Edit
1. [ ] Use alt text templates with variables
2. [ ] Apply to multiple products
3. [ ] Verify alt text updated correctly

---

## 9. GDPR Compliance (Manual Testing)

### Test GDPR Webhook Responses
1. [ ] In Shopify Admin, navigate to **Settings > Apps and integrations > Webhooks**
2. [ ] Find your app's webhooks
3. [ ] Verify these are registered:
   - [ ] app/uninstalled
   - [ ] customers_data_request
   - [ ] customers_redact
   - [ ] shop_redact

### Test Customer Redaction (requires test flow)
1. [ ] Check ActivityLog for GDPR events:
   - [ ] Navigate to database or logs
   - [ ] Search for `action: 'GDPR_CUSTOMER_REDACT'`
   - [ ] Verify entries have customer email and timestamp

2. [ ] Verify error handling:
   - [ ] If webhook fails, webhook log should show 500 status
   - [ ] Shopify should attempt retries

### Test Shop Deletion Cleanup
1. [ ] When uninstalling app, verify cleanup:
   - [ ] Store record deleted
   - [ ] All user data deleted
   - [ ] All audit data deleted
   - [ ] Sessions cleared

---

## 10. Dashboard & Health Score

### Test Dashboard Loading
1. [ ] Navigate to **Dashboard**
2. [ ] Should display:
   - [ ] SEO Health Score (0-100)
   - [ ] Health status (Excellent/Good/Needs Work/Critical)
   - [ ] Recent audits
   - [ ] Quick wins
   - [ ] Activity log

### Test Health Score Calculation
1. [ ] Score should be based on:
   - [ ] Latest audit issues
   - [ ] Critical issues (-5 each)
   - [ ] High issues (-2 each)
   - [ ] Bonuses for connected GSC, generated sitemap

---

## 11. Error Handling & Edge Cases

### Test Error Scenarios
- [ ] Disconnect network during GSC auth - should show error gracefully
- [ ] Try to access protected routes without auth - should redirect to login
- [ ] Submit empty forms - should show validation errors
- [ ] Navigate back after auth - should work without issues

### Test Session Timeout
- [ ] Wait for session to expire (if applicable)
- [ ] Should prompt to re-authenticate
- [ ] Should not lose data

---

## 12. Performance & Load Times

### Test Response Times
- [ ] Audit initiation: < 5 seconds
- [ ] GSC data fetch: < 3 seconds
- [ ] Meta editor load: < 2 seconds
- [ ] Sitemap generation: < 10 seconds
- [ ] Dashboard load: < 2 seconds

### Test with Large Data Sets
- [ ] With 100+ products, audit should complete
- [ ] With many audit records, history should load quickly
- [ ] Bulk operations should handle 50+ items

---

## 13. Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (if on Mac)

Verify:
- [ ] All buttons clickable
- [ ] Forms submit correctly
- [ ] Modals display properly
- [ ] No console errors

---

## Issues Found

| Issue | Severity | Steps to Reproduce | Status |
|-------|----------|-------------------|--------|
| (Example) | High | 1. Connect GSC 2. Refresh | Open/Fixed |
|  |  |  |  |
|  |  |  |  |

---

## Sign-Off

- **Tester Name:** _______________
- **Date Tested:** _______________
- **Overall Result:** ✅ PASS / ❌ FAIL
- **Ready for Submission:** ✅ YES / ❌ NO

**Notes:**
```
(Additional notes, blockers, or observations)
```

---

## Next Steps

If **PASS:**
- [ ] Proceed to Shopify App Store submission
- [ ] Verify all 19 blockers remain fixed
- [ ] Run unit tests one final time

If **FAIL:**
- [ ] Document issues above
- [ ] Fix issues with unit test coverage
- [ ] Retest critical flows
- [ ] Verify no regressions
