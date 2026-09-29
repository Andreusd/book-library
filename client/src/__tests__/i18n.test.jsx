import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { I18nProvider, useI18n } from '../i18n';

const TestConsumer = ({ translationKey = 'appTitle', params = {}, onReady }) => {
  const i18n = useI18n();
  React.useEffect(() => {
    if (onReady) onReady(i18n);
  }, [i18n, onReady]);

  return (
    <div>
      <span data-testid="translated">{i18n.t(translationKey, params)}</span>
      <span data-testid="current-lang">{i18n.lang}</span>
      <button onClick={() => i18n.setLang('pt')}>To Portuguese</button>
    </div>
  );
};

describe('i18n', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders default English translation', () => {
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>
    );

    expect(screen.getByTestId('translated').textContent).toBe('Digital Library');
    expect(screen.getByTestId('current-lang').textContent).toBe('en');
  });

  it('interpolates parameters correctly', () => {
    render(
      <I18nProvider>
        <TestConsumer
          translationKey="shelfCount"
          params={{ books: 42, folders: 7 }}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('translated').textContent).toBe('42 books • 7 folders');
  });

  it('switches language and persists to localStorage', () => {
    render(
      <I18nProvider>
        <TestConsumer translationKey="appTitle" />
      </I18nProvider>
    );

    act(() => {
      screen.getByText('To Portuguese').click();
    });

    expect(screen.getByTestId('current-lang').textContent).toBe('pt');
    expect(screen.getByTestId('translated').textContent).toBe('Biblioteca Digital');
    expect(localStorage.getItem('book_library_lang')).toBe('pt');
  });

  it('returns key itself when key does not exist', () => {
    render(
      <I18nProvider>
        <TestConsumer translationKey="nonexistent_secret_key" />
      </I18nProvider>
    );

    expect(screen.getByTestId('translated').textContent).toBe('nonexistent_secret_key');
  });

  it('throws error when useI18n is used outside I18nProvider', () => {
    // Suppress console.error during expected throw
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => render(<TestConsumer />)).toThrow(
      'useI18n must be used within an I18nProvider'
    );

    console.error = originalError;
  });
});
