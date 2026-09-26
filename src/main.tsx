import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './i18n/LanguageContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';
import { initRippleEffect } from './utils/ripple.ts';
import { initScrollReveal } from './utils/scrollReveal.ts';

// Initialize global micro-animations (Ripple click effect & Scroll Reveal)
if (typeof window !== 'undefined') {
  try {
    initRippleEffect();
    initScrollReveal();
    document.addEventListener('gesturestart', () => {}, { passive: true });
    document.addEventListener('gesturechange', () => {}, { passive: true });
    document.addEventListener('gestureend', () => {}, { passive: true });
  } catch {}
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}

