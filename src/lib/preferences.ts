export type ThemeMode = 'light' | 'dark';
export type AppLanguage = 'id' | 'en' | 'zh';

const THEME_KEY = 'ssrs-theme';
const LANGUAGE_KEY = 'ssrs-language';

export function getTheme(): ThemeMode {
  return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
}

export function getLanguage(): AppLanguage {
  const saved = localStorage.getItem(LANGUAGE_KEY);
  return saved === 'en' || saved === 'zh' ? saved : 'id';
}

export function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
}

export function applyLanguage(language: AppLanguage) {
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : language === 'en' ? 'en' : 'id';
}

export function saveTheme(theme: ThemeMode) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

export function saveLanguage(language: AppLanguage) {
  localStorage.setItem(LANGUAGE_KEY, language);
  applyLanguage(language);
}
