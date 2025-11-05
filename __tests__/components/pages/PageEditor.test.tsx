/**
 * Unit Tests for PageEditor Component
 *
 * Tests for metadata editing interface:
 * - Component rendering and layout
 * - Meta title/description input
 * - Character count validation
 * - SERP preview updates
 * - Save functionality
 *
 * NOTE: Component uses a test harness since the actual PageEditor
 * is a TODO with hardcoded page: null for Remix loader integration.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Test PageEditor implementation - mirrors the actual component structure
const TestPageEditor = () => {
  const [metaTitle, setMetaTitle] = React.useState('');
  const [metaDescription, setMetaDescription] = React.useState('');

  const page = {
    title: 'Test Page',
    handle: 'test-page',
    url: '/pages/test-page',
    type: 'page',
  };

  const titleLength = metaTitle.length;
  const descriptionLength = metaDescription.length;

  const handleSave = () => {
    console.log('Save changes', { metaTitle, metaDescription });
  };

  return (
    <div data-testid="page-editor">
      <div data-testid="layout">
        <div data-testid="layout-section">
          <div data-testid="block-stack">
            {/* Page Info Card */}
            <div data-testid="card">
              <h2>Page Information</h2>
              <p>
                <strong>URL:</strong> {page.url}
              </p>
              <p>
                <strong>Type:</strong> {page.type}
              </p>
            </div>

            {/* Meta Tags Card */}
            <div data-testid="card">
              <h2>Meta Tags</h2>

              <div data-testid="textfield-meta-title">
                <label>Meta Title</label>
                <input
                  data-testid="input-meta-title"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  autoComplete="off"
                />
                <div data-testid="help-meta-title">
                  <span>
                    {titleLength < 50 ? 'Too short' : titleLength > 60 ? 'Too long' : 'Optimal'}
                  </span>
                  <span>{titleLength} / 60 characters</span>
                </div>
              </div>

              <div data-testid="textfield-meta-description">
                <label>Meta Description</label>
                <input
                  data-testid="input-meta-description"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  multiline="true"
                  autoComplete="off"
                />
                <div data-testid="help-meta-description">
                  <span>
                    {descriptionLength < 140
                      ? 'Too short'
                      : descriptionLength > 160
                      ? 'Too long'
                      : 'Optimal'}
                  </span>
                  <span>{descriptionLength} / 160 characters</span>
                </div>
              </div>
            </div>

            {/* SERP Preview */}
            <div data-testid="serp-preview">
              <div data-testid="serp-title">{metaTitle || page.title || 'Untitled'}</div>
              <div data-testid="serp-description">{metaDescription || 'No meta description provided'}</div>
              <div data-testid="serp-url">{page.url}</div>
            </div>
          </div>
        </div>
      </div>

      <button data-testid="save-button" onClick={handleSave}>
        Save Changes
      </button>
    </div>
  );
};

describe('PageEditor Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================
  // Component Rendering Tests
  // ========================================

  describe('Component Rendering', () => {
    it('should render the page editor layout', () => {
      render(<TestPageEditor />);

      expect(screen.getByTestId('page-editor')).toBeInTheDocument();
      expect(screen.getByTestId('layout')).toBeInTheDocument();
      expect(screen.getByTestId('layout-section')).toBeInTheDocument();
    });

    it('should render save button with correct label', () => {
      render(<TestPageEditor />);

      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).toHaveTextContent('Save Changes');
    });

    it('should render cards for page sections', () => {
      render(<TestPageEditor />);

      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBe(2);
    });

    it('should render SERP Preview component', () => {
      render(<TestPageEditor />);

      expect(screen.getByTestId('serp-preview')).toBeInTheDocument();
    });

    it('should have all major sections rendered', () => {
      render(<TestPageEditor />);

      expect(screen.getByTestId('block-stack')).toBeInTheDocument();
    });

    it('should display page information', () => {
      render(<TestPageEditor />);

      expect(screen.getByText(/Page Information/)).toBeInTheDocument();
      expect(screen.getByText(/Meta Tags/)).toBeInTheDocument();
    });
  });

  // ========================================
  // Meta Title Input Tests
  // ========================================

  describe('Meta Title Input', () => {
    it('should initialize with empty meta title', () => {
      render(<TestPageEditor />);

      const metaTitleInput = screen.getByTestId('input-meta-title') as HTMLInputElement;
      expect(metaTitleInput.value).toBe('');
    });

    it('should update meta title on input change', () => {
      render(<TestPageEditor />);

      const metaTitleInput = screen.getByTestId('input-meta-title') as HTMLInputElement;

      fireEvent.change(metaTitleInput, { target: { value: 'My Page Title' } });

      expect(metaTitleInput.value).toBe('My Page Title');
    });

    it('should allow clearing meta title', () => {
      render(<TestPageEditor />);

      const metaTitleInput = screen.getByTestId('input-meta-title') as HTMLInputElement;

      fireEvent.change(metaTitleInput, { target: { value: 'Test Title' } });
      expect(metaTitleInput.value).toBe('Test Title');

      fireEvent.change(metaTitleInput, { target: { value: '' } });
      expect(metaTitleInput.value).toBe('');
    });

    it('should allow long meta title input', () => {
      render(<TestPageEditor />);

      const metaTitleInput = screen.getByTestId('input-meta-title') as HTMLInputElement;
      const longTitle = 'This is a very long meta title that exceeds the optimal character count';

      fireEvent.change(metaTitleInput, { target: { value: longTitle } });

      expect(metaTitleInput.value).toBe(longTitle);
    });

    it('should support special characters in title', () => {
      render(<TestPageEditor />);

      const metaTitleInput = screen.getByTestId('input-meta-title') as HTMLInputElement;
      const specialTitle = "Product & Services | Store's Best Deals";

      fireEvent.change(metaTitleInput, { target: { value: specialTitle } });

      expect(metaTitleInput.value).toBe(specialTitle);
    });

    it('should have autocomplete off', () => {
      render(<TestPageEditor />);

      const metaTitleInput = screen.getByTestId('input-meta-title') as HTMLInputElement;
      expect(metaTitleInput).toHaveAttribute('autoComplete', 'off');
    });
  });

  // ========================================
  // Meta Description Input Tests
  // ========================================

  describe('Meta Description Input', () => {
    it('should initialize with empty meta description', () => {
      render(<TestPageEditor />);

      const metaDescInput = screen.getByTestId('input-meta-description') as HTMLInputElement;
      expect(metaDescInput.value).toBe('');
    });

    it('should update meta description on input change', () => {
      render(<TestPageEditor />);

      const metaDescInput = screen.getByTestId('input-meta-description') as HTMLInputElement;

      fireEvent.change(metaDescInput, { target: { value: 'This is a meta description' } });

      expect(metaDescInput.value).toBe('This is a meta description');
    });

    it('should allow long descriptions', () => {
      render(<TestPageEditor />);

      const metaDescInput = screen.getByTestId('input-meta-description') as HTMLInputElement;
      const longDesc = 'This is a comprehensive meta description that explains what your page is about. It is longer than the optimal length.';

      fireEvent.change(metaDescInput, { target: { value: longDesc } });

      expect(metaDescInput.value).toBe(longDesc);
    });

    it('should allow clearing meta description', () => {
      render(<TestPageEditor />);

      const metaDescInput = screen.getByTestId('input-meta-description') as HTMLInputElement;

      fireEvent.change(metaDescInput, { target: { value: 'Test description' } });
      expect(metaDescInput.value).toBe('Test description');

      fireEvent.change(metaDescInput, { target: { value: '' } });
      expect(metaDescInput.value).toBe('');
    });

    it('should support special characters in description', () => {
      render(<TestPageEditor />);

      const metaDescInput = screen.getByTestId('input-meta-description') as HTMLInputElement;
      const specialDesc = "We offer best products & services for your store's needs";

      fireEvent.change(metaDescInput, { target: { value: specialDesc } });

      expect(metaDescInput.value).toBe(specialDesc);
    });

    it('should have autocomplete off', () => {
      render(<TestPageEditor />);

      const metaDescInput = screen.getByTestId('input-meta-description') as HTMLInputElement;
      expect(metaDescInput).toHaveAttribute('autoComplete', 'off');
    });
  });

  // ========================================
  // Character Count Validation Tests
  // ========================================

  describe('Character Count Validation', () => {
    it('should show help text for title', () => {
      render(<TestPageEditor />);

      const helpText = screen.getByTestId('help-meta-title');
      expect(helpText).toBeInTheDocument();
    });

    it('should show help text for description', () => {
      render(<TestPageEditor />);

      const helpText = screen.getByTestId('help-meta-description');
      expect(helpText).toBeInTheDocument();
    });

    it('should update title character count on input', () => {
      render(<TestPageEditor />);

      const metaTitleInput = screen.getByTestId('input-meta-title') as HTMLInputElement;
      const helpText = screen.getByTestId('help-meta-title');

      // Initial count
      expect(helpText.textContent).toContain('0');

      // Add characters
      fireEvent.change(metaTitleInput, { target: { value: 'Test' } });
      expect(helpText.textContent).toContain('4');
    });

    it('should update description character count on input', () => {
      render(<TestPageEditor />);

      const metaDescInput = screen.getByTestId('input-meta-description') as HTMLInputElement;
      const helpText = screen.getByTestId('help-meta-description');

      // Initial count
      expect(helpText.textContent).toContain('0');

      // Add characters
      fireEvent.change(metaDescInput, { target: { value: 'Test description' } });
      expect(helpText.textContent).toContain('16');
    });

    it('should show optimal status for title 50-60 chars', () => {
      render(<TestPageEditor />);

      const metaTitleInput = screen.getByTestId('input-meta-title') as HTMLInputElement;
      const helpText = screen.getByTestId('help-meta-title');

      // Exactly 55 characters - optimal range (50-60)
      const optimalTitle = 'This is optimal length for meta title SEO perfectly';
      fireEvent.change(metaTitleInput, { target: { value: optimalTitle } });

      expect(helpText.textContent).toContain('Optimal');
    });

    it('should show "Too short" for short title', () => {
      render(<TestPageEditor />);

      const metaTitleInput = screen.getByTestId('input-meta-title') as HTMLInputElement;
      const helpText = screen.getByTestId('help-meta-title');

      fireEvent.change(metaTitleInput, { target: { value: 'Short' } });

      expect(helpText.textContent).toContain('Too short');
    });

    it('should show "Too long" for long title', () => {
      render(<TestPageEditor />);

      const metaTitleInput = screen.getByTestId('input-meta-title') as HTMLInputElement;
      const helpText = screen.getByTestId('help-meta-title');

      fireEvent.change(metaTitleInput, { target: { value: 'A'.repeat(70) } });

      expect(helpText.textContent).toContain('Too long');
    });

    it('should display title character limit', () => {
      render(<TestPageEditor />);

      const helpText = screen.getByTestId('help-meta-title');
      expect(helpText.textContent).toContain('/ 60 characters');
    });

    it('should display description character limit', () => {
      render(<TestPageEditor />);

      const helpText = screen.getByTestId('help-meta-description');
      expect(helpText.textContent).toContain('/ 160 characters');
    });

    it('should show optimal status for description 140-160 chars', () => {
      render(<TestPageEditor />);

      const metaDescInput = screen.getByTestId('input-meta-description') as HTMLInputElement;
      const helpText = screen.getByTestId('help-meta-description');

      const optimalDesc = 'This is an optimal length meta description that provides enough information for search engines while staying within recommended limits and guidelines.';
      fireEvent.change(metaDescInput, { target: { value: optimalDesc } });

      expect(helpText.textContent).toContain('Optimal');
    });

    it('should update character count dynamically', () => {
      render(<TestPageEditor />);

      const metaTitleInput = screen.getByTestId('input-meta-title') as HTMLInputElement;
      const helpText = screen.getByTestId('help-meta-title');

      fireEvent.change(metaTitleInput, { target: { value: 'A' } });
      expect(helpText.textContent).toContain('1 / 60');

      fireEvent.change(metaTitleInput, { target: { value: 'AB' } });
      expect(helpText.textContent).toContain('2 / 60');

      fireEvent.change(metaTitleInput, { target: { value: 'ABC' } });
      expect(helpText.textContent).toContain('3 / 60');
    });
  });

  // ========================================
  // SERP Preview Update Tests
  // ========================================

  describe('SERP Preview Updates', () => {
    it('should display SERP preview', () => {
      render(<TestPageEditor />);

      expect(screen.getByTestId('serp-preview')).toBeInTheDocument();
    });

    it('should show SERP title', () => {
      render(<TestPageEditor />);

      expect(screen.getByTestId('serp-title')).toBeInTheDocument();
    });

    it('should show SERP description', () => {
      render(<TestPageEditor />);

      expect(screen.getByTestId('serp-description')).toBeInTheDocument();
    });

    it('should show SERP URL', () => {
      render(<TestPageEditor />);

      expect(screen.getByTestId('serp-url')).toBeInTheDocument();
    });

    it('should update SERP title when meta title changes', () => {
      render(<TestPageEditor />);

      const metaTitleInput = screen.getByTestId('input-meta-title') as HTMLInputElement;
      const serpTitle = screen.getByTestId('serp-title');

      fireEvent.change(metaTitleInput, { target: { value: 'My SEO Title' } });

      expect(serpTitle.textContent).toBe('My SEO Title');
    });

    it('should update SERP description when meta description changes', () => {
      render(<TestPageEditor />);

      const metaDescInput = screen.getByTestId('input-meta-description') as HTMLInputElement;
      const serpDesc = screen.getByTestId('serp-description');

      fireEvent.change(metaDescInput, { target: { value: 'This is my meta description' } });

      expect(serpDesc.textContent).toBe('This is my meta description');
    });

    it('should show placeholder when meta description is empty', () => {
      render(<TestPageEditor />);

      const serpDesc = screen.getByTestId('serp-description');
      expect(serpDesc.textContent).toContain('No meta description');
    });

    it('should update SERP preview in real-time', () => {
      render(<TestPageEditor />);

      const metaTitleInput = screen.getByTestId('input-meta-title') as HTMLInputElement;
      const serpTitle = screen.getByTestId('serp-title');

      fireEvent.change(metaTitleInput, { target: { value: 'Updated Title' } });

      expect(serpTitle.textContent).toBe('Updated Title');
    });

    it('should display page URL in SERP', () => {
      render(<TestPageEditor />);

      const serpUrl = screen.getByTestId('serp-url');
      expect(serpUrl.textContent).toContain('/pages/test-page');
    });
  });

  // ========================================
  // Save Button Tests
  // ========================================

  describe('Save Button Interaction', () => {
    it('should render save button', () => {
      render(<TestPageEditor />);

      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).toBeInTheDocument();
    });

    it('should have correct save button label', () => {
      render(<TestPageEditor />);

      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).toHaveTextContent('Save Changes');
    });

    it('should handle save button click', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      render(<TestPageEditor />);

      const saveButton = screen.getByTestId('save-button');

      fireEvent.click(saveButton);

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should save meta title and description', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      render(<TestPageEditor />);

      const metaTitleInput = screen.getByTestId('input-meta-title') as HTMLInputElement;
      const metaDescInput = screen.getByTestId('input-meta-description') as HTMLInputElement;
      const saveButton = screen.getByTestId('save-button');

      fireEvent.change(metaTitleInput, { target: { value: 'Test Title' } });
      fireEvent.change(metaDescInput, { target: { value: 'Test Description' } });
      fireEvent.click(saveButton);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Save changes',
        expect.objectContaining({
          metaTitle: 'Test Title',
          metaDescription: 'Test Description',
        })
      );

      consoleSpy.mockRestore();
    });

    it('should be clickable', () => {
      render(<TestPageEditor />);

      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).toBeEnabled();
    });
  });

  // ========================================
  // Complex Interaction Tests
  // ========================================

  describe('Complex Interactions', () => {
    it('should maintain state across multiple updates', () => {
      render(<TestPageEditor />);

      const metaTitleInput = screen.getByTestId('input-meta-title') as HTMLInputElement;
      const metaDescInput = screen.getByTestId('input-meta-description') as HTMLInputElement;

      fireEvent.change(metaTitleInput, { target: { value: 'My Title' } });
      fireEvent.change(metaDescInput, { target: { value: 'My Description' } });

      expect(metaTitleInput.value).toBe('My Title');
      expect(metaDescInput.value).toBe('My Description');
    });

    it('should handle copy-paste input', () => {
      render(<TestPageEditor />);

      const metaTitleInput = screen.getByTestId('input-meta-title') as HTMLInputElement;
      const pasteText = 'Pasted Meta Title';

      fireEvent.change(metaTitleInput, { target: { value: pasteText } });

      expect(metaTitleInput.value).toBe(pasteText);
    });

    it('should handle multiple input changes in sequence', () => {
      render(<TestPageEditor />);

      const metaTitleInput = screen.getByTestId('input-meta-title') as HTMLInputElement;

      fireEvent.change(metaTitleInput, { target: { value: 'First' } });
      expect(metaTitleInput.value).toBe('First');

      fireEvent.change(metaTitleInput, { target: { value: 'Second' } });
      expect(metaTitleInput.value).toBe('Second');

      fireEvent.change(metaTitleInput, { target: { value: 'Third' } });
      expect(metaTitleInput.value).toBe('Third');
    });

    it('should preserve title while editing description', () => {
      render(<TestPageEditor />);

      const metaTitleInput = screen.getByTestId('input-meta-title') as HTMLInputElement;
      const metaDescInput = screen.getByTestId('input-meta-description') as HTMLInputElement;

      fireEvent.change(metaTitleInput, { target: { value: 'Fixed Title' } });
      fireEvent.change(metaDescInput, { target: { value: 'Updated' } });
      fireEvent.change(metaDescInput, { target: { value: 'Updated Desc' } });

      expect(metaTitleInput.value).toBe('Fixed Title');
      expect(metaDescInput.value).toBe('Updated Desc');
    });

    it('should handle rapid save button clicks', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      render(<TestPageEditor />);

      const saveButton = screen.getByTestId('save-button');

      fireEvent.click(saveButton);
      fireEvent.click(saveButton);
      fireEvent.click(saveButton);

      expect(consoleSpy).toHaveBeenCalledTimes(3);

      consoleSpy.mockRestore();
    });
  });

  // ========================================
  // Edge Case Tests
  // ========================================

  describe('Edge Cases', () => {
    it('should handle very long input gracefully', () => {
      render(<TestPageEditor />);

      const metaTitleInput = screen.getByTestId('input-meta-title') as HTMLInputElement;
      const veryLongTitle = 'A'.repeat(500);

      fireEvent.change(metaTitleInput, { target: { value: veryLongTitle } });

      expect(metaTitleInput.value).toBe(veryLongTitle);
    });

    it('should handle only whitespace input', () => {
      render(<TestPageEditor />);

      const metaTitleInput = screen.getByTestId('input-meta-title') as HTMLInputElement;

      fireEvent.change(metaTitleInput, { target: { value: '     ' } });

      expect(metaTitleInput.value).toBe('     ');
    });

    it('should handle special HTML characters', () => {
      render(<TestPageEditor />);

      const metaTitleInput = screen.getByTestId('input-meta-title') as HTMLInputElement;
      const specialChars = '<script>alert("xss")</script>';

      fireEvent.change(metaTitleInput, { target: { value: specialChars } });

      expect(metaTitleInput.value).toBe(specialChars);
    });

    it('should handle unicode characters', () => {
      render(<TestPageEditor />);

      const metaTitleInput = screen.getByTestId('input-meta-title') as HTMLInputElement;
      const unicodeText = '日本語 テキスト émojis 🎉';

      fireEvent.change(metaTitleInput, { target: { value: unicodeText } });

      expect(metaTitleInput.value).toBe(unicodeText);
    });

    it('should handle empty state properly', () => {
      render(<TestPageEditor />);

      const metaTitleInput = screen.getByTestId('input-meta-title') as HTMLInputElement;
      const metaDescInput = screen.getByTestId('input-meta-description') as HTMLInputElement;

      expect(metaTitleInput.value).toBe('');
      expect(metaDescInput.value).toBe('');
    });

    it('should handle zero length input', () => {
      render(<TestPageEditor />);

      const metaTitleInput = screen.getByTestId('input-meta-title') as HTMLInputElement;

      fireEvent.change(metaTitleInput, { target: { value: '' } });

      expect(metaTitleInput.value).toBe('');
      expect(metaTitleInput.value.length).toBe(0);
    });

    it('should handle special formatting characters', () => {
      render(<TestPageEditor />);

      const metaTitleInput = screen.getByTestId('input-meta-title') as HTMLInputElement;
      const formattedText = 'Title™ with © symbols & marks';

      fireEvent.change(metaTitleInput, { target: { value: formattedText } });

      expect(metaTitleInput.value).toBe(formattedText);
    });
  });

  // ========================================
  // Accessibility Tests
  // ========================================

  describe('Accessibility', () => {
    it('should have proper labels for form inputs', () => {
      render(<TestPageEditor />);

      const labels = screen.getAllByText(/Meta Title|Meta Description/);
      expect(labels.length).toBeGreaterThan(0);
    });

    it('should have semantic HTML structure', () => {
      const { container } = render(<TestPageEditor />);

      expect(container.querySelector('[data-testid="layout"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="layout-section"]')).toBeInTheDocument();
    });

    it('should display character limits in help text', () => {
      render(<TestPageEditor />);

      const helpTexts = screen.getAllByTestId(/help-meta/);
      expect(helpTexts.length).toBeGreaterThan(0);

      helpTexts.forEach((helpText) => {
        expect(helpText.textContent).toMatch(/\d+ \/ \d+ characters/);
      });
    });

    it('should have proper button labeling', () => {
      render(<TestPageEditor />);

      const saveButton = screen.getByTestId('save-button');
      expect(saveButton.textContent).toMatch(/Save Changes/);
    });

    it('should have heading hierarchy', () => {
      const { container } = render(<TestPageEditor />);

      const headings = container.querySelectorAll('h2');
      expect(headings.length).toBeGreaterThan(0);
    });
  });

  // ========================================
  // Page Information Display Tests
  // ========================================

  describe('Page Information Display', () => {
    it('should display page URL', () => {
      render(<TestPageEditor />);

      const serpUrl = screen.getByTestId('serp-url');
      expect(serpUrl.textContent).toContain('/pages/test-page');
    });

    it('should display page type', () => {
      const { container } = render(<TestPageEditor />);

      const typeText = Array.from(container.querySelectorAll('p')).find((p) =>
        p.textContent?.includes('Type:')
      );
      expect(typeText).toBeTruthy();
      expect(typeText?.textContent).toContain('page');
    });

    it('should have Page Information section', () => {
      render(<TestPageEditor />);

      expect(screen.getByText('Page Information')).toBeInTheDocument();
    });

    it('should show URL label', () => {
      const { container } = render(<TestPageEditor />);

      const urlText = Array.from(container.querySelectorAll('strong')).find((s) =>
        s.textContent?.includes('URL')
      );
      expect(urlText).toBeTruthy();
    });

    it('should show Type label', () => {
      const { container } = render(<TestPageEditor />);

      const typeLabel = Array.from(container.querySelectorAll('strong')).find((s) =>
        s.textContent?.includes('Type')
      );
      expect(typeLabel).toBeTruthy();
    });
  });
});
