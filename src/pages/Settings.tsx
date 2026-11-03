import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { User, Bell, Globe, Shield, Sparkles, Check, CircleAlert, Loader2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Reveal from '../components/Reveal';
import { testGroqConnection, type GroqStatus } from '../lib/groqService';
import { getLanguage, getTheme, saveLanguage, saveTheme, type AppLanguage, type ThemeMode } from '../lib/preferences';
import { notifyLanguageChanged } from '../lib/i18n';

type GroqCheck =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'ok'; status: GroqStatus }
  | { state: 'error'; message: string };

export default function Settings() {
  const [notif, setNotif] = useState(true);
  const [autoReport, setAutoReport] = useState(false);
  const [bilingualDefault, setBilingualDefault] = useState(true);
  const [groq, setGroq] = useState<GroqCheck>({ state: 'idle' });
  const [theme, setTheme] = useState<ThemeMode>(getTheme);
  const [language, setLanguage] = useState<AppLanguage>(getLanguage);

  const handleTestGroq = async () => {
    setGroq({ state: 'loading' });
    try {
      const status = await testGroqConnection();
      setGroq({ state: 'ok', status });
    } catch (err) {
      setGroq({ state: 'error', message: err instanceof Error ? err.message : 'Uji koneksi gagal. Silakan coba lagi.' });
    }
  };

  return (
    <div className="pb-12 max-w-3xl">
      <PageHeader title="Settings" subtitle="Pengaturan aplikasi, preferensi laporan, dan notifikasi" />

      <div className="space-y-5">
        <Reveal>
          <Section title="Koneksi AI (Groq)" icon={Sparkles}>
            <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
              Memeriksa apakah layanan transkripsi suara dan penyusunan laporan AI dapat dihubungi dari server.
            </p>
            <div>
              <button type="button" className="btn-primary" onClick={handleTestGroq} disabled={groq.state === 'loading'}>
                {groq.state === 'loading' && <Loader2 size={15} className="animate-spin" />}
                {groq.state === 'loading' ? 'Menguji koneksi…' : 'Uji koneksi'}
              </button>
            </div>
            {groq.state === 'ok' && (
              <div role="status" className="rounded-xl p-4 text-[13px] space-y-1" style={{ background: 'var(--success-soft)' }}>
                <p className="flex items-center gap-2 font-medium" style={{ color: 'var(--success)' }}>
                  <Check size={14} /> Koneksi ke Groq berhasil
                </p>
                <p style={{ color: 'var(--muted)' }}>
                  Transkripsi ({groq.status.whisper_model}): {groq.status.whisper_available ? 'tersedia' : 'tidak tersedia'}
                </p>
                <p style={{ color: 'var(--muted)' }}>
                  Penyusunan laporan ({groq.status.chat_model}): {groq.status.chat_available ? 'tersedia' : 'tidak tersedia'}
                </p>
              </div>
            )}
            {groq.state === 'error' && (
              <div role="alert" className="flex items-start gap-2 rounded-xl p-4 text-[13px]" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                <CircleAlert size={14} className="mt-0.5 shrink-0" />
                <p>Koneksi ke Groq gagal: {groq.message}</p>
              </div>
            )}
          </Section>
        </Reveal>

        <Reveal delay={80}>
          <Section title="Profil" icon={User}>
            <Field label="Nama Tim Purchasing">
              <input className="input-field" defaultValue="Tim Purchasing — Supplier Survey" />
            </Field>
            <Field label="Email Penanggung Jawab">
              <input className="input-field" type="email" defaultValue="purchasing@company.co.id" />
            </Field>
          </Section>
        </Reveal>

        <Reveal delay={140}>
          <Section title="Tampilan & Bahasa" icon={Globe}>
            <Field label="Tema aplikasi">
              <select className="input-field" value={theme} onChange={(event) => { const value = event.target.value as ThemeMode; setTheme(value); saveTheme(value); }}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </Field>
            <Field label="Bahasa aplikasi">
              <select className="input-field" value={language} onChange={(event) => { const value = event.target.value as AppLanguage; setLanguage(value); saveLanguage(value); notifyLanguageChanged(); }}>
                <option value="id">Bahasa Indonesia</option>
                <option value="en">English</option>
                <option value="zh">中文（简体）</option>
              </select>
            </Field>
          </Section>
        </Reveal>

        <Reveal delay={200}>
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

        <Reveal delay={260}>
          <Section title="Notifikasi" icon={Bell}>
            <Toggle
              label="Notifikasi email"
              hint="Terima email saat ada survei atau laporan baru"
              checked={notif}
              onChange={setNotif}
            />
          </Section>
        </Reveal>

        <Reveal delay={320}>
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
      </div>
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
