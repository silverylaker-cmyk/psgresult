import { EMPTY_VALUES, type PsgValues } from './types';

/**
 * 환자용 링크: 수치를 URL 해시(#v=…)에 실어 보낸다.
 *
 *  - 서버 없이도 동작한다 (GitHub Pages 같은 정적 호스팅에서 그대로 열린다).
 *  - 이름·생년월일 등 개인정보는 넣지 않는다. 수치만 들어 있어 링크만으로는 누구의 결과인지 알 수 없다.
 *  - 예: https://…/psgresult/#v=ahi:22.4;rdi:25.3;spo2:82;…
 *
 * 서버가 MP4 를 만든 경우에는 #m=<렌더 id> 로 완성된 영상을 가리킨다 (+ s=<서버 주소>, 같은 서버에서 열면 생략).
 */

const KEYS: Array<[keyof PsgValues, string]> = [
  ['ahi', 'ahi'],
  ['rdi', 'rdi'],
  ['n3pct', 'n3'],
  ['rempct', 'rem'],
  ['snorepct', 'sn'],
  ['lowestspo2', 'spo2'],
  ['fli', 'fli'],
  ['rmiSupine', 'rs'],
  ['rmiLeft', 'rl'],
  ['rmiRight', 'rr'],
  ['tst', 'tst'],
  ['eff', 'eff'],
];

export function encodeValues(v: PsgValues): string {
  return KEYS.filter(([k]) => v[k] != null && Number.isFinite(v[k]))
    .map(([k, short]) => `${short}:${trim(v[k] as number)}`)
    .join(';');
}

export function decodeValues(s: string): PsgValues | null {
  if (!s) return null;
  const out: PsgValues = { ...EMPTY_VALUES };
  let any = false;
  for (const part of s.split(';')) {
    const [short, raw] = part.split(':');
    const key = KEYS.find(([, sh]) => sh === short)?.[0];
    if (!key) continue;
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    out[key] = n;
    any = true;
  }
  return any ? out : null;
}

function trim(n: number): string {
  return String(Math.round(n * 10) / 10);
}

export interface ShareTarget {
  /** 수치 기반 링크 — 열면 브라우저에서 영상을 새로 만든다 */
  values?: PsgValues;
  /** 서버가 렌더링한 MP4 id */
  mp4Id?: string;
  /** MP4 가 있는 서버 주소 (현재 사이트와 다를 때만) */
  server?: string;
}

/** 현재 페이지 주소를 기준으로 환자용 링크를 만든다 */
export function buildShareUrl(target: ShareTarget, base: string = window.location.href): string {
  const u = new URL(base);
  u.hash = '';
  u.search = '';
  const parts: string[] = [];
  if (target.mp4Id) {
    parts.push(`m=${encodeURIComponent(target.mp4Id)}`);
    if (target.server) parts.push(`s=${encodeURIComponent(target.server)}`);
  }
  if (target.values) parts.push(`v=${encodeValues(target.values)}`);
  return u.toString() + '#' + parts.join('&');
}

/** 주소창의 해시를 읽는다. 환자용 링크가 아니면 null */
export function parseShareHash(hash: string = window.location.hash): ShareTarget | null {
  const h = hash.replace(/^#/, '');
  if (!h) return null;
  const params = new URLSearchParams(h);
  const out: ShareTarget = {};
  const v = params.get('v');
  if (v) {
    const values = decodeValues(v);
    if (values) out.values = values;
  }
  const m = params.get('m');
  if (m && /^[a-z0-9]{6,32}$/i.test(m)) {
    out.mp4Id = m;
    const s = params.get('s');
    if (s && /^https?:\/\//.test(s)) out.server = s.replace(/\/+$/, '');
  }
  return out.values || out.mp4Id ? out : null;
}
