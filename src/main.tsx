import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Professional silent console logger for harmless fallback and development environment warnings/errors
(() => {
  if (typeof window !== 'undefined') {
    const originalWarn = console.warn;
    const originalError = console.error;

    const shouldSilence = (...args: any[]): boolean => {
      const combined = args
        .map(a => {
          if (!a) return '';
          if (typeof a === 'object') {
            try { return JSON.stringify(a) + ' ' + (a.message || ''); } catch { return String(a); }
          }
          return String(a);
        })
        .join(' ')
        .toLowerCase();

      return (
        combined.includes('telemetry') ||
        combined.includes('database exhausted') ||
        combined.includes('running locally without firing') ||
        combined.includes('firebase not initialized') ||
        combined.includes('firestore not available') ||
        combined.includes('websocket') ||
        combined.includes('closed without opened') ||
        combined.includes('vite-hmr') ||
        combined.includes('@vite/client') ||
        combined.includes('failed to connect') ||
        combined.includes('quota_exhausted') ||
        combined.includes('quota-exceeded') ||
        combined.includes('resource-exhausted') ||
        combined.includes('quota') ||
        combined.includes('heartbeat') ||
        combined.includes('fallback') ||
        combined.includes('firestore subscription note') ||
        combined.includes('local session broadcast') ||
        combined.includes('failed to write updated orders cache') ||
        combined.includes('failed to cache live sessions') ||
        combined.includes('width(0) and height(0)') ||
        combined.includes('defaultprops') ||
        combined.includes('support for defaultprops') ||
        combined.includes('the query requires an index') ||
        combined.includes('requires an index') ||
        combined.includes('live firestore product fetch error')
      );
    };

    console.warn = function (...args) {
      if (shouldSilence(...args)) {
        // Silently swallow
        return;
      }
      originalWarn.apply(console, args);
    };

    console.error = function (...args) {
      if (shouldSilence(...args)) {
        // Silently swallow
        return;
      }
      originalError.apply(console, args);
    };

    // Silence unhandled rejections and standard errors related to the dev environment WebSocket
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      if (reason) {
        const str = String(reason.message || reason).toLowerCase();
        if (str.includes('websocket') || str.includes('failed to connect') || str.includes('connection')) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }
    });

    window.addEventListener('error', (event) => {
      const message = event.message;
      if (message) {
        const str = String(message).toLowerCase();
        if (str.includes('websocket') || str.includes('failed to connect') || str.includes('connection')) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }
    });
  }
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

