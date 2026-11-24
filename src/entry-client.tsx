/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installAuthFetch } from './utils/authToken';

declare global {
  interface Window {
    __INITIAL_DATA__?: any;
  }
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'Unexpected application error.' };
  }

  componentDidCatch(error: Error) {
    const msg = String(error?.message || '');
    const isChunkError =
      /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk/i.test(msg);
    if (isChunkError && typeof window !== 'undefined') {
      try {
        const key = 'agency_chunk_reload_ts';
        const lastReload = Number(sessionStorage.getItem(key) || '0');
        if (Date.now() - lastReload > 10_000) {
          sessionStorage.setItem(key, String(Date.now()));
          window.location.reload();
          return;
        }
      } catch {}
    }
    console.error('[App ErrorBoundary]', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans text-slate-900">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center space-y-4">
            <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              The page encountered an unexpected error while rendering. Reloading usually resolves this.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

installAuthFetch();

if (typeof window !== 'undefined') {
  window.alert = (message?: any) => {
    window.dispatchEvent(new CustomEvent('app:notify', { detail: String(message ?? '') }));
  };

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    try {
      const key = 'agency_chunk_reload_ts';
      const lastReload = Number(sessionStorage.getItem(key) || '0');
      if (Date.now() - lastReload > 10_000) {
        sessionStorage.setItem(key, String(Date.now()));
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  });
}

const initialData = typeof window !== 'undefined' ? window.__INITIAL_DATA__ : undefined;
let rawPath = typeof window !== 'undefined' ? (window.location.pathname + window.location.search) : '/';
if (rawPath.startsWith('/index.html')) {
  rawPath = rawPath.replace('/index.html', '/') || '/';
}
const initialPath = rawPath;
const rootElement = document.getElementById('root')!;

const appTree = (
  <RootErrorBoundary>
    <App initialPath={initialPath} initialData={initialData} />
  </RootErrorBoundary>
);

if (rootElement.hasChildNodes() && initialData) {
  try {
    hydrateRoot(rootElement, appTree, {
      onRecoverableError(err) {
        console.warn('[Hydration notice]', err);
      }
    });
  } catch (err) {
    console.warn('[Hydration fallback to client render]', err);
    createRoot(rootElement).render(appTree);
  }
} else {
  createRoot(rootElement).render(appTree);
}
