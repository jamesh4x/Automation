export type FileKind = 'recording' | 'photo' | 'document' | 'template';

interface KindRule {
  label: string;
  maxBytes: number;
  types: Record<string, string>;
}

const MB = 1024 * 1024;

export const FILE_RULES: Record<FileKind, KindRule> = {
  recording: {
    label: 'Rekaman audio/video',
    maxBytes: 500 * MB,
    types: {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      m4a: 'audio/mp4',
      aac: 'audio/aac',
      ogg: 'audio/ogg',
      flac: 'audio/flac',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      webm: 'video/webm',
    },
  },
  photo: {
    label: 'Foto dokumentasi',
    maxBytes: 25 * MB,
    types: { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' },
  },
  document: {
    label: 'Dokumen supplier',
    maxBytes: 50 * MB,
    types: {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  },
  template: {
    label: 'Template laporan',
    maxBytes: 50 * MB,
    types: {
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      pdf: 'application/pdf',
    },
  },
};

export const formatBytes = (bytes: number) => {
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

export const acceptAttribute = (kind: FileKind) =>
  Object.keys(FILE_RULES[kind].types)
    .map((ext) => `.${ext}`)
    .join(',');

export type FileCheck = { ok: true; mimeType: string } | { ok: false; reason: string };

export function checkFile(kind: FileKind, file: File): FileCheck {
  const rule = FILE_RULES[kind];
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const mimeType = rule.types[ext];
  if (!mimeType) {
    return { ok: false, reason: `Format .${ext || '?'} tidak didukung untuk ${rule.label.toLowerCase()}.` };
  }
  if (file.size <= 0) {
    return { ok: false, reason: `Berkas ${file.name} kosong.` };
  }
  if (file.size > rule.maxBytes) {
    return { ok: false, reason: `Ukuran ${file.name} melebihi batas ${formatBytes(rule.maxBytes)}.` };
  }
  return { ok: true, mimeType };
}

export const toSafeFileName = (name: string) => name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(-120);
