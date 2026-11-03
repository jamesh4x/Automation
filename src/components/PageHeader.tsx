import type { ReactNode } from 'react';
import { translate, useLanguage } from '../lib/i18n';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export default function PageHeader({ eyebrow, title, subtitle, action }: PageHeaderProps) {
  const language = useLanguage();
  return (
    <header className="animate-fade-in-up mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-[32px] font-semibold tracking-[-0.02em] text-[var(--ink)]">{translate(title, language)}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[15px] text-[var(--muted)]">{translate(subtitle, language)}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
