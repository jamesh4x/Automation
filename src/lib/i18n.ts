import { useSyncExternalStore } from 'react';
import { getLanguage, type AppLanguage } from './preferences';

const translations: Record<string, Record<AppLanguage, string>> = {
  Overview: { id: 'Overview', en: 'Overview', zh: '概览' },
  Survey: { id: 'Survey', en: 'Survey', zh: '调查' },
  Supplier: { id: 'Supplier', en: 'Supplier', zh: '供应商' },
  Reports: { id: 'Reports', en: 'Reports', zh: '报告' },
  System: { id: 'System', en: 'System', zh: '系统' },
  Dashboard: { id: 'Dashboard', en: 'Dashboard', zh: '仪表板' },
  'New Survey': { id: 'New Survey', en: 'New Survey', zh: '新调查' },
  'Survey History': { id: 'Survey History', en: 'Survey History', zh: '调查记录' },
  'Supplier Database': { id: 'Supplier Database', en: 'Supplier Database', zh: '供应商数据库' },
  'Supplier Map': { id: 'Supplier Map', en: 'Supplier Map', zh: '供应商地图' },
  'Report Management': { id: 'Report Management', en: 'Report Management', zh: '报告管理' },
  Settings: { id: 'Settings', en: 'Settings', zh: '设置' },
  'Supplier Survey Reporting': { id: 'Supplier Survey Reporting', en: 'Supplier Survey Reporting', zh: '供应商调查报告系统' },
};

const EVENT = 'ssrs-language-change';
const subscribe = (onStoreChange: () => void) => {
  window.addEventListener(EVENT, onStoreChange);
  return () => window.removeEventListener(EVENT, onStoreChange);
};
const snapshot = () => getLanguage();

export function useLanguage(): AppLanguage {
  return useSyncExternalStore(subscribe, snapshot, () => 'id');
}

export function translate(text: string, language: AppLanguage = getLanguage()): string {
  return translations[text]?.[language] ?? text;
}

export function notifyLanguageChanged() {
  window.dispatchEvent(new Event(EVENT));
}
