export type ThemeMode = 'light' | 'dark';
export type AppLanguage = 'id' | 'zh';

const THEME_KEY = 'ssrs-theme';
const LANGUAGE_KEY = 'ssrs-language';

export function getTheme(): ThemeMode {
  return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
}

export function getLanguage(): AppLanguage {
  return localStorage.getItem(LANGUAGE_KEY) === 'zh' ? 'zh' : 'id';
}

export function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
}

export function applyLanguage(language: AppLanguage) {
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'id';
}

export function saveTheme(theme: ThemeMode) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

export function saveLanguage(language: AppLanguage) {
  localStorage.setItem(LANGUAGE_KEY, language);
  applyLanguage(language);
}
