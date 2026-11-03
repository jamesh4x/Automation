import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import NewSurvey from './pages/NewSurvey';
import SurveyHistory from './pages/SurveyHistory';
import SupplierDatabase from './pages/SupplierDatabase';
import SupplierMap from './pages/SupplierMap';
import ReportManagement from './pages/ReportManagement';
import Settings from './pages/Settings';
import type { PageId } from './types';

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
    <div className="flex min-h-screen bg-[var(--canvas)]">
      <Sidebar active={page} onNavigate={setPage} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-[var(--line)] bg-[var(--canvas)]/85 px-6 backdrop-blur-xl sm:px-10">
          <nav className="flex min-w-0 items-center gap-2 text-[13px]" aria-label="Breadcrumb">
            <span className="truncate text-[var(--muted)]">Supplier Survey Reporting</span>
            <span className="text-[var(--subtle)]">/</span>
            <span className="truncate font-medium text-[var(--ink)]">{pageTitles[page]}</span>
          </nav>
          <div className="flex items-center gap-3 rounded-full border border-[var(--line)] bg-[var(--surface)] py-1 pl-1 pr-4">
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
