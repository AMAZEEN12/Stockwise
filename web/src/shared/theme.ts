import { useSyncExternalStore } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
const key = 'stockwise.theme';
const listeners = new Set<() => void>();
let preference: ThemePreference = 'system';
let initialized = false;
let media: MediaQueryList | undefined;

function parse(value: string | null): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}
function apply() {
  const theme = preference === 'system' ? (media?.matches ? 'dark' : 'light') : preference;
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b0b0a' : '#f6f7f2');
  listeners.forEach((listener) => listener());
}
export function initializeTheme() {
  if (initialized) return;
  initialized = true;
  try { preference = parse(localStorage.getItem(key)); } catch { /* Keep system default. */ }
  media = window.matchMedia?.('(prefers-color-scheme: dark)');
  media?.addEventListener('change', () => { if (preference === 'system') apply(); });
  window.addEventListener('storage', (event) => {
    if (event.key === key || event.key === null) {
      preference = parse(event.newValue);
      apply();
    }
  });
  apply();
}
export function setThemePreference(next: ThemePreference) {
  preference = next;
  try { localStorage.setItem(key, next); } catch { /* Keep the choice for this session. */ }
  apply();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function useThemePreference() {
  return useSyncExternalStore(subscribe, () => preference, () => 'system' as ThemePreference);
}
