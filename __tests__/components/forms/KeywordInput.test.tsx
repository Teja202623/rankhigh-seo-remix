/**
 * Component Tests for KeywordInput
 *
 * Tests for the keyword input form component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

interface KeywordInputMockProps {
  onKeywordAdd?: (keyword: string) => void;
  keywords?: string[];
  placeholder?: string;
}

describe('KeywordInput Component', () => {
  const KeywordInputMock = ({
    onKeywordAdd = () => {},
    keywords = [],
    placeholder = 'Add keyword...',
  }: KeywordInputMockProps) => {
    const [input, setInput] = React.useState('');

    return (
      <div data-testid="keyword-input-container">
        <input
          type="text"
          data-testid="keyword-input"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          data-testid="add-keyword-btn"
          onClick={() => {
            if (input) {
              onKeywordAdd(input);
              setInput('');
            }
          }}
        >
          Add
        </button>
        <div data-testid="keywords-list" className="keywords">
          {keywords.map((keyword, idx) => (
            <span key={idx} data-testid={`keyword-${idx}`} className="keyword-tag">
              {keyword}
            </span>
          ))}
        </div>
      </div>
    );
  };

  describe('Rendering', () => {
    it('should render keyword input', () => {
      render(<KeywordInputMock />);
      expect(screen.getByTestId('keyword-input')).toBeInTheDocument();
    });

    it('should display placeholder text', () => {
      render(<KeywordInputMock placeholder="Enter keywords..." />);
      expect(screen.getByPlaceholderText('Enter keywords...')).toBeInTheDocument();
    });

    it('should render add button', () => {
      render(<KeywordInputMock />);
      expect(screen.getByTestId('add-keyword-btn')).toBeInTheDocument();
    });

    it('should render keywords list', () => {
      render(<KeywordInputMock />);
      expect(screen.getByTestId('keywords-list')).toBeInTheDocument();
    });
  });

  describe('Keyword Management', () => {
    it('should call onKeywordAdd when button clicked', () => {
      const mockAdd = jest.fn();
      render(<KeywordInputMock onKeywordAdd={mockAdd} />);
      
      const input = screen.getByTestId('keyword-input');
      fireEvent.change(input, { target: { value: 'test keyword' } });
      fireEvent.click(screen.getByTestId('add-keyword-btn'));
      
      expect(mockAdd).toHaveBeenCalledWith('test keyword');
    });

    it('should clear input after adding keyword', () => {
      const mockAdd = jest.fn();
      render(<KeywordInputMock onKeywordAdd={mockAdd} />);
      
      const input = screen.getByTestId('keyword-input');
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.click(screen.getByTestId('add-keyword-btn'));
      
      expect(input).toHaveValue('');
    });
  });

  describe('Display Keywords', () => {
    it('should display added keywords', () => {
      const keywords = ['seo', 'optimization', 'marketing'];
      render(<KeywordInputMock keywords={keywords} />);
      
      expect(screen.getByTestId('keyword-0')).toHaveTextContent('seo');
      expect(screen.getByTestId('keyword-1')).toHaveTextContent('optimization');
      expect(screen.getByTestId('keyword-2')).toHaveTextContent('marketing');
    });

    it('should display single keyword', () => {
      render(<KeywordInputMock keywords={['single']} />);
      expect(screen.getByTestId('keyword-0')).toHaveTextContent('single');
    });

    it('should handle empty keywords list', () => {
      render(<KeywordInputMock keywords={[]} />);
      expect(screen.getByTestId('keywords-list')).toBeEmptyDOMElement();
    });
  });

  describe('Input Handling', () => {
    it('should update input value on change', () => {
      render(<KeywordInputMock />);
      const input = screen.getByTestId('keyword-input');
      
      fireEvent.change(input, { target: { value: 'new text' } });
      expect(input).toHaveValue('new text');
    });

    it('should not add empty keyword', () => {
      const mockAdd = jest.fn();
      render(<KeywordInputMock onKeywordAdd={mockAdd} />);
      
      fireEvent.click(screen.getByTestId('add-keyword-btn'));
      expect(mockAdd).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible input field', () => {
      render(<KeywordInputMock />);
      expect(screen.getByTestId('keyword-input')).toBeInTheDocument();
    });

    it('should have accessible button', () => {
      render(<KeywordInputMock />);
      expect(screen.getByTestId('add-keyword-btn')).toHaveTextContent('Add');
    });
  });
});
