import type { ExplainerProps, SceneId } from '../psg/types';

/**
 * 선택 기능: server/index.mjs 를 함께 띄우면 서버 TTS 와 MP4 저장(환자용 MP4 링크)을 쓸 수 있다.
 * 서버가 없으면 모든 함수가 실패하고, 앱은 브라우저 TTS(또는 브라우저 → Google TTS 직접 호출)로 동작한다.
 *
 * 서버 주소:
 *   - 같은 서버가 dist/ 를 서빙하면 상대 경로('')로 충분하다.
 *   - GitHub Pages 처럼 정적 호스팅에서 별도 서버를 쓰려면 빌드 시 VITE_SERVER_URL 을 주거나,
 *     화면 설정에서 서버 주소를 입력한다 (localStorage 에 저장).
 */

const LS_SERVER = 'psg.serverUrl';

export function serverBase(): string {
  let s = '';
  try {
    s = localStorage.getItem(LS_SERVER) ?? '';
  } catch {
    /* ignore */
  }
  if (!s) s = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? '';
  return s.replace(/\/+$/, '');
}
export function setServerBase(url: string) {
  try {
    if (url.trim()) localStorage.setItem(LS_SERVER, url.trim().replace(/\/+$/, ''));
    else localStorage.removeItem(LS_SERVER);
  } catch {
    /* ignore */
  }
}

export interface ServerInfo {
  ok: boolean;
  ttsProvider: string | null;
  canRender: boolean;
  /** 서버가 환자용 링크에 쓸 자기 주소 (PUBLIC_URL). 없으면 브라우저가 접속한 주소를 쓴다 */
  publicUrl?: string;
}

export async function getServerInfo(): Promise<ServerInfo | null> {
  try {
    const r = await fetch(serverBase() + '/api/health', { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const j = (await r.json()) as ServerInfo;
    return j?.ok ? j : null;
  } catch {
    return null;
  }
}

export async function synthesizeOnServer(items: Array<{ id: SceneId; text: string }>): Promise<Array<{ id: SceneId; url: string }>> {
  const r = await fetch(serverBase() + '/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!r.ok) throw new Error(`TTS 서버 오류 (${r.status}): ${await r.text()}`);
  const { items: out } = (await r.json()) as { items: Array<{ id: SceneId; url: string }> };
  return out;
}

export interface RenderJob {
  id: string;
  status: 'queued' | 'rendering' | 'done' | 'error';
  progress: number;
  /** 서버 기준 상대 경로 (/media/mp4/psg-xxx.mp4) */
  url?: string;
  error?: string;
}

export async function startRender(props: ExplainerProps): Promise<RenderJob> {
  const r = await fetch(serverBase() + '/api/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(props),
  });
  if (!r.ok) throw new Error(`렌더 요청 실패 (${r.status}): ${await r.text()}`);
  return (await r.json()) as RenderJob;
}

export async function getRenderJob(id: string): Promise<RenderJob> {
  const r = await fetch(serverBase() + `/api/render/${id}`);
  if (!r.ok) throw new Error(`렌더 상태 조회 실패 (${r.status})`);
  return (await r.json()) as RenderJob;
}

/** 서버가 만들어 둔 MP4 와 함께 저장된 수치 (환자용 MP4 링크에서 사용) */
export interface SharedVideo {
  id: string;
  mp4Url: string;
  props: ExplainerProps;
}

export async function getSharedVideo(id: string, base: string): Promise<SharedVideo> {
  const r = await fetch(`${base}/media/mp4/psg-${id}.json`, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('영상을 찾을 수 없습니다. 링크가 만료되었거나 잘못되었습니다.');
  const props = (await r.json()) as ExplainerProps;
  return { id, mp4Url: `${base}/media/mp4/psg-${id}.mp4`, props };
}

/** 브라우저에서 만든 오디오를 서버에 올려 MP4 렌더링에 쓴다 */
export async function uploadAudio(items: Array<{ id: SceneId; src: string }>): Promise<Array<{ id: SceneId; url: string }>> {
  const payload: Array<{ id: SceneId; base64: string }> = [];
  for (const it of items) {
    const buf = await (await fetch(it.src)).arrayBuffer();
    payload.push({ id: it.id, base64: toBase64(buf) });
  }
  const r = await fetch(serverBase() + '/api/tts/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: payload }),
  });
  if (!r.ok) throw new Error(`오디오 업로드 실패 (${r.status}): ${await r.text()}`);
  const { items: out } = (await r.json()) as { items: Array<{ id: SceneId; url: string }> };
  return out.map((o) => ({ id: o.id, url: serverBase() + o.url }));
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
