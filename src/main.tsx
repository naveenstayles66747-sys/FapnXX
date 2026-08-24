import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './i18n/LanguageContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Safe mobile gesture prevention without blocking touch responsiveness
if (typeof window !== 'undefined') {
  try {
    document.addEventListener('gesturestart', (e) => {
      try { e.preventDefault(); } catch {}
    }, { passive: false });
    document.addEventListener('gesturechange', (e) => {
      try { e.preventDefault(); } catch {}
    }, { passive: false });
    document.addEventListener('gestureend', (e) => {
      try { e.preventDefault(); } catch {}
    }, { passive: false });
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

