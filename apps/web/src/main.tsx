import { ClerkProvider } from '@clerk/clerk-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { ConsoleAnalyticsProvider } from '@leanlog/ui';
import './index.css';
import App from './App';
import { StateProvider } from './state';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');
}

function RootLayout() {
  const navigate = useNavigate();

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
    >
      <StateProvider>
        <ConsoleAnalyticsProvider enabled={import.meta.env.DEV}>
          <App />
        </ConsoleAnalyticsProvider>
      </StateProvider>
    </ClerkProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <RootLayout />
    </BrowserRouter>
  </StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
