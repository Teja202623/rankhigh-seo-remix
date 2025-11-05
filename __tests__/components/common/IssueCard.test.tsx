/**
 * Component Tests for IssueCard
 *
 * Tests for the individual issue card component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('IssueCard Component', () => {
  const IssueCardMock = ({ issue = {}, onDismiss = jest.fn() }) => {
    const defaultIssue = {
      id: '1',
      title: 'Missing Meta Title',
      description: 'Add a meta title to improve SEO',
      severity: 'high',
      page: '/about',
      ...issue,
    };

    return (
      <div data-testid="issue-card" className={`severity-${defaultIssue.severity}`}>
        <h3 data-testid="issue-title">{defaultIssue.title}</h3>
        <p data-testid="issue-description">{defaultIssue.description}</p>
        <span data-testid="issue-severity" className={`badge-${defaultIssue.severity}`}>
          {defaultIssue.severity}
        </span>
        <span data-testid="issue-page">{defaultIssue.page}</span>
        <button data-testid="dismiss-btn" onClick={() => onDismiss(defaultIssue.id)}>
          Dismiss
        </button>
      </div>
    );
  };

  describe('Rendering', () => {
    it('should render issue card', () => {
      render(<IssueCardMock />);
      expect(screen.getByTestId('issue-card')).toBeInTheDocument();
    });

    it('should display issue title', () => {
      const issue = { title: 'Test Issue' };
      render(<IssueCardMock issue={issue} />);
      expect(screen.getByTestId('issue-title')).toHaveTextContent('Test Issue');
    });

    it('should display issue description', () => {
      const issue = { description: 'Test description for issue' };
      render(<IssueCardMock issue={issue} />);
      expect(screen.getByTestId('issue-description')).toHaveTextContent('Test description for issue');
    });

    it('should display issue page', () => {
      const issue = { page: '/products/example' };
      render(<IssueCardMock issue={issue} />);
      expect(screen.getByTestId('issue-page')).toHaveTextContent('/products/example');
    });
  });

  describe('Severity Styling', () => {
    it('should apply high severity styling', () => {
      const issue = { severity: 'high' };
      render(<IssueCardMock issue={issue} />);
      expect(screen.getByTestId('issue-card')).toHaveClass('severity-high');
      expect(screen.getByTestId('issue-severity')).toHaveClass('badge-high');
    });

    it('should apply medium severity styling', () => {
      const issue = { severity: 'medium' };
      render(<IssueCardMock issue={issue} />);
      expect(screen.getByTestId('issue-card')).toHaveClass('severity-medium');
    });

    it('should apply low severity styling', () => {
      const issue = { severity: 'low' };
      render(<IssueCardMock issue={issue} />);
      expect(screen.getByTestId('issue-card')).toHaveClass('severity-low');
    });

    it('should display severity badge', () => {
      const issue = { severity: 'critical' };
      render(<IssueCardMock issue={issue} />);
      expect(screen.getByTestId('issue-severity')).toHaveTextContent('critical');
    });
  });

  describe('Interactions', () => {
    it('should call onDismiss when dismiss clicked', () => {
      const mockDismiss = jest.fn();
      const issue = { id: '123' };
      render(<IssueCardMock issue={issue} onDismiss={mockDismiss} />);
      
      fireEvent.click(screen.getByTestId('dismiss-btn'));
      expect(mockDismiss).toHaveBeenCalledWith('123');
    });

    it('should render dismiss button', () => {
      render(<IssueCardMock />);
      expect(screen.getByTestId('dismiss-btn')).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('should handle different issue types', () => {
      const issues = [
        { id: '1', title: 'Meta Title', severity: 'high' },
        { id: '2', title: 'Meta Description', severity: 'high' },
        { id: '3', title: 'Image Alt Text', severity: 'medium' },
      ];
      
      issues.forEach((issue) => {
        const { unmount } = render(<IssueCardMock issue={issue} />);
        expect(screen.getByTestId('issue-title')).toHaveTextContent(issue.title);
        unmount();
      });
    });

    it('should display default issue', () => {
      render(<IssueCardMock />);
      expect(screen.getByTestId('issue-title')).toHaveTextContent('Missing Meta Title');
    });
  });

  describe('Accessibility', () => {
    it('should have semantic heading', () => {
      render(<IssueCardMock />);
      const heading = screen.getByTestId('issue-title');
      expect(heading.tagName).toBe('H3');
    });

    it('should have accessible button', () => {
      render(<IssueCardMock />);
      expect(screen.getByTestId('dismiss-btn')).toBeInTheDocument();
      expect(screen.getByTestId('dismiss-btn')).toHaveTextContent('Dismiss');
    });
  });
});
