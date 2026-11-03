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
      className="sticky top-0 flex h-screen shrink-0 flex-col transition-[width] duration-300 ease-out"
      style={{ background: 'var(--graphite-900)', width: collapsed ? 72 : 252 }}
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
            <p className="truncate text-[14px] font-semibold text-white">Supplier Survey</p>
            <p className="truncate text-[11px] text-[var(--graphite-400)]">Reporting System</p>
          </div>
        )}
      </div>

      <nav className="scrollbar-dark flex-1 overflow-y-auto px-3 pb-4">
        {navSections.map((section) => (
          <div key={section.title} className="mb-4">
            {!collapsed && (
              <p className="px-3 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--graphite-400)]">
                {section.title}
              </p>
            )}
            {collapsed && <div className="mx-auto my-2 h-px w-6 bg-white/10" />}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  className="group relative mb-0.5 flex h-10 w-full items-center rounded-xl text-[13px] font-medium transition-colors duration-200"
                  style={{
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: collapsed ? 0 : 12,
                    padding: collapsed ? 0 : '0 12px',
                    background: isActive ? 'var(--graphite-600)' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--graphite-200)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'var(--graphite-700)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {isActive && (
                    <span className="absolute left-0 top-2.5 h-5 w-[3px] rounded-r-full bg-[#4d86ff]" />
                  )}
                  <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} className="shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.07] p-3">
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          className="flex h-10 w-full items-center rounded-xl text-[var(--graphite-200)] transition-colors hover:bg-white/[0.06]"
          style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? 0 : '0 12px', gap: 12 }}
        >
          {collapsed ? <PanelLeftOpen size={18} strokeWidth={1.8} /> : <PanelLeftClose size={18} strokeWidth={1.8} />}
          {!collapsed && <span className="text-[13px]">Ciutkan</span>}
        </button>
      </div>
    </aside>
  );
}
