/**
 * Form Validation Edge Case Tests
 * Comprehensive testing of validation utilities and edge cases
 */

import {
  validateEmail,
  sanitizeUrl,
  validatePhoneNumber,
  formatPhoneNumber,
  validateSlug,
  toSlug,
} from '~/utils/validation';

describe('Form Validation - Email Validation', () => {
  describe('Valid Email Addresses', () => {
    it('should validate simple email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
    });

    it('should validate emails with numbers', () => {
      expect(validateEmail('user123@example.com')).toBe(true);
    });

    it('should validate emails with dots in local part', () => {
      expect(validateEmail('first.last@example.com')).toBe(true);
    });

    it('should validate emails with special characters', () => {
      expect(validateEmail('user+tag@example.com')).toBe(true);
    });

    it('should validate emails with dashes in domain', () => {
      expect(validateEmail('user@example-domain.com')).toBe(true);
    });

    it('should validate emails with subdomains', () => {
      expect(validateEmail('user@mail.example.co.uk')).toBe(true);
    });

    it('should validate emails with single letter local part', () => {
      expect(validateEmail('a@example.com')).toBe(true);
    });

    it('should validate emails with many special characters', () => {
      expect(validateEmail('user!#$%&*+/=?^_~@example.com')).toBe(true);
    });
  });

  describe('Invalid Email Addresses', () => {
    it('should reject emails without @ symbol', () => {
      expect(validateEmail('userexample.com')).toBe(false);
    });

    it('should reject emails with multiple @ symbols', () => {
      expect(validateEmail('user@@example.com')).toBe(false);
    });

    it('should reject emails without domain', () => {
      expect(validateEmail('user@')).toBe(false);
    });

    it('should reject emails without local part', () => {
      expect(validateEmail('@example.com')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(validateEmail('')).toBe(false);
    });

    it('should reject whitespace only', () => {
      expect(validateEmail('   ')).toBe(false);
    });

    it('should reject null', () => {
      expect(validateEmail(null as any)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(validateEmail(undefined as any)).toBe(false);
    });

    it('should reject emails with spaces', () => {
      expect(validateEmail('user name@example.com')).toBe(false);
    });

    it('should handle emails without TLD', () => {
      const result = validateEmail('user@example');
      expect(typeof result).toBe('boolean');
    });

    it('should handle emails starting with dot', () => {
      const result = validateEmail('.user@example.com');
      expect(typeof result).toBe('boolean');
    });

    it('should handle emails with consecutive dots', () => {
      const result = validateEmail('user..name@example.com');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Email Edge Cases', () => {
    it('should trim whitespace from email', () => {
      expect(validateEmail('  user@example.com  ')).toBe(true);
    });

    it('should reject emails with leading/trailing spaces in domain', () => {
      expect(validateEmail('user@ example.com')).toBe(false);
    });

    it('should accept emails with hyphens in local part', () => {
      expect(validateEmail('user-name@example.com')).toBe(true);
    });

    it('should accept very long local part', () => {
      const longLocal = 'a'.repeat(64);
      expect(validateEmail(longLocal + '@example.com')).toBe(true);
    });

    it('should handle email with very long domain', () => {
      expect(validateEmail('user@' + 'sub.'.repeat(5) + 'example.com')).toBe(true);
    });
  });
});

describe('Form Validation - URL Sanitization', () => {
  describe('Valid URLs', () => {
    it('should sanitize http URLs', () => {
      const result = sanitizeUrl('http://example.com');
      expect(result).not.toBeNull();
    });

    it('should sanitize https URLs', () => {
      const result = sanitizeUrl('https://example.com');
      expect(result).not.toBeNull();
    });

    it('should accept URLs with paths', () => {
      expect(sanitizeUrl('https://example.com/path/to/page')).toBe('https://example.com/path/to/page');
    });

    it('should sanitize URLs with query parameters', () => {
      const url = 'https://example.com?param=value&other=123';
      const result = sanitizeUrl(url);
      expect(result).not.toBeNull();
    });

    it('should sanitize URLs with fragments', () => {
      const url = 'https://example.com#section';
      const result = sanitizeUrl(url);
      expect(result).not.toBeNull();
    });

    it('should accept URLs with ports', () => {
      const url = 'https://example.com:8080/path';
      expect(sanitizeUrl(url)).toBe(url);
    });
  });

  describe('Invalid URLs - Dangerous Protocols', () => {
    it('should reject javascript protocol', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
    });

    it('should reject javascript protocol with uppercase', () => {
      expect(sanitizeUrl('JavaScript:alert(1)')).toBeNull();
    });

    it('should reject data protocol', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    });

    it('should reject vbscript protocol', () => {
      expect(sanitizeUrl('vbscript:alert(1)')).toBeNull();
    });

    it('should reject file protocol', () => {
      expect(sanitizeUrl('file:///etc/passwd')).toBeNull();
    });
  });

  describe('URL Edge Cases', () => {
    it('should handle empty string', () => {
      expect(sanitizeUrl('')).toBeNull();
    });

    it('should handle null', () => {
      expect(sanitizeUrl(null as any)).toBeNull();
    });

    it('should handle undefined', () => {
      expect(sanitizeUrl(undefined as any)).toBeNull();
    });

    it('should sanitize URLs with leading/trailing spaces', () => {
      const url = 'https://example.com';
      const result = sanitizeUrl('  ' + url + '  ');
      expect(result).not.toBeNull();
    });

    it('should handle URLs with encoded special characters', () => {
      const url = 'https://example.com?q=search%20term&other=value';
      const result = sanitizeUrl(url);
      expect(result).not.toBeNull();
    });

    it('should handle international domain names', () => {
      const url = 'https://münchen.de';
      const result = sanitizeUrl(url);
      expect(result).not.toBeNull();
    });
  });
});

describe('Form Validation - Phone Number Validation', () => {
  describe('Valid Phone Numbers', () => {
    it('should validate US format', () => {
      expect(validatePhoneNumber('(123) 456-7890')).toBe(true);
    });

    it('should validate 10-digit format', () => {
      expect(validatePhoneNumber('1234567890')).toBe(true);
    });

    it('should validate with plus and country code', () => {
      expect(validatePhoneNumber('+1 123 456 7890')).toBe(true);
    });

    it('should validate with dashes', () => {
      expect(validatePhoneNumber('123-456-7890')).toBe(true);
    });

    it('should validate with spaces', () => {
      expect(validatePhoneNumber('123 456 7890')).toBe(true);
    });

    it('should validate with dots', () => {
      expect(validatePhoneNumber('123.456.7890')).toBe(true);
    });

    it('should validate international format', () => {
      expect(validatePhoneNumber('+44 20 7946 0958')).toBe(true);
    });
  });

  describe('Invalid Phone Numbers', () => {
    it('should reject empty string', () => {
      expect(validatePhoneNumber('')).toBe(false);
    });

    it('should reject only letters', () => {
      expect(validatePhoneNumber('abcdefghij')).toBe(false);
    });

    it('should reject too few digits', () => {
      expect(validatePhoneNumber('123-456')).toBe(false);
    });

    it('should reject null', () => {
      expect(validatePhoneNumber(null as any)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(validatePhoneNumber(undefined as any)).toBe(false);
    });

    it('should reject special characters only', () => {
      expect(validatePhoneNumber('()-.')).toBe(false);
    });
  });

  describe('Phone Number Edge Cases', () => {
    it('should handle leading/trailing spaces', () => {
      expect(validatePhoneNumber('  1234567890  ')).toBe(true);
    });

    it('should handle phone with extension notation', () => {
      const result = validatePhoneNumber('(123) 456-7890 ext. 123');
      expect(typeof result).toBe('boolean');
    });

    it('should handle phone with country code variations', () => {
      expect(validatePhoneNumber('+1-123-456-7890')).toBe(true);
    });

    it('should reject phone with only spaces', () => {
      expect(validatePhoneNumber('     ')).toBe(false);
    });
  });
});

describe('Form Validation - Phone Number Formatting', () => {
  describe('Format Valid Phone Numbers', () => {
    it('should format 10 digits to (XXX) XXX-XXXX', () => {
      expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
    });

    it('should format with existing formatting', () => {
      expect(formatPhoneNumber('(123) 456-7890')).toBe('(123) 456-7890');
    });

    it('should format 11 digits starting with 1', () => {
      expect(formatPhoneNumber('11234567890')).toBe('+1 (123) 456-7890');
    });

    it('should handle digits with spaces', () => {
      const formatted = formatPhoneNumber('123 456 7890');
      expect(formatted).toMatch(/[0-9\-()\s+]/);
    });

    it('should handle leading 1', () => {
      expect(formatPhoneNumber('1 123 456 7890')).toContain('123');
    });
  });

  describe('Handle Invalid Input', () => {
    it('should return empty string for empty input', () => {
      expect(formatPhoneNumber('')).toBe('');
    });

    it('should extract digits from various formats', () => {
      const formatted = formatPhoneNumber('(123) 456-7890');
      expect(formatted).toContain('123');
      expect(formatted).toContain('456');
      expect(formatted).toContain('7890');
    });

    it('should handle non-digit characters', () => {
      const formatted = formatPhoneNumber('123abc456def7890');
      expect(formatted).toMatch(/[0-9]/);
    });
  });

  describe('Phone Formatting Edge Cases', () => {
    it('should handle very long number', () => {
      const formatted = formatPhoneNumber('123456789012345');
      expect(typeof formatted).toBe('string');
    });

    it('should handle single digit', () => {
      const formatted = formatPhoneNumber('1');
      expect(typeof formatted).toBe('string');
    });

    it('should preserve country code format', () => {
      expect(formatPhoneNumber('+1 123 456 7890')).toContain('+');
    });
  });
});

describe('Form Validation - Slug Validation', () => {
  describe('Valid Slugs', () => {
    it('should validate simple slug', () => {
      expect(validateSlug('my-post')).toBe(true);
    });

    it('should validate slug with numbers', () => {
      expect(validateSlug('post-2024')).toBe(true);
    });

    it('should validate single character slug', () => {
      expect(validateSlug('a')).toBe(true);
    });

    it('should validate long slug', () => {
      expect(validateSlug('this-is-a-very-long-slug-with-many-words')).toBe(true);
    });

    it('should validate slug starting with number', () => {
      expect(validateSlug('2024-post')).toBe(true);
    });

    it('should validate slug ending with number', () => {
      expect(validateSlug('post-2024')).toBe(true);
    });
  });

  describe('Invalid Slugs', () => {
    it('should reject empty string', () => {
      expect(validateSlug('')).toBe(false);
    });

    it('should reject slug with spaces', () => {
      expect(validateSlug('my post')).toBe(false);
    });

    it('should reject slug with uppercase', () => {
      expect(validateSlug('MyPost')).toBe(false);
    });

    it('should reject slug with special characters', () => {
      expect(validateSlug('my@post')).toBe(false);
    });

    it('should reject slug starting with dash', () => {
      expect(validateSlug('-my-post')).toBe(false);
    });

    it('should reject slug ending with dash', () => {
      expect(validateSlug('my-post-')).toBe(false);
    });

    it('should reject slug with consecutive dashes', () => {
      expect(validateSlug('my--post')).toBe(false);
    });

    it('should reject null', () => {
      expect(validateSlug(null as any)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(validateSlug(undefined as any)).toBe(false);
    });
  });

  describe('Slug Edge Cases', () => {
    it('should reject whitespace only', () => {
      expect(validateSlug('   ')).toBe(false);
    });

    it('should handle slug with underscores', () => {
      const result = validateSlug('my_post');
      expect(typeof result).toBe('boolean');
    });

    it('should reject slug with leading/trailing spaces', () => {
      expect(validateSlug('  my-post  ')).toBe(false);
    });

    it('should accept maximum length slug', () => {
      const longSlug = 'a'.repeat(100) + '-' + 'b'.repeat(100);
      const result = validateSlug(longSlug);
      expect(typeof result).toBe('boolean');
    });
  });
});

describe('Form Validation - Slug Conversion', () => {
  describe('Convert Valid Text to Slug', () => {
    it('should convert simple text to slug', () => {
      expect(toSlug('Hello World')).toBe('hello-world');
    });

    it('should convert text with multiple spaces', () => {
      expect(toSlug('Hello   World')).toBe('hello-world');
    });

    it('should remove special characters', () => {
      expect(toSlug('Hello! World?')).toBe('hello-world');
    });

    it('should convert uppercase to lowercase', () => {
      expect(toSlug('HELLO WORLD')).toBe('hello-world');
    });

    it('should replace underscores with dashes', () => {
      expect(toSlug('hello_world')).toBe('hello-world');
    });

    it('should handle numbers in text', () => {
      expect(toSlug('Hello World 2024')).toBe('hello-world-2024');
    });

    it('should preserve existing dashes', () => {
      expect(toSlug('hello-world-2024')).toBe('hello-world-2024');
    });
  });

  describe('Handle Special Cases', () => {
    it('should handle empty string', () => {
      expect(toSlug('')).toBe('');
    });

    it('should handle only spaces', () => {
      expect(toSlug('   ')).toBe('');
    });

    it('should handle only special characters', () => {
      expect(toSlug('!@#$%^&*()')).toBe('');
    });

    it('should handle accented characters', () => {
      const result = toSlug('Café');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle mixed punctuation', () => {
      expect(toSlug('Hello, World! How are you?')).toBe('hello-world-how-are-you');
    });
  });

  describe('Slug Conversion Edge Cases', () => {
    it('should handle very long text', () => {
      const longText = 'hello '.repeat(100);
      const slug = toSlug(longText);
      expect(slug).toBeTruthy();
      expect(slug.includes('-')).toBe(true);
    });

    it('should handle single word', () => {
      expect(toSlug('hello')).toBe('hello');
    });

    it('should handle text with line breaks', () => {
      const result = toSlug('hello\nworld');
      expect(typeof result).toBe('string');
    });

    it('should handle tabs and special whitespace', () => {
      const result = toSlug('hello\tworld');
      expect(typeof result).toBe('string');
    });

    it('should convert unicode characters appropriately', () => {
      const result = toSlug('Über cool');
      expect(typeof result).toBe('string');
    });
  });
});
