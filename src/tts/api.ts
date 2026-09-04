import type { ExplainerProps, SceneId, SceneSpec } from '../psg/types';

/**
 * 선택 기능: server/index.mjs 를 함께 띄우면 고품질 TTS 와 MP4 다운로드를 쓸 수 있다.
 * 서버가 없으면 모든 함수가 실패하고, 앱은 브라우저 TTS 로 동작한다.
 */

export interface ServerInfo {
  ok: boolean;
  ttsProvider: string | null;
  canRender: boolean;
}

export async function getServerInfo(): Promise<ServerInfo | null> {
  try {
    const r = await fetch('/api/health', { signal: AbortSignal.timeout(2500) });
    if (!r.ok) return null;
    return (await r.json()) as ServerInfo;
  } catch {
    return null;
  }
}

/** 장면별 나레이션을 서버 TTS 로 합성하고, 오디오 길이를 브라우저에서 실측한다. */
export async function synthesizeScenes(
  scenes: SceneSpec[],
  onProgress?: (done: number, total: number) => void,
): Promise<Array<{ id: SceneId; src: string; durationSec: number }>> {
  const r = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: scenes.map((s) => ({ id: s.id, text: s.narration })) }),
  });
  if (!r.ok) throw new Error(`TTS 서버 오류 (${r.status}): ${await r.text()}`);
  const { items } = (await r.json()) as { items: Array<{ id: SceneId; url: string }> };

  const ctx = new AudioContext();
  const out: Array<{ id: SceneId; src: string; durationSec: number }> = [];
  let done = 0;
  for (const it of items) {
    const buf = await (await fetch(it.url)).arrayBuffer();
    const decoded = await ctx.decodeAudioData(buf.slice(0));
    out.push({ id: it.id, src: new URL(it.url, window.location.href).toString(), durationSec: decoded.duration });
    done += 1;
    onProgress?.(done, items.length);
  }
  await ctx.close();
  return out;
}

export interface RenderJob {
  id: string;
  status: 'queued' | 'rendering' | 'done' | 'error';
  progress: number;
  url?: string;
  error?: string;
}

export async function startRender(props: ExplainerProps): Promise<RenderJob> {
  const r = await fetch('/api/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(props),
  });
  if (!r.ok) throw new Error(`렌더 요청 실패 (${r.status}): ${await r.text()}`);
  return (await r.json()) as RenderJob;
}

export async function getRenderJob(id: string): Promise<RenderJob> {
  const r = await fetch(`/api/render/${id}`);
  if (!r.ok) throw new Error(`렌더 상태 조회 실패 (${r.status})`);
  return (await r.json()) as RenderJob;
}
