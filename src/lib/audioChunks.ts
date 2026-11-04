const MB = 1024 * 1024;
const MAX_CHUNK_BYTES = 24 * MB;

const writeString = (view: DataView, offset: number, value: string) => {
  for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
};

function encodeWav(audio: AudioBuffer, startFrame: number, frameCount: number): ArrayBuffer {
  const channelCount = audio.numberOfChannels;
  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + frameCount * blockAlign);
  const view = new DataView(buffer);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + frameCount * blockAlign, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, audio.sampleRate, true);
  view.setUint32(28, audio.sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, frameCount * blockAlign, true);

  let offset = 44;
  for (let frame = startFrame; frame < startFrame + frameCount; frame++) {
    for (let channel = 0; channel < channelCount; channel++) {
      const sample = Math.max(-1, Math.min(1, audio.getChannelData(channel)[frame]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return buffer;
}

export async function splitAudioForUpload(file: File): Promise<File[]> {
  if (file.size <= MAX_CHUNK_BYTES) return [file];
  if (!file.type.startsWith('audio/')) {
    throw new Error(`${file.name} lebih besar dari 24 MB dan bukan file audio yang dapat dipecah otomatis. Gunakan audio MP3/WAV/M4A atau kompres file ini terlebih dahulu.`);
  }
  const AudioContextConstructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) throw new Error('Browser ini tidak mendukung pemecahan audio otomatis.');

  const context = new AudioContextConstructor();
  try {
    const audio = await context.decodeAudioData(await file.arrayBuffer());
    const bytesPerFrame = audio.numberOfChannels * 2;
    const framesPerChunk = Math.max(1, Math.floor((MAX_CHUNK_BYTES - 44) / bytesPerFrame));
    const chunks: File[] = [];
    for (let start = 0, part = 1; start < audio.length; start += framesPerChunk, part++) {
      const frameCount = Math.min(framesPerChunk, audio.length - start);
      const wav = encodeWav(audio, start, frameCount);
      const padded = String(part).padStart(3, '0');
      chunks.push(new File([wav], `${file.name.replace(/\.[^.]+$/, '')}.part-${padded}.wav`, { type: 'audio/wav' }));
    }
    return chunks;
  } catch {
    throw new Error(`${file.name} tidak dapat dipecah otomatis. Gunakan file MP3, WAV, atau M4A yang dapat diputar browser.`);
  } finally {
    await context.close();
  }
}
