import { useEffect, useState, type FormEvent } from 'react';
import { Building2, Calendar, Check, CircleAlert, Mic, Camera, FileText, FileStack, MapPin, Phone, Plus, Target, Users, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Reveal from '../components/Reveal';
import TagInput from '../components/TagInput';
import FileUploadZone from '../components/FileUploadZone';
import { listSuppliers, saveSurvey, type NewSurveyInput } from '../lib/surveyRepository';
import type { FileKind } from '../lib/fileRules';
import type { TeamMember } from '../types';

const CATEGORY_SUGGESTIONS = [
  'Food Ingredients',
  'Chemical Raw Materials',
  'Chemical Products',
  'Metal Components',
  'Electronic Components',
  'Plastic Products',
  'Packaging Materials',
  'Logistics Services',
  'Manufacturing Services',
  'General Services',
];

const OBJECTIVE_SUGGESTIONS = [
  'Company Profile Assessment',
  'Production Capacity Assessment',
  'Product Quality Evaluation',
  'Price Negotiation',
  'Supplier Qualification',
  'Factory Inspection',
  'Logistics Assessment',
  'Potential Cooperation Evaluation',
];

const SURVEY_TYPE_OPTIONS = ['Kunjungan Pabrik', 'Pra-Kontrak', 'Audit Kualitas', 'Survei Ulang', 'Kunjungan Kantor'];

type FileState = Record<FileKind, File[]>;

const emptyFiles: FileState = { recording: [], photo: [], document: [], template: [] };

const emptyTeamMember = (): TeamMember & { id: string } => ({ id: crypto.randomUUID(), name: '', role: '' });

export default function NewSurvey() {
  const [supplierName, setSupplierName] = useState('');
  const [surveyDate, setSurveyDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState('');
  const [productName, setProductName] = useState('');
  const [surveyType, setSurveyType] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [contactPerson, setContactPerson] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [team, setTeam] = useState<(TeamMember & { id: string })[]>([emptyTeamMember()]);
  const [objectives, setObjectives] = useState<string[]>([]);
  const [fieldNotes, setFieldNotes] = useState('');
  const [files, setFiles] = useState<FileState>(emptyFiles);
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>(CATEGORY_SUGGESTIONS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    listSuppliers()
      .then((rows) => {
        if (!active) return;
        const known = rows.flatMap((r) => r.categories);
        setCategorySuggestions(Array.from(new Set([...known, ...CATEGORY_SUGGESTIONS])));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const addFiles = (kind: FileKind) => (added: File[]) =>
    setFiles((prev) => ({ ...prev, [kind]: [...prev[kind], ...added] }));

  const removeFile = (kind: FileKind) => (index: number) =>
    setFiles((prev) => ({ ...prev, [kind]: prev[kind].filter((_, i) => i !== index) }));

  const updateMember = (id: string, patch: Partial<TeamMember>) =>
    setTeam((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  const resetForm = () => {
    setSupplierName('');
    setSurveyDate(new Date().toISOString().slice(0, 10));
    setLocation('');
    setProductName('');
    setSurveyType('');
    setCategories([]);
    setContactPerson('');
    setContactInfo('');
    setTeam([emptyTeamMember()]);
    setObjectives([]);
    setFieldNotes('');
    setFiles(emptyFiles);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!supplierName.trim()) return setError('Nama supplier wajib diisi.');
    if (!surveyDate) return setError('Tanggal survei wajib diisi.');

    const input: NewSurveyInput = {
      supplierName,
      surveyDate,
      location,
      productName,
      surveyType,
      categories,
      contactPerson,
      contactInfo,
      objectives,
      fieldNotes,
      team: team.filter((m) => m.name.trim()).map(({ name, role }) => ({ name, role: role ?? '' })),
      files: (Object.keys(files) as FileKind[]).flatMap((kind) => files[kind].map((file) => ({ kind, file }))),
    };

    setSubmitting(true);
    try {
      await saveSurvey(input);
      resetForm();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Survei belum dapat disimpan. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalFiles = files.recording.length + files.photo.length + files.document.length + files.template.length;

  return (
    <div className="max-w-4xl pb-16">
      <PageHeader
        eyebrow="Survei Baru"
        title="New Survey"
        subtitle="Catat kunjungan supplier dan unggah bahan survei. Laporan dibuat dari bahan ini."
      />

      {saved && (
        <div className="animate-fade-in mb-6 flex items-center gap-3 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--success)]">
            <Check size={14} className="text-white" />
          </div>
          <p className="text-[14px] font-medium text-[var(--success)]">Survei dan bahan pendukung berhasil disimpan.</p>
        </div>
      )}

      {error && (
        <div role="alert" className="animate-fade-in mb-6 flex items-start gap-3 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4">
          <CircleAlert size={18} className="mt-0.5 shrink-0 text-[var(--danger)]" />
          <p className="text-[14px] font-medium text-[var(--danger)]">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <Reveal>
          <Section step="01" title="Informasi Dasar" icon={Building2}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label="Nama Supplier" required>
                <input className="input-field" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Contoh: PT Sentosa Jaya Abadi" />
              </Field>
              <Field label="Tanggal Survei" icon={Calendar} required>
                <input type="date" className="input-field" value={surveyDate} onChange={(e) => setSurveyDate(e.target.value)} />
              </Field>
              <Field label="Lokasi Perusahaan" icon={MapPin}>
                <input className="input-field" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Contoh: Cikarang, Jawa Barat" />
              </Field>
              <Field label="Nama Produk / Layanan">
                <input className="input-field" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Contoh: Kemasan PET 500 ml" />
              </Field>
              <Field label="Jenis Survei">
                <input className="input-field" list="survey-type-options" value={surveyType} onChange={(e) => setSurveyType(e.target.value)} placeholder="Pilih atau ketik sendiri" />
                <datalist id="survey-type-options">
                  {SURVEY_TYPE_OPTIONS.map((o) => (
                    <option key={o} value={o} />
                  ))}
                </datalist>
              </Field>
              <Field label="Kontak Person">
                <input className="input-field" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Nama PIC di supplier" />
              </Field>
              <Field label="Informasi Kontak" icon={Phone}>
                <input className="input-field" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} placeholder="Nomor telepon atau email" />
              </Field>
              <div className="md:col-span-2">
                <Field label="Kategori Produk / Layanan">
                  <TagInput
                    ariaLabel="Kategori produk atau layanan"
                    value={categories}
                    onChange={setCategories}
                    suggestions={categorySuggestions}
                    placeholder="Ketik kategori, lalu tekan Enter"
                  />
                </Field>
              </div>
            </div>
          </Section>
        </Reveal>

        <Reveal delay={60}>
          <Section step="02" title="Tim Survei" icon={Users}>
            <div className="space-y-3">
              {team.map((member, index) => (
                <div key={member.id} className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <input
                    className="input-field"
                    aria-label={`Nama anggota ${index + 1}`}
                    placeholder="Nama anggota tim"
                    value={member.name}
                    onChange={(e) => updateMember(member.id, { name: e.target.value })}
                  />
                  <input
                    className="input-field"
                    aria-label={`Jabatan anggota ${index + 1}`}
                    placeholder="Jabatan atau tanggung jawab"
                    value={member.role ?? ''}
                    onChange={(e) => updateMember(member.id, { role: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setTeam((prev) => prev.filter((m) => m.id !== member.id))}
                    disabled={team.length === 1}
                    aria-label={`Hapus anggota ${index + 1}`}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--graphite-100)] hover:text-[var(--ink)] disabled:opacity-30"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setTeam((prev) => [...prev, emptyTeamMember()])}
              className="mt-4 inline-flex items-center gap-2 text-[13px] font-medium text-[var(--accent)] hover:underline"
            >
              <Plus size={15} /> Tambah anggota tim
            </button>
          </Section>
        </Reveal>

        <Reveal delay={100}>
          <Section step="03" title="Tujuan & Catatan Lapangan" icon={Target}>
            <Field label="Tujuan Kunjungan">
              <TagInput
                ariaLabel="Tujuan kunjungan"
                value={objectives}
                onChange={setObjectives}
                suggestions={OBJECTIVE_SUGGESTIONS}
                placeholder="Pilih rekomendasi atau tulis tujuan sendiri"
              />
            </Field>
            <div className="mt-5">
              <Field label="Catatan Lapangan">
                <textarea
                  className="input-field min-h-[120px] resize-y"
                  value={fieldNotes}
                  onChange={(e) => setFieldNotes(e.target.value)}
                  placeholder="Temuan awal, kondisi fasilitas, hal yang perlu ditindaklanjuti…"
                />
              </Field>
            </div>
          </Section>
        </Reveal>

        <Reveal delay={140}>
          <Section step="04" title="Bahan Survei" icon={FileStack}>
            <div className="space-y-8">
              <UploadBlock title="Rekaman Percakapan" icon={Mic} description="Rekaman audio atau video pembicaraan dengan supplier. Mendukung rekaman campuran Indonesia dan Mandarin.">
                <FileUploadZone kind="recording" files={files.recording} onAdd={addFiles('recording')} onRemove={removeFile('recording')} hint="MP3, WAV, M4A, MP4, dan format audio/video lain" />
              </UploadBlock>
              <UploadBlock title="Foto Dokumentasi" icon={Camera} description="Gedung, area produksi, mesin, gudang, produk, laboratorium, dan sertifikat.">
                <FileUploadZone kind="photo" files={files.photo} onAdd={addFiles('photo')} onRemove={removeFile('photo')} hint="JPG, PNG, atau WEBP. Banyak foto dapat dipilih sekaligus" />
              </UploadBlock>
              <UploadBlock title="Dokumen Supplier" icon={FileText} description="Company profile, katalog, daftar harga, quotation, spesifikasi, sertifikat, dan dokumen legalitas.">
                <FileUploadZone kind="document" files={files.document} onAdd={addFiles('document')} onRemove={removeFile('document')} hint="PDF, DOCX, atau XLSX" />
              </UploadBlock>
              <UploadBlock title="Template Laporan Referensi" icon={FileText} description="Contoh laporan survei Purchasing yang menjadi acuan struktur dan format laporan.">
                <FileUploadZone kind="template" files={files.template} onAdd={addFiles('template')} onRemove={removeFile('template')} hint="DOCX atau PDF" />
              </UploadBlock>
            </div>
          </Section>
        </Reveal>

        <Reveal delay={180}>
          <div className="glass-chrome sticky bottom-6 flex items-center justify-between gap-4 rounded-2xl px-5 py-4">
            <p className="text-[13px] text-[var(--muted)]">
              {totalFiles > 0 ? `${totalFiles} berkas siap diunggah` : 'Belum ada berkas dipilih'}
            </p>
            <div className="flex items-center gap-3">
              <button type="button" className="btn-secondary" onClick={resetForm} disabled={submitting}>
                Kosongkan
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Menyimpan…' : 'Simpan Survei'}
              </button>
            </div>
          </div>
        </Reveal>
      </form>
    </div>
  );
}

function Section({ step, title, icon: Icon, children }: { step: string; title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <section className="glass-card p-7">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--graphite-800)] text-white">
          <Icon size={16} strokeWidth={2} />
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--subtle)]">{step}</p>
          <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, icon: Icon, required, children }: { label: string; icon?: LucideIcon; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-[var(--ink-soft)]">
        {Icon && <Icon size={14} className="text-[var(--muted)]" />}
        {label}
        {required && <span className="text-[var(--accent)]">*</span>}
      </label>
      {children}
    </div>
  );
}

function UploadBlock({ title, description, icon: Icon, children }: { title: string; description: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-start gap-3">
        <Icon size={16} className="mt-0.5 text-[var(--muted)]" />
        <div>
          <h3 className="text-[14px] font-semibold">{title}</h3>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
