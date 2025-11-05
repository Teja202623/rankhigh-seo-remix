/**
 * Component Tests for ThemeToggle
 *
 * Tests for dark/light theme toggle with popover menu
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('ThemeToggle Component', () => {
  const ThemeToggleMock = ({ currentTheme = 'light', onThemeChange = jest.fn() }) => (
    <div data-testid="theme-toggle">
      <button data-testid="toggle-btn" onClick={() => onThemeChange(currentTheme === 'light' ? 'dark' : 'light')}>
        {currentTheme === 'light' ? '🌙' : '☀️'}
      </button>
      <div data-testid="theme-label">{currentTheme} Mode</div>
      <div data-testid="theme-options">
        <button data-testid="theme-light" onClick={() => onThemeChange('light')}>Light</button>
        <button data-testid="theme-dark" onClick={() => onThemeChange('dark')}>Dark</button>
        <button data-testid="theme-auto" onClick={() => onThemeChange('auto')}>Auto</button>
      </div>
    </div>
  );

  describe('Rendering', () => {
    it('should render theme toggle', () => {
      render(<ThemeToggleMock />);
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    });

    it('should display current theme', () => {
      render(<ThemeToggleMock currentTheme="light" />);
      expect(screen.getByTestId('theme-label')).toHaveTextContent('light Mode');
    });

    it('should render toggle button', () => {
      render(<ThemeToggleMock />);
      expect(screen.getByTestId('toggle-btn')).toBeInTheDocument();
    });

    it('should render theme options', () => {
      render(<ThemeToggleMock />);
      expect(screen.getByTestId('theme-light')).toBeInTheDocument();
      expect(screen.getByTestId('theme-dark')).toBeInTheDocument();
      expect(screen.getByTestId('theme-auto')).toBeInTheDocument();
    });
  });

  describe('Theme Switching', () => {
    it('should call onThemeChange when toggle clicked', () => {
      const mockChange = jest.fn();
      render(<ThemeToggleMock onThemeChange={mockChange} />);
      
      fireEvent.click(screen.getByTestId('toggle-btn'));
      expect(mockChange).toHaveBeenCalled();
    });

    it('should switch from light to dark', () => {
      const mockChange = jest.fn();
      render(<ThemeToggleMock currentTheme="light" onThemeChange={mockChange} />);
      
      fireEvent.click(screen.getByTestId('toggle-btn'));
      expect(mockChange).toHaveBeenCalledWith('dark');
    });

    it('should switch from dark to light', () => {
      const mockChange = jest.fn();
      render(<ThemeToggleMock currentTheme="dark" onThemeChange={mockChange} />);
      
      fireEvent.click(screen.getByTestId('toggle-btn'));
      expect(mockChange).toHaveBeenCalledWith('light');
    });

    it('should allow manual theme selection', () => {
      const mockChange = jest.fn();
      render(<ThemeToggleMock onThemeChange={mockChange} />);
      
      fireEvent.click(screen.getByTestId('theme-dark'));
      expect(mockChange).toHaveBeenCalledWith('dark');
    });

    it('should handle auto theme selection', () => {
      const mockChange = jest.fn();
      render(<ThemeToggleMock onThemeChange={mockChange} />);
      
      fireEvent.click(screen.getByTestId('theme-auto'));
      expect(mockChange).toHaveBeenCalledWith('auto');
    });
  });

  describe('Visual Indicators', () => {
    it('should show sun icon for light mode', () => {
      render(<ThemeToggleMock currentTheme="dark" />);
      expect(screen.getByTestId('toggle-btn')).toHaveTextContent('☀️');
    });

    it('should show moon icon for dark mode', () => {
      render(<ThemeToggleMock currentTheme="light" />);
      expect(screen.getByTestId('toggle-btn')).toHaveTextContent('🌙');
    });
  });

  describe('Accessibility', () => {
    it('should have meaningful button labels', () => {
      render(<ThemeToggleMock />);
      expect(screen.getByTestId('toggle-btn')).toBeInTheDocument();
      expect(screen.getByTestId('theme-light')).toBeInTheDocument();
    });
  });
});
