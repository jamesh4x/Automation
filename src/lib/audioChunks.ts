import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const MB = 1024 * 1024;
const MAX_CHUNK_BYTES = 24 * MB;
const SEGMENT_SECONDS = 900;

let ffmpegPromise: Promise<FFmpeg> | null = null;

async function getFfmpeg(): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const ffmpeg = new FFmpeg();
      const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      return ffmpeg;
    })();
  }
  return ffmpegPromise;
}

export async function splitAudioForUpload(file: File): Promise<File[]> {
  if (file.size <= MAX_CHUNK_BYTES) return [file];

  const ffmpeg = await getFfmpeg();
  const inputName = `input-${crypto.randomUUID()}.${file.name.split('.').pop()?.toLowerCase() || 'bin'}`;
  const outputPattern = `chunk-${crypto.randomUUID()}-%03d.ogg`;
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  try {
    await ffmpeg.exec([
      '-i', inputName,
      '-map', '0:a:0',
      '-vn',
      '-ac', '1',
      '-c:a', 'libopus',
      '-b:a', '128k',
      '-f', 'segment',
      '-segment_time', String(SEGMENT_SECONDS),
      '-reset_timestamps', '1',
      outputPattern,
    ]);

    const files: File[] = [];
    for (let part = 0; ; part++) {
      const outputName = outputPattern.replace('%03d', String(part).padStart(3, '0'));
      let data: Uint8Array | string;
      try {
        data = await ffmpeg.readFile(outputName);
      } catch {
        break;
      }
      if (typeof data === 'string') break;
      const chunk = new File([data], `${file.name.replace(/\.[^.]+$/, '')}.part-${String(part + 1).padStart(3, '0')}.ogg`, { type: 'audio/ogg' });
      if (chunk.size > 25 * MB) throw new Error(`${file.name} menghasilkan potongan di atas batas Groq.`);
      files.push(chunk);
      await ffmpeg.deleteFile(outputName);
    }

    if (files.length === 0) throw new Error('FFmpeg tidak menghasilkan potongan audio yang dapat diproses.');
    return files;
  } finally {
    await ffmpeg.deleteFile(inputName);
  }
}
