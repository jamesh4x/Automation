import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  FilePlus2,
  History,
  Database,
  FileText,
  MapPinned,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
  type LucideIcon,
} from 'lucide-react';
import type { PageId } from '../types';
import { translate, useLanguage } from '../lib/i18n';

interface SidebarProps {
  active: PageId;
  onNavigate: (page: PageId) => void;
}

interface NavItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Survey',
    items: [
      { id: 'new-survey', label: 'New Survey', icon: FilePlus2 },
      { id: 'survey-history', label: 'Survey History', icon: History },
    ],
  },
  {
    title: 'Supplier',
    items: [
      { id: 'supplier-database', label: 'Supplier Database', icon: Database },
      { id: 'supplier-map', label: 'Supplier Map', icon: MapPinned },
    ],
  },
  {
    title: 'Reports',
    items: [{ id: 'report-management', label: 'Report Management', icon: FileText }],
  },
  {
    title: 'System',
    items: [{ id: 'settings', label: 'Settings', icon: Settings }],
  },
];

const COLLAPSE_BREAKPOINT = 1024;

export default function Sidebar({ active, onNavigate }: SidebarProps) {
  const language = useLanguage();
  const [collapsed, setCollapsed] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < COLLAPSE_BREAKPOINT : false
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${COLLAPSE_BREAKPOINT - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setCollapsed(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <aside
      className="glass-chrome sticky top-3 ml-3 mb-3 mt-3 flex h-[calc(100vh-24px)] shrink-0 flex-col self-start overflow-hidden rounded-[28px] transition-[width] duration-300 ease-out"
      style={{ width: collapsed ? 72 : 252 }}
    >
      <div className="flex items-center gap-3 px-5" style={{ height: 72 }}>
        <div
          className="flex shrink-0 items-center justify-center rounded-xl"
          style={{ width: 36, height: 36, background: 'var(--accent)' }}
        >
          <Layers size={18} className="text-white" strokeWidth={2} />
        </div>
        {!collapsed && (
          <div className="min-w-0 animate-fade-in">
            <p className="truncate text-[14px] font-semibold text-[var(--ink)]">Supplier Survey</p>
            <p className="truncate text-[11px] text-[var(--muted)]">Reporting System</p>
          </div>
        )}
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-4">
        {navSections.map((section) => (
          <div key={section.title} className="mb-4">
            {!collapsed && (
              <p className="px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--subtle)]">
                {translate(section.title, language)}
              </p>
            )}
            {collapsed && <div className="mx-auto my-2 h-px w-6 bg-[var(--line)]" />}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group relative mb-0.5 flex min-h-[44px] w-full items-center rounded-xl text-[13px] font-medium transition-colors duration-200 ${
                    isActive
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'text-[var(--ink-soft)] hover:bg-[var(--surface-muted)]'
                  }`}
                  style={{
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: collapsed ? 0 : 12,
                    padding: collapsed ? 0 : '0 12px',
                  }}
                >
                  {isActive && (
                    <span className="absolute left-0 top-2.5 h-5 w-[3px] rounded-r-full bg-[var(--accent)]" />
                  )}
                  <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} className="shrink-0" />
                  {!collapsed && <span className="truncate">{translate(item.label, language)}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--line)] p-3">
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          className="flex min-h-[44px] w-full items-center rounded-xl text-[var(--muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
          style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? 0 : '0 12px', gap: 12 }}
        >
          {collapsed ? <PanelLeftOpen size={18} strokeWidth={1.8} /> : <PanelLeftClose size={18} strokeWidth={1.8} />}
          {!collapsed && <span className="text-[13px]">Ciutkan</span>}
        </button>
      </div>
    </aside>
  );
}
