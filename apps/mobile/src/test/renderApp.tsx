import { renderRouter } from 'expo-router/testing-library';

// Render the real app directory at a route (the AGENTS.md `renderApp` pattern).
export function renderApp(route = '/') {
  return renderRouter('./app', { initialUrl: route });
}
