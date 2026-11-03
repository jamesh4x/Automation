import { useEffect, useState } from 'react';
import { Mic, Check } from 'lucide-react';
import { useLoader } from '../hooks/useLoader';
import { fetchLatestTranscript, saveTranscript, transcribeRecording } from '../lib/groqService';

interface TranscriptPanelProps {
  surveyId: string;
  recordingIds: string[];
}

export default function TranscriptPanel({ surveyId, recordingIds }: TranscriptPanelProps) {
  const { data: transcript, loading, error, reload } = useLoader(() => fetchLatestTranscript(surveyId));
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setDraft(transcript?.text ?? '');
  }, [transcript]);

  const run = async (task: () => Promise<void>, successMessage: string) => {
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      await task();
      setNotice(successMessage);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Permintaan gagal. Silakan coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-[13px] text-[var(--muted)]">Memuat transkrip…</p>;

  if (error) {
    return (
      <div role="alert" className="flex items-center justify-between gap-4 rounded-xl bg-[var(--danger-soft)] p-4">
        <p className="text-[13px] text-[var(--danger)]">{error}</p>
        <button className="btn-secondary" onClick={reload}>Coba lagi</button>
      </div>
    );
  }

  const hasChanges = draft.trim() !== (transcript?.text ?? '').trim();

  return (
    <div className="space-y-4">
      {!transcript && (
        <div className="space-y-3">
          <p className="text-[13px] text-[var(--muted)]">
            Belum ada transkrip. Transkripsi menggunakan model Whisper dan dapat memuat percakapan Indonesia, Mandarin, atau campuran keduanya.
          </p>
          <div className="flex flex-wrap gap-2">
            {recordingIds.map((fileId, index) => (
              <button
                key={fileId}
                className="btn-primary"
                disabled={busy}
                onClick={() => run(() => transcribeRecording(surveyId, fileId), 'Transkripsi selesai. Tinjau teksnya di bawah.')}
              >
                <Mic size={15} />
                {busy ? 'Memproses…' : `Transkripsi rekaman ${index + 1}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {transcript && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] font-medium text-[var(--muted)]">
              {transcript.reviewed ? 'Sudah ditinjau manusia' : 'Hasil otomatis Whisper, belum ditinjau'}
            </p>
            {recordingIds.length > 1 && (
              <p className="text-[12px] text-[var(--subtle)]">Transkrip terbaru yang ditampilkan</p>
            )}
          </div>
          <textarea
            aria-label="Teks transkrip"
            className="input-field min-h-[160px] resize-y leading-relaxed"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={busy}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] text-[var(--subtle)]">Periksa nama perusahaan, produk, angka, harga, dan MOQ sebelum membuat laporan.</p>
            <button
              className="btn-primary"
              disabled={busy || !hasChanges || draft.trim() === ''}
              onClick={() => run(() => saveTranscript(surveyId, draft), 'Koreksi transkrip disimpan.')}
            >
              {busy ? 'Menyimpan…' : 'Simpan koreksi'}
            </button>
          </div>
        </div>
      )}

      {actionError && (
        <p role="alert" className="text-[13px] text-[var(--danger)]">{actionError}</p>
      )}
      {notice && !actionError && (
        <p className="flex items-center gap-2 text-[13px] text-[var(--success)]">
          <Check size={14} /> {notice}
        </p>
      )}
    </div>
  );
}
