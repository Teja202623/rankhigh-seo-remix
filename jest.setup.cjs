/**
 * Jest Setup File for RankHigh SEO
 *
 * Global test configuration and mocks for browser APIs, Shopify objects, and utilities
 * Adapted from Meridian Theme testing infrastructure
 */

require('@testing-library/jest-dom');

// ========================================
// Enhanced IntersectionObserver Mock
// ========================================
class IntersectionObserverMock {
  constructor(callback, options = {}) {
    this.callback = callback;
    this.options = options;
    this.elements = new Set();
  }

  observe(element) {
    this.elements.add(element);
    this.callback([{
      target: element,
      isIntersecting: true,
      intersectionRatio: 1,
      boundingClientRect: element.getBoundingClientRect(),
      intersectionRect: element.getBoundingClientRect(),
      rootBounds: null,
      time: Date.now()
    }], this);
  }

  unobserve(element) {
    this.elements.delete(element);
  }

  disconnect() {
    this.elements.clear();
  }

  triggerIntersection(element, isIntersecting = true) {
    this.callback([{
      target: element,
      isIntersecting,
      intersectionRatio: isIntersecting ? 1 : 0,
      boundingClientRect: element.getBoundingClientRect(),
      intersectionRect: isIntersecting ? element.getBoundingClientRect() : null,
      rootBounds: null,
      time: Date.now()
    }], this);
  }
}

global.IntersectionObserver = IntersectionObserverMock;

// ========================================
// LocalStorage & SessionStorage Mock
// ========================================
class StorageMock {
  constructor() {
    this.store = {};
  }

  clear() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }

  get length() {
    return Object.keys(this.store).length;
  }

  key(index) {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
}

global.localStorage = new StorageMock();
global.sessionStorage = new StorageMock();

// ========================================
// Fetch API Mock
// ========================================
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    clone: () => Promise.resolve({}),
  })
);

// ========================================
// MatchMedia Mock
// ========================================
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// ========================================
// Animation Frame Mocks
// ========================================
global.requestAnimationFrame = (cb) => {
  const id = setTimeout(cb, 16);
  return id;
};
global.cancelAnimationFrame = (id) => clearTimeout(id);

// ========================================
// Performance API Mock
// ========================================
global.performance = global.performance || {};
global.performance.now = () => Date.now();

// ========================================
// Custom Elements Mock
// ========================================
const customElementsRegistry = new Map();
global.customElements = {
  get: jest.fn((name) => customElementsRegistry.get(name)),
  define: jest.fn((name, constructor) => {
    customElementsRegistry.set(name, constructor);
  }),
  whenDefined: jest.fn(() => Promise.resolve()),
  upgrade: jest.fn()
};

// ========================================
// URL and Location Mocks
// ========================================
if (typeof window !== 'undefined') {
  delete window.location;
  window.location = {
    href: 'https://localhost:8080',
    origin: 'https://localhost:8080',
    pathname: '/',
    search: '',
    hash: '',
    reload: jest.fn(),
    replace: jest.fn(),
    assign: jest.fn(),
  };
}

// ========================================
// URLSearchParams Mock
// ========================================
global.URLSearchParams = jest.fn(function(init) {
  this.params = new Map();
  if (init) {
    if (typeof init === 'string') {
      init.split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        this.params.set(key, decodeURIComponent(value || ''));
      });
    } else if (typeof init === 'object') {
      Object.entries(init).forEach(([key, value]) => {
        this.params.set(key, value);
      });
    }
  }

  this.get = (key) => this.params.get(key) || null;
  this.set = (key, value) => this.params.set(key, value);
  this.delete = (key) => this.params.delete(key);
  this.has = (key) => this.params.has(key);
  this.getAll = (key) => [this.params.get(key)].filter(Boolean);
  this.toString = () => Array.from(this.params.entries())
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
});

// ========================================
// History API Mock
// ========================================
global.history = {
  pushState: jest.fn(),
  replaceState: jest.fn(),
  go: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  length: 0,
  state: {}
};

// ========================================
// Shopify App Bridge Mock
// ========================================
if (typeof window !== 'undefined') {
  global.window.shopifyApp = {
    apiKey: 'test-api-key',
    host: 'test.myshopify.com',
  };
}

// ========================================
// Meridian Global Mock (for RankHigh SEO)
// ========================================
global.Meridian = {
  cart: {
    items: [],
    count: 0,
    total: 0,
  },
  storage: {
    getItem: jest.fn((key) => localStorage.getItem(key)),
    setItem: jest.fn((key, value) => localStorage.setItem(key, value)),
    removeItem: jest.fn((key) => localStorage.removeItem(key)),
  },
  utils: {
    debounce: jest.fn((fn, wait) => fn),
    throttle: jest.fn((fn) => fn),
  }
};

// ========================================
// Console Suppression (optional)
// ========================================
// Uncomment to suppress console output during tests
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// ========================================
// ResizeObserver Mock
// ========================================
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {
    this.callback([{ target: document.body }]);
  }
  unobserve() {}
  disconnect() {}
};

// ========================================
// Suppress JSDOM Warnings
// ========================================
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
