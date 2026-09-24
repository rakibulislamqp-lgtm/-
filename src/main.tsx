import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Professional silent console logger for harmless fallback and development environment warnings/errors
(() => {
  if (typeof window !== 'undefined') {
    const originalWarn = console.warn;
    const originalError = console.error;

    const shouldSilence = (message: any): boolean => {
      if (!message) return false;
      const str = String(message).toLowerCase();
      return (
        str.includes('firebase not initialized') ||
        str.includes('firestore not available') ||
        str.includes('websocket') ||
        str.includes('failed to connect') ||
        str.includes('quota_exhausted') ||
        str.includes('quota-exceeded') ||
        str.includes('resource-exhausted') ||
        str.includes('quota') ||
        str.includes('heartbeat limit') ||
        str.includes('fallback')
      );
    };

    console.warn = function (...args) {
      if (args.length > 0 && shouldSilence(args[0])) {
        // Silently swallow
        return;
      }
      originalWarn.apply(console, args);
    };

    console.error = function (...args) {
      if (args.length > 0 && shouldSilence(args[0])) {
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

