// Redefine window.fetch with a configurable getter and setter to prevent "only a getter" exceptions
// if the sandboxed preview environment, mock runners, or browser extensions attempt to reassign fetch.
try {
  if (typeof window !== 'undefined' && 'fetch' in window) {
    const originalFetch = window.fetch;
    let currentFetch = originalFetch;
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      enumerable: true,
      get() {
        return currentFetch;
      },
      set(newFetch) {
        currentFetch = newFetch;
      }
    });
  }
} catch (e) {
  console.warn('Failed to define custom window.fetch getter/setter:', e);
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
