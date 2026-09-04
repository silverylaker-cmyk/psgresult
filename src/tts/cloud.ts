import type { SceneId, SceneSpec } from '../psg/types';
import { serverBase, synthesizeOnServer, type ServerInfo } from './api';

/**
 * 고품질 음성(클라우드 TTS) 을 얻는 두 가지 경로.
 *
 *  1) 브라우저 → Google Cloud Text-to-Speech 직접 호출 (서버 불필요)
 *     - 빌드 시 VITE_GOOGLE_TTS_KEY 를 넣거나, 화면의 설정에서 키를 입력하면 이 브라우저(localStorage)에 저장된다.
 *     - 키는 반드시 Google Cloud 콘솔에서 "HTTP 리퍼러(웹사이트)" 로 이 사이트 주소만 허용하고,
 *       API 제한을 "Cloud Text-to-Speech API" 로 걸어 둔다. 공개 사이트의 JS 에 들어가는 키이기 때문이다.
 *  2) 서버(server/index.mjs) 의 /api/tts — 키를 서버에만 두고 싶을 때. MP4 저장도 이 경로가 필요하다.
 */

export type CloudSource = { kind: 'google-browser'; key: string } | { kind: 'server'; provider: string } | null;

const LS_KEY = 'psg.googleTtsKey';
const LS_VOICE = 'psg.googleTtsVoice';

export const GOOGLE_VOICES: Array<{ id: string; label: string }> = [
  { id: 'ko-KR-Chirp3-HD-Aoede', label: 'Chirp 3 HD · Aoede (여성, 가장 자연스러움)' },
  { id: 'ko-KR-Chirp3-HD-Kore', label: 'Chirp 3 HD · Kore (여성)' },
  { id: 'ko-KR-Chirp3-HD-Leda', label: 'Chirp 3 HD · Leda (여성)' },
  { id: 'ko-KR-Chirp3-HD-Charon', label: 'Chirp 3 HD · Charon (남성)' },
  { id: 'ko-KR-Chirp3-HD-Puck', label: 'Chirp 3 HD · Puck (남성)' },
  { id: 'ko-KR-Neural2-A', label: 'Neural2 · A (여성, 저렴)' },
  { id: 'ko-KR-Neural2-C', label: 'Neural2 · C (남성, 저렴)' },
  { id: 'ko-KR-Wavenet-A', label: 'WaveNet · A (여성)' },
];
export const DEFAULT_GOOGLE_VOICE = GOOGLE_VOICES[0].id;

export function getGoogleKey(): string {
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) return stored;
  } catch {
    /* localStorage 를 못 쓰는 환경 */
  }
  return (import.meta.env.VITE_GOOGLE_TTS_KEY as string | undefined) ?? '';
}
export function setGoogleKey(key: string) {
  try {
    if (key) localStorage.setItem(LS_KEY, key);
    else localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}
export function getGoogleVoice(): string {
  try {
    return localStorage.getItem(LS_VOICE) || (import.meta.env.VITE_GOOGLE_TTS_VOICE as string | undefined) || DEFAULT_GOOGLE_VOICE;
  } catch {
    return DEFAULT_GOOGLE_VOICE;
  }
}
export function setGoogleVoice(v: string) {
  try {
    localStorage.setItem(LS_VOICE, v);
  } catch {
    /* ignore */
  }
}

/** 지금 쓸 수 있는 고품질 음성 경로. 브라우저 직접 호출을 우선한다 (서버 없이도 되므로). */
export function resolveCloudSource(server: ServerInfo | null): CloudSource {
  const key = getGoogleKey();
  if (key) return { kind: 'google-browser', key };
  if (server?.ttsProvider) return { kind: 'server', provider: server.ttsProvider };
  return null;
}

export interface SceneAudio {
  id: SceneId;
  src: string;
  durationSec: number;
}

/** 장면별 나레이션 → 오디오. 길이는 브라우저에서 디코딩해 실측한다. */
export async function synthesizeScenes(
  source: NonNullable<CloudSource>,
  scenes: SceneSpec[],
  onProgress?: (done: number, total: number) => void,
): Promise<SceneAudio[]> {
  const items = scenes.map((s) => ({ id: s.id, text: s.narration }));
  let urls: Array<{ id: SceneId; url: string }>;
  if (source.kind === 'server') {
    urls = (await synthesizeOnServer(items)).map((it) => ({ id: it.id, url: serverBase() + it.url }));
  } else {
    urls = [];
    let done = 0;
    for (const it of items) {
      const mp3 = await googleTts(source.key, it.text, getGoogleVoice());
      urls.push({ id: it.id, url: URL.createObjectURL(new Blob([mp3], { type: 'audio/mpeg' })) });
      done += 1;
      onProgress?.(done, items.length);
    }
  }

  const ctx = new AudioContext();
  const out: SceneAudio[] = [];
  let done = 0;
  for (const it of urls) {
    const buf = await (await fetch(it.url)).arrayBuffer();
    const decoded = await ctx.decodeAudioData(buf.slice(0));
    out.push({ id: it.id, src: it.url, durationSec: decoded.duration });
    done += 1;
    if (source.kind === 'server') onProgress?.(done, urls.length);
  }
  await ctx.close();
  return out;
}

/** 간단한 메모리 캐시: 같은 문장은 다시 합성하지 않는다 (비용 절약) */
const cache = new Map<string, Promise<ArrayBuffer>>();

export function googleTts(key: string, text: string, voice: string): Promise<ArrayBuffer> {
  const ck = `${voice}|${text}`;
  let p = cache.get(ck);
  if (!p) {
    p = googleTtsRequest(key, text, voice).catch(async (e) => {
      // 선택한 음성이 이 계정/리전에서 지원되지 않으면 Neural2 로 한 번 더 시도
      if (voice !== 'ko-KR-Neural2-A' && /400|404|voice/i.test(String(e?.message))) {
        console.warn('[tts] 음성 실패, Neural2-A 로 재시도:', e?.message);
        return googleTtsRequest(key, text, 'ko-KR-Neural2-A');
      }
      throw e;
    });
    cache.set(ck, p);
    p.catch(() => cache.delete(ck));
  }
  return p;
}

async function googleTtsRequest(key: string, text: string, voice: string): Promise<ArrayBuffer> {
  const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: 'ko-KR', name: voice },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0 },
    }),
  });
  if (!r.ok) {
    let msg = `Google TTS 오류 ${r.status}`;
    try {
      const j = await r.json();
      msg += `: ${j?.error?.message ?? ''}`;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const { audioContent } = (await r.json()) as { audioContent: string };
  const bin = atob(audioContent);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}
