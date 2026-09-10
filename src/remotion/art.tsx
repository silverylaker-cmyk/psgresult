import React, { useEffect, useState } from 'react';
import { Img, continueRender, delayRender, staticFile } from 'remotion';
import { T } from './ui';

/**
 * 생성 이미지(public/art/*.jpg)를 장면 일러스트로 쓴다.
 * 파일이 없으면(아직 안 올렸거나 이름이 다르면) 기존 SVG 일러스트(fallback)를 그대로 쓴다.
 *
 * 경로:
 *  - Vite(Player): main.tsx 가 window.__PSG_ART_BASE 에 BASE_URL 을 넣어 준다 (GitHub Pages 하위 경로 대응)
 *  - Remotion 렌더(서버/CLI): staticFile() → public/ 폴더
 */

declare global {
  interface Window {
    __PSG_ART_BASE?: string;
  }
}

/** 기대하는 파일 이름 (public/art/<name>.jpg) */
export const ART_FILES = {
  intro: '01-intro',
  overviewBreath: '02-overview-breath',
  overviewOxygen: '03-overview-oxygen',
  overviewPosition: '04-overview-position',
  overviewSleep: '05-overview-sleep',
  ahi: '06-ahi',
  oxygen: '07-oxygen',
  positionSupine: '08-position-supine',
  positionSide: '09-position-side',
  quality: '10-quality',
  daytime: '11-daytime',
  optionCpap: '12-option-cpap',
  optionSurgery: '13-option-surgery',
  optionLifestyle: '14-option-lifestyle',
  outro: '16-outro',
} as const;

export function artSrc(name: string): string {
  const file = `art/${name}.jpg`;
  if (typeof window !== 'undefined' && window.__PSG_ART_BASE) return window.__PSG_ART_BASE + file;
  return staticFile(file);
}

const known = new Map<string, boolean>();
const probing = new Map<string, Promise<boolean>>();

function probe(src: string): Promise<boolean> {
  const cached = known.get(src);
  if (cached != null) return Promise.resolve(cached);
  let p = probing.get(src);
  if (!p) {
    p = new Promise<boolean>((resolve) => {
      if (typeof Image === 'undefined') return resolve(false);
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth > 0);
      img.onerror = () => resolve(false);
      img.src = src;
    }).then((ok) => {
      known.set(src, ok);
      probing.delete(src);
      return ok;
    });
    probing.set(src, p);
  }
  return p;
}

/** 이미지들이 모두 있는지. null = 아직 확인 중 (렌더는 확인이 끝날 때까지 기다린다) */
export function useArtsAvailable(names: string[]): boolean | null {
  const key = names.join('|');
  const [ok, setOk] = useState<boolean | null>(() => {
    const vals = names.map((n) => known.get(artSrc(n)));
    return vals.every((v) => v != null) ? vals.every(Boolean) : null;
  });
  useEffect(() => {
    let alive = true;
    const handle = delayRender(`art probe ${key}`, { timeoutInMilliseconds: 20000 });
    Promise.all(names.map((n) => probe(artSrc(n)))).then((rs) => {
      if (alive) setOk(rs.every(Boolean));
      continueRender(handle);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return ok;
}

/** 이미지 한 장 + (선택) 그 위에 얹는 오버레이. 없으면 fallback */
export const ArtImage: React.FC<{ name: string; fallback: React.ReactNode; dim?: boolean; children?: React.ReactNode }> = ({ name, fallback, dim, children }) => {
  const ok = useArtsAvailable([name]);
  if (ok === null) return <div style={{ width: '100%', aspectRatio: '1 / 1' }} />;
  if (!ok) return <>{fallback}</>;
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', borderRadius: 36, overflow: 'hidden' }}>
      <Img src={artSrc(name)} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', opacity: dim ? 0.35 : 1 }} />
      {children}
    </div>
  );
};

export interface ArtGridItem {
  name: string;
  /** false 면 흐리게 */
  on: boolean;
  /** 강조 (살짝 크게 + 테두리) */
  active?: boolean;
  label?: string;
}

/** 여러 장을 격자로. 나레이션에 맞춰 하나씩 켜지거나 강조된다. 없으면 fallback */
export const ArtGrid: React.FC<{ items: ArtGridItem[]; columns?: number; fallback: React.ReactNode; gap?: number }> = ({ items, columns = 2, fallback, gap = 22 }) => {
  const ok = useArtsAvailable(items.map((i) => i.name));
  if (ok === null) return <div style={{ width: '100%', aspectRatio: '1 / 1' }} />;
  if (!ok) return <div style={{ width: '100%', aspectRatio: '1 / 1' }}>{fallback}</div>;
  const cellW = `calc(${100 / columns}% - ${(gap * (columns - 1)) / columns}px)`;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center', gap, width: '100%' }}>
      {items.map((it) => (
        <div
          key={it.name}
          style={{
            flex: `0 0 ${cellW}`,
            maxWidth: cellW,
            opacity: it.on ? 1 : 0.22,
            transform: it.active ? 'scale(1.04)' : 'scale(1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div
            style={{
              width: '100%',
              aspectRatio: '1 / 1',
              borderRadius: 32,
              background: it.active ? T.paper : 'transparent',
              boxShadow: it.active ? `0 0 0 5px ${T.accent}` : 'none',
              overflow: 'hidden',
            }}
          >
            <Img src={artSrc(it.name)} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
          </div>
          {it.label && <div style={{ fontFamily: T.sans, fontSize: 24, fontWeight: 700, color: it.active ? T.accent : T.ink2 }}>{it.label}</div>}
        </div>
      ))}
    </div>
  );
};
