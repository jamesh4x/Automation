import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import NewSurvey from './pages/NewSurvey';
import SurveyHistory from './pages/SurveyHistory';
import SupplierDatabase from './pages/SupplierDatabase';
import SupplierMap from './pages/SupplierMap';
import ReportManagement from './pages/ReportManagement';
import Settings from './pages/Settings';
import type { PageId } from './types';
import { applyLanguage, applyTheme, getLanguage, getTheme } from './lib/preferences';
import { translate, useLanguage } from './lib/i18n';

const pageTitles: Record<PageId, string> = {
  dashboard: 'Dashboard',
  'new-survey': 'New Survey',
  'survey-history': 'Survey History',
  'supplier-database': 'Supplier Database',
  'supplier-map': 'Supplier Map',
  'report-management': 'Report Management',
  settings: 'Settings',
};

export default function App() {
  const [page, setPage] = useState<PageId>('dashboard');
  const language = useLanguage();

  useEffect(() => {
    applyTheme(getTheme());
    applyLanguage(getLanguage());
  }, []);

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard onNavigate={setPage} />;
      case 'new-survey':
        return <NewSurvey />;
      case 'survey-history':
        return <SurveyHistory />;
      case 'supplier-database':
        return <SupplierDatabase />;
      case 'supplier-map':
        return <SupplierMap />;
      case 'report-management':
        return <ReportManagement />;
      case 'settings':
        return <Settings />;
    }
  };

  return (
    <div className="isolate relative flex min-h-screen bg-[var(--canvas)]">
      <div aria-hidden="true" className="ambient-canvas pointer-events-none fixed inset-0 -z-10" />
      <Sidebar active={page} onNavigate={setPage} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass-chrome sticky top-3 z-10 mx-3 mt-3 flex h-16 items-center justify-between rounded-2xl px-6 sm:mx-6 sm:px-8">
          <nav className="flex min-w-0 items-center gap-2 text-[13px]" aria-label="Breadcrumb">
            <span className="truncate text-[var(--muted)]">{translate('Supplier Survey Reporting', language)}</span>
            <span className="text-[var(--subtle)]">/</span>
            <span className="truncate font-medium text-[var(--ink)]">{translate(pageTitles[page], language)}</span>
          </nav>
          <div className="flex items-center gap-3 rounded-full border border-white/80 bg-white/70 py-1 pl-1 pr-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--graphite-800)] text-[11px] font-semibold text-white">
              AP
            </div>
            <span className="hidden text-[13px] font-medium sm:inline">Andi Pratama</span>
          </div>
        </header>

        <main className="scrollbar-thin flex-1 overflow-x-hidden px-6 py-10 sm:px-10">
          <div key={page} className="animate-fade-in">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}
