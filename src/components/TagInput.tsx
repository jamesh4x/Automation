import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  ariaLabel: string;
}

export default function TagInput({ value, onChange, suggestions = [], placeholder, ariaLabel }: TagInputProps) {
  const [draft, setDraft] = useState('');

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    if (value.some((v) => v.toLowerCase() === tag.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...value, tag]);
    setDraft('');
  };

  const removeTag = (tag: string) => onChange(value.filter((v) => v !== tag));

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const unusedSuggestions = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()));

  return (
    <div>
      <div className="input-field flex min-h-[44px] flex-wrap items-center gap-2 py-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--graphite-100)] py-1 pl-3 pr-1.5 text-[12px] font-medium text-[var(--ink-soft)]"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Hapus ${tag}`}
              className="flex h-4 w-4 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-black/10 hover:text-[var(--ink)]"
            >
              <X size={11} strokeWidth={2.5} />
            </button>
          </span>
        ))}
        <input
          aria-label={ariaLabel}
          className="min-w-[160px] flex-1 border-0 bg-transparent p-1 text-[14px] outline-none placeholder:text-[var(--subtle)]"
          placeholder={value.length === 0 ? placeholder : 'Tambah lagi…'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => addTag(draft)}
        />
      </div>
      {unusedSuggestions.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {unusedSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="rounded-full border border-dashed border-[var(--line-strong)] px-2.5 py-1 text-[12px] text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
