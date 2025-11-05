# RankHigh SEO Testing Infrastructure

Comprehensive testing infrastructure adapted from Meridian Theme, configured for Shopify Remix app testing.

## Quick Start

```bash
# Install dependencies
npm install

# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run complete test suite
npm run test:all
```

## Testing Stack

### Unit Testing
- **Jest 30.2.0** - Test runner and assertion library
- **@testing-library/react 14.1.2** - React component testing utilities
- **@testing-library/jest-dom 6.1.5** - Custom DOM matchers
- **jest-environment-jsdom 30.2.0** - DOM environment simulation

### E2E Testing
- **Playwright 1.56.1** - End-to-end testing framework
- Browsers: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari

### Infrastructure
- **TypeScript** - Full type safety for all tests
- **ESLint** - Code quality
- **Prettier** - Code formatting

## Directory Structure

```
rankhigh-seo-fresh/
├── __tests__/                    # Unit tests
│   ├── services/                 # Service tests
│   │   ├── audit.test.ts
│   │   ├── healthScore.test.ts
│   │   └── gsc.test.ts
│   └── components/               # Component tests
│       ├── Dashboard.test.tsx
│       ├── AuditPage.test.tsx
│       └── MetaEditor.test.tsx
│
├── e2e/                          # E2E tests
│   ├── fixtures.ts               # Custom test fixtures
│   ├── audit.spec.ts             # Audit workflow tests
│   ├── meta-editor.spec.ts       # Meta editor tests
│   └── gsc-integration.spec.ts   # GSC integration tests
│
├── jest.config.js                # Jest configuration
├── jest.setup.js                 # Jest setup and mocks
├── playwright.config.js          # Playwright configuration
└── TESTING.md                    # This file
```

## Configuration Files

### jest.config.js
- Environment: jsdom (simulates DOM)
- Test patterns: `**/__tests__/**/*.test.ts`, `**/*.test.tsx`
- Coverage: 80% target for branches
- Module aliases: `~` maps to `app/`
- TypeScript support via SWC

### jest.setup.js
Global mocks for:
- **IntersectionObserver** - Visibility detection
- **localStorage / sessionStorage** - Storage APIs
- **fetch** - HTTP requests
- **matchMedia** - Media queries
- **requestAnimationFrame** - Animation frame
- **Shopify objects** - App bridge, cart, etc.

### playwright.config.js
- Base URL: `http://localhost:8080`
- Test directory: `./e2e`
- 5 browser contexts: Desktop (3 browsers) + Mobile (2 browsers)
- Screenshots on failure
- Videos on failure
- HTML reports

## Writing Tests

### Unit Test Example

```typescript
// __tests__/services/audit.test.ts
import { canRunAudit, queueAudit } from '~/services/audit/auditQueue.server';
import prisma from '~/db.server';

jest.mock('~/db.server');

describe('Audit Queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('canRunAudit', () => {
    it('should allow new audit if none running', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await canRunAudit('store-123');

      expect(result.allowed).toBe(true);
    });

    it('should prevent audit if one is running', async () => {
      (prisma.audit.findFirst as jest.Mock).mockResolvedValue({
        id: 'audit-1',
        status: 'RUNNING'
      });

      const result = await canRunAudit('store-123');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('already running');
    });

    it('should enforce 1-hour cooldown for FREE tier', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000 + 1000);

      (prisma.audit.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)  // No running audits
        .mockResolvedValueOnce({      // Last audit was 1 hour - 1 second ago
          id: 'audit-1',
          createdAt: oneHourAgo,
          status: 'COMPLETED'
        });

      const result = await canRunAudit('store-123');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('1 hour');
      expect(result.nextAllowedTime).toBeDefined();
    });
  });

  describe('queueAudit', () => {
    it('should queue audit with Redis available', async () => {
      const jobId = await queueAudit({
        auditId: 'audit-123',
        storeId: 'store-456',
        shopDomain: 'example.myshopify.com'
      });

      expect(jobId).toBeDefined();
      expect(jobId).not.toBe('sync');
    });
  });
});
```

### Component Test Example

```typescript
// __tests__/components/Dashboard.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '~/components/dashboard/Dashboard';

describe('Dashboard', () => {
  it('renders dashboard header', () => {
    render(<Dashboard />);

    expect(screen.getByRole('heading', { name: /SEO Health Score/i }))
      .toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    render(<Dashboard />);

    expect(screen.getByTestId('loading-spinner'))
      .toBeInTheDocument();
  });

  it('displays audit results after loading', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner'))
        .not.toBeInTheDocument();
    });

    expect(screen.getByText(/Overall Score:/i))
      .toBeInTheDocument();
  });
});
```

### E2E Test Example

```typescript
// e2e/audit.spec.ts
import { test, expect } from './fixtures';

test.describe('Audit Workflow', () => {
  test('should run complete audit', async ({ appPage }) => {
    // Navigate to audit page
    await appPage.goto('/app/seo/audit');

    // Start audit
    const startButton = appPage.locator('button:has-text("Start Audit")');
    await startButton.click();

    // Wait for audit to complete
    await appPage.waitForSelector('[data-testid="audit-results"]', {
      timeout: 30000
    });

    // Verify results
    const score = appPage.locator('[data-testid="overall-score"]');
    await expect(score).toBeVisible();

    const scoreValue = await score.textContent();
    expect(scoreValue).toMatch(/\d+/);
  });

  test('should handle audit errors gracefully', async ({ appPage }) => {
    await appPage.goto('/app/seo/audit');

    // Simulate error
    await appPage.evaluate(() => {
      (window as any).fetch = () =>
        Promise.reject(new Error('Network error'));
    });

    const startButton = appPage.locator('button:has-text("Start Audit")');
    await startButton.click();

    // Should show error message
    const errorMessage = appPage.locator('[role="alert"]');
    await expect(errorMessage).toContainText('Something went wrong');
  });
});
```

## Test Selectors

Add `data-testid` attributes to components for easier E2E testing:

```tsx
// Component
export function Dashboard() {
  return (
    <div data-testid="dashboard">
      <h1 data-testid="dashboard-title">Dashboard</h1>
      <div data-testid="health-score">85</div>
      <button data-testid="start-audit">Start Audit</button>
    </div>
  );
}
```

## Coverage Goals

- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

View coverage report:
```bash
npm run test:coverage
open coverage/index.html
```

## CI/CD Integration

### GitHub Actions Example

Add to `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test -- --coverage
      - run: npm run test:e2e

      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Best Practices

### Unit Tests
1. Test behavior, not implementation
2. Mock external dependencies (Prisma, fetch, etc.)
3. Use descriptive test names
4. Test edge cases and error scenarios
5. Keep tests DRY with helper functions

### E2E Tests
1. Use `data-testid` attributes instead of CSS selectors
2. Wait for elements, don't assume timing
3. Test critical user workflows
4. Use custom fixtures for common operations
5. Keep tests independent and idempotent

### General
1. Organize tests alongside source code or in `__tests__`
2. Run tests before committing (`pre-commit` hook)
3. Maintain >80% coverage for critical paths
4. Update tests when changing features
5. Use TypeScript for type safety

## Debugging Tests

### Unit Tests
```bash
# Run specific test file
npm test -- __tests__/services/audit.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="canRunAudit"

# Debug with Node inspector
node --inspect-brk ./node_modules/.bin/jest --runInBand
```

### E2E Tests
```bash
# Run specific test file
npm run test:e2e -- e2e/audit.spec.ts

# Debug with UI
npm run test:e2e:ui

# Run with browser visible
npm run test:e2e:headed

# Generate trace for debugging
npm run test:e2e -- --trace on
```

## Troubleshooting

### "Cannot find module" errors
- Ensure path aliases in `jest.config.js` match `tsconfig.json`
- Check `moduleNameMapper` for correct paths

### Mock not working
- Jest must be called with `jest.mock()` before import
- For server files, mock Prisma at the top of test
- Check mock is reset between tests with `jest.clearAllMocks()`

### E2E tests timing out
- Increase timeout in `playwright.config.js`
- Use `waitFor` helpers instead of fixed `waitForTimeout`
- Check if app is running on correct port

### localStorage errors in tests
- Tests use `StorageMock` from `jest.setup.js`
- Mocks are cleared between tests automatically

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Contributing Tests

When adding features:
1. Write tests first (TDD recommended)
2. Implement feature
3. Ensure all tests pass
4. Maintain or improve coverage
5. Submit PR with test coverage

Questions? Check existing tests for examples or update this documentation.
