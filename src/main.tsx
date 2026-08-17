import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './i18n/LanguageContext.tsx';
import './index.css';

// Safe mobile gesture prevention without blocking touch responsiveness
if (typeof window !== 'undefined') {
  document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: true });
  document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: true });
  document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);
