# RankHigh SEO - Testing Quick Start Guide

## Current Status at a Glance

```
Total Services: 30+
  ├─ Tested: 4 (13%)
  └─ Untested: 26+ (87%)

Total Components: 53+
  ├─ Tested: 10 (19%)
  └─ Untested: 43+ (81%)

E2E Tests: 0 specs (fixtures only)
Test Infrastructure: READY ✓
```

## Most Critical 10 Tests to Add (Ranked by Impact)

### 1. auditService.server.test.ts
- **Location:** `__tests__/services/audit/auditService.test.ts`
- **Why:** Core business logic, 90% of user value
- **What to test:**
  - Audit execution flow
  - Check orchestration
  - Result aggregation
  - Status updates
- **Effort:** 4-6 hours | **Impact:** CRITICAL

### 2. Schema Validation (schemaValidator.server.test.ts)
- **Location:** `__tests__/services/schema/schemaValidator.test.ts`
- **Why:** Data integrity critical for structured data
- **What to test:**
  - JSON-LD validation
  - Required fields
  - Type validation
  - Error messages
- **Effort:** 2-3 hours | **Impact:** HIGH

### 3. PageEditor.test.tsx
- **Location:** `__tests__/components/pages/PageEditor.test.tsx`
- **Why:** Core user workflow for editing metadata
- **What to test:**
  - Form state management
  - Meta title/description updates
  - SERP preview sync
  - Save functionality
  - Validation
- **Effort:** 3-4 hours | **Impact:** HIGH

### 4. gscAuth.server.test.ts
- **Location:** `__tests__/services/gsc/gscAuth.test.ts`
- **Why:** Third-party integration, authentication critical
- **What to test:**
  - OAuth flow
  - Token refresh
  - Token storage
  - Error handling
  - Permission validation
- **Effort:** 2-3 hours | **Impact:** HIGH

### 5. brokenLinks.server.test.ts
- **Location:** `__tests__/services/audit/checks/brokenLinks.test.ts`
- **Why:** Audit check module, high user value
- **What to test:**
  - Link detection
  - Status code checking
  - Timeout handling
  - Redirect following
  - Error handling
- **Effort:** 3-4 hours | **Impact:** HIGH

### 6. GoogleSearchConsole.test.tsx
- **Location:** `__tests__/components/analytics/GoogleSearchConsole.test.tsx`
- **Why:** Important dashboard feature
- **What to test:**
  - Data loading
  - Chart rendering
  - Filter functionality
  - Date range selection
  - Error states
- **Effort:** 3 hours | **Impact:** MEDIUM-HIGH

### 7. Cache Service (cache.server.test.ts)
- **Location:** `__tests__/services/cache.test.ts`
- **Why:** Performance critical, affects all data operations
- **What to test:**
  - Cache hit/miss
  - TTL expiration
  - Cache invalidation
  - Memory management
  - Concurrent access
- **Effort:** 2-3 hours | **Impact:** MEDIUM-HIGH

### 8. Sitemap Generator (sitemapGenerator.server.test.ts)
- **Location:** `__tests__/services/sitemap/sitemapGenerator.test.ts`
- **Why:** Important SEO feature
- **What to test:**
  - Sitemap XML generation
  - URL inclusion/exclusion
  - Priority calculation
  - Lastmod timestamps
  - Format validation
- **Effort:** 2-3 hours | **Impact:** MEDIUM

### 9. E2E: Audit Workflow
- **Location:** `e2e/audit.spec.ts`
- **Why:** Validates end-to-end core feature
- **What to test:**
  - Start audit
  - Progress monitoring
  - Results display
  - Issue filtering
  - Issue details
- **Effort:** 2-3 hours | **Impact:** MEDIUM-HIGH

### 10. E2E: Page Editor Workflow
- **Location:** `e2e/page-editor.spec.ts`
- **Why:** Validates core user editing workflow
- **What to test:**
  - Navigate to pages
  - Select page
  - Edit metadata
  - See SERP preview
  - Save and confirm
- **Effort:** 2 hours | **Impact:** MEDIUM-HIGH

---

## How to Run Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode (develop & test together)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- __tests__/services/audit/auditService.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="canRunAudit"

# Run E2E tests (once implemented)
npm run test:e2e

# Run E2E with UI
npm run test:e2e:ui
```

---

## Writing Your First Test

### Service Test Template

```typescript
// __tests__/services/audit/auditService.test.ts
import { runAudit } from '~/services/audit/auditService.server';
import prisma from '~/db.server';

// Mock external dependencies
jest.mock('~/db.server');

describe('Audit Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('runAudit', () => {
    it('should run audit for valid store', async () => {
      // Setup
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: 'store-123',
        shopDomain: 'example.myshopify.com'
      });

      // Execute
      const result = await runAudit('store-123');

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe('COMPLETED');
    });

    it('should throw error if store not found', async () => {
      (prisma.store.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(runAudit('store-123')).rejects.toThrow('Store not found');
    });
  });
});
```

### Component Test Template

```typescript
// __tests__/components/pages/PageEditor.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PageEditor from '~/components/pages/PageEditor';

describe('PageEditor Component', () => {
  const mockProps = {
    page: { id: '1', title: 'Home', metaTitle: '', metaDescription: '' },
    onSave: jest.fn(),
  };

  it('should render page editor', () => {
    render(<PageEditor {...mockProps} />);
    expect(screen.getByRole('heading', { name: /edit page/i })).toBeInTheDocument();
  });

  it('should update meta title input', async () => {
    render(<PageEditor {...mockProps} />);
    const titleInput = screen.getByLabelText(/meta title/i);
    
    fireEvent.change(titleInput, { target: { value: 'New Title' } });
    
    await waitFor(() => {
      expect(titleInput).toHaveValue('New Title');
    });
  });

  it('should save page when submit is clicked', async () => {
    render(<PageEditor {...mockProps} />);
    const saveButton = screen.getByRole('button', { name: /save/i });
    
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockProps.onSave).toHaveBeenCalled();
    });
  });
});
```

### E2E Test Template

```typescript
// e2e/audit.spec.ts
import { test, expect } from './fixtures';

test.describe('Audit Workflow', () => {
  test('should complete SEO audit', async ({ appPage }) => {
    // Navigate
    await appPage.goto('/app/seo/audit');
    
    // Start audit
    const startButton = appPage.locator('button:has-text("Start Audit")');
    await startButton.click();
    
    // Wait for completion
    await appPage.waitForSelector('[data-testid="audit-complete"]', { timeout: 30000 });
    
    // Verify results
    const results = appPage.locator('[data-testid="audit-results"]');
    await expect(results).toBeVisible();
  });
});
```

---

## Testing Patterns from Existing Tests

### Service Tests
- **Mock Prisma** at the top with `jest.mock('~/db.server')`
- **Mock external APIs** (Google APIs, Redis, etc.)
- **Use `beforeEach`** to reset mocks
- **Test both success and error paths**
- **Test edge cases** (null values, boundaries, large numbers)
- **Use descriptive test names** that explain the scenario

### Component Tests
- **Use `data-testid`** instead of CSS selectors
- **Test user interactions** with `fireEvent` or `userEvent`
- **Use `waitFor`** for async operations
- **Mock API calls** at the service level
- **Test rendered output**, not implementation details
- **Cover happy path + error states**

### E2E Tests
- **Use fixtures** from e2e/fixtures.ts
- **Wait explicitly** for elements/network
- **Don't assume timing**
- **Test complete workflows** not single steps
- **Keep tests independent** (no shared state)
- **Use data-testid** attributes for reliability

---

## Common Mistakes to Avoid

### In Unit Tests
1. ❌ **Too many mocks** - Mock at service boundaries, not everywhere
2. ❌ **Shared test state** - Use `beforeEach` to reset
3. ❌ **Testing implementation** - Test behavior instead
4. ❌ **Ignoring edge cases** - Test null, 0, -1, empty strings
5. ❌ **Non-deterministic tests** - Avoid Date.now(), Math.random() without mocking

### In Component Tests
1. ❌ **Using `wrapper`** - Use testing-library fixtures instead
2. ❌ **Testing internal state** - Test what users see/interact with
3. ❌ **Slow tests** - Mock heavy operations
4. ❌ **Async without waiting** - Always use `waitFor`
5. ❌ **CSS selectors** - Use `data-testid` and role queries

### In E2E Tests
1. ❌ **Fixed waits** `await page.waitForTimeout(1000)` - Use element waits
2. ❌ **Flaky selectors** - Use `data-testid` or stable role queries
3. ❌ **Shared test data** - Create fresh data per test
4. ❌ **Testing multiple things** - One workflow per test
5. ❌ **Long tests** - Keep under 30 seconds, ideally under 10 seconds

---

## Helpful Resources

### Existing Examples in Project
- **Service test reference:** `__tests__/services/healthScore.test.ts` (39 test cases)
- **Service test reference:** `__tests__/services/auditQueue.test.ts` (25 test cases)
- **Component test reference:** `__tests__/components/dashboard/Dashboard.test.tsx`

### External Resources
- [Jest Documentation](https://jestjs.io/)
- [React Testing Library Docs](https://testing-library.com/)
- [Playwright Docs](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### In-Project Docs
- Full guide: `/TESTING.md`
- Setup summary: `/TESTING_SETUP_SUMMARY.md`
- Detailed analysis: `/TEST_COVERAGE_ANALYSIS.md` (this file!)

---

## Success Metrics

### Coverage Goals
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

### Speed Goals
- Unit tests: <500ms per test
- Component tests: <5s per test
- E2E tests: <30s per test
- Full suite: <5 minutes

### Quality Goals
- All tests pass in CI/CD
- No flaky tests (>99% pass rate)
- Tests document expected behavior
- Easy to add new tests following patterns

---

## Getting Started This Week

### Day 1-2: Learn by Example
1. Read `__tests__/services/healthScore.test.ts` (39 tests)
2. Run `npm test` to see them pass
3. Study the mocking patterns

### Day 2-3: Write First Test
1. Pick one untested service
2. Copy the pattern from healthScore.test.ts
3. Write 5-10 basic tests
4. Run tests and see them pass

### Day 3-5: Build Momentum
1. Write 2-3 more service tests
2. Add component tests to existing components
3. Establish team test patterns
4. Document what you learn

### Week 2: Expand Coverage
1. Audit system tests (9 files) - highest priority
2. Core component tests (5-6 files)
3. GSC service tests (3 files)

---

## Questions?

Refer to:
- Full analysis: `TEST_COVERAGE_ANALYSIS.md`
- Testing guide: `TESTING.md`
- Existing test patterns: `__tests__/services/healthScore.test.ts`
