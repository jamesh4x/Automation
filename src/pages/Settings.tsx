import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { User, Bell, Globe, Shield, Mic, Check } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Reveal from '../components/Reveal';

export default function Settings() {
  const [notif, setNotif] = useState(true);
  const [autoReport, setAutoReport] = useState(false);
  const [bilingualDefault, setBilingualDefault] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="pb-12 max-w-3xl">
      <PageHeader title="Settings" subtitle="Pengaturan aplikasi, preferensi laporan, dan notifikasi" />

      {saved && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-2xl animate-fade-in" style={{ background: '#34c75914', border: '1px solid #34c75933' }}>
          <div className="flex items-center justify-center rounded-full" style={{ width: 24, height: 24, background: '#34c759' }}>
            <Check size={16} className="text-white" />
          </div>
          <p className="text-[14px] font-medium" style={{ color: '#1a7a32' }}>Pengaturan tersimpan.</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <Reveal>
          <Section title="Profil" icon={User}>
            <Field label="Nama Tim Purchasing">
              <input className="input-field" defaultValue="Tim Purchasing — Supplier Survey" />
            </Field>
            <Field label="Email Penanggung Jawab">
              <input className="input-field" type="email" defaultValue="purchasing@company.co.id" />
            </Field>
          </Section>
        </Reveal>

        <Reveal delay={80}>
          <Section title="Preferensi Laporan" icon={Globe}>
            <Toggle
              label="Laporan bilingual sebagai default"
              hint="Gunakan format Indonesia–Mandarin secara default untuk setiap laporan baru"
              checked={bilingualDefault}
              onChange={setBilingualDefault}
            />
            <Toggle
              label="Hasilkan laporan otomatis setelah survei selesai"
              hint="Laporan dibuat secara otomatis saat status survei berubah menjadi selesai"
              checked={autoReport}
              onChange={setAutoReport}
            />
            <Field label="Bahasa Rekaman Default">
              <select className="input-field">
                <option>Indonesia & Mandarin</option>
                <option>Indonesia</option>
                <option>Mandarin</option>
              </select>
            </Field>
          </Section>
        </Reveal>

        <Reveal delay={160}>
          <Section title="Notifikasi" icon={Bell}>
            <Toggle
              label="Notifikasi email"
              hint="Terima email saat ada survei atau laporan baru"
              checked={notif}
              onChange={setNotif}
            />
          </Section>
        </Reveal>

        <Reveal delay={220}>
          <Section title="Keamanan" icon={Shield}>
            <Field label="Frekuensi Ubah Password">
              <select className="input-field">
                <option>Setiap 90 hari</option>
                <option>Setiap 180 hari</option>
                <option>Jangan ingatkan</option>
              </select>
            </Field>
          </Section>
        </Reveal>

        <Reveal delay={280}>
          <div className="flex justify-end pt-2">
            <button type="submit" className="btn-primary flex items-center gap-2">
              <Check size={16} />
              Simpan Pengaturan
            </button>
          </div>
        </Reveal>
      </form>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <Icon size={18} strokeWidth={2} style={{ color: 'var(--accent)' }} />
        <h2 className="text-[16px] font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--muted)' }}>{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="text-[14px] font-medium">{label}</p>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--muted)' }}>{hint}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="relative rounded-full transition-all duration-300 shrink-0"
        style={{
          width: 44,
          height: 26,
          background: checked ? 'var(--accent)' : '#d2d2d7',
        }}
      >
        <span
          className="absolute top-0.5 rounded-full bg-white transition-all duration-300"
          style={{
            width: 22,
            height: 22,
            left: checked ? 20 : 2,
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      </button>
    </div>
  );
}
