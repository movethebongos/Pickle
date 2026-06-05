export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'pickle-theme';

export function getStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

export function getSystemTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function persistTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore quota / private mode
  }
  applyTheme(theme);
}

export function initTheme() {
  applyTheme(resolveTheme());
}
