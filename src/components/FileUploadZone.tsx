import { useRef, useState, type DragEvent } from 'react';
import { Check, FileText, Image as ImageIcon, Mic, Upload, X } from 'lucide-react';
import { acceptAttribute, checkFile, formatBytes, FILE_RULES, type FileKind } from '@/lib/fileRules';

interface FileUploadZoneProps {
  kind: FileKind;
  files: File[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  hint: string;
}

const kindIcon: Record<FileKind, typeof Mic> = {
  recording: Mic,
  photo: ImageIcon,
  document: FileText,
  template: FileText,
};

export default function FileUploadZone({ kind, files, onAdd, onRemove, hint }: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const Icon = kindIcon[kind];

  const handleFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const accepted: File[] = [];
    const problems: string[] = [];
    Array.from(list).forEach((file) => {
      const check = checkFile(kind, file);
      if (check.ok) accepted.push(file);
      else problems.push(check.reason);
    });
    setErrors(problems);
    if (accepted.length > 0) onAdd(accepted);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`group flex w-full flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-8 text-center transition-all duration-300 ${
          dragging
            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
            : 'border-[var(--line-strong)] bg-[var(--surface-muted)] hover:border-[var(--graphite-400)] hover:bg-white'
        }`}
      >
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[var(--line)] transition-transform duration-300 group-hover:-translate-y-0.5">
          <Upload size={18} className="text-[var(--ink-soft)]" />
        </div>
        <p className="text-[14px] font-medium">Seret berkas ke sini, atau klik untuk memilih</p>
        <p className="mt-1 text-[12px] text-[var(--muted)]">{hint}</p>
        <p className="mt-2 text-[11px] text-[var(--subtle)]">
          Maks. {formatBytes(FILE_RULES[kind].maxBytes)} per berkas
        </p>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={acceptAttribute(kind)}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {errors.length > 0 && (
        <ul className="mt-3 space-y-1" role="alert">
          {errors.map((msg) => (
            <li key={msg} className="text-[12px] text-[var(--danger)]">
              {msg}
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="mt-4 divide-y divide-[var(--line)] overflow-hidden rounded-2xl border border-[var(--line)]">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex items-center gap-3 bg-white px-4 py-3 animate-fade-in">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{file.name}</p>
                <p className="text-[12px] text-[var(--muted)]">{formatBytes(file.size)}</p>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-medium text-[#1a7a32]" title="Berkas siap diunggah">
                <Check size={14} strokeWidth={2.5} /> Siap
              </span>
              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label={`Hapus ${file.name}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--graphite-100)] hover:text-[var(--ink)]"
              >
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
