import React from 'react';
import { AbsoluteFill, continueRender, delayRender, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, type FaceExpr } from '../psg/metrics';
import { SCENE_TAIL_SEC, splitSentences } from '../psg/script';

/* ───────── 폰트: Google Fonts 를 최선 노력으로 불러온다 (실패해도 시스템 폰트로 계속) ───────── */
const FONT_CSS =
  'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=Noto+Serif+KR:wght@500;700;900&display=swap';
const SERIF_FAMILY = 'Noto Serif KR';
const SANS_FAMILY = 'Noto Sans KR';

let fontsPromise: Promise<void> | null = null;
function loadFonts(): Promise<void> {
  if (fontsPromise) return fontsPromise;
  fontsPromise = new Promise<void>((resolve) => {
    if (typeof document === 'undefined') return resolve();
    const finish = () => resolve();
    const timeout = setTimeout(finish, 25000);
    let link = document.querySelector<HTMLLinkElement>('link[data-psg-fonts]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = FONT_CSS;
      link.dataset.psgFonts = '1';
      document.head.appendChild(link);
    }
    const requestAll = () => {
      // 한글 전체 음절 + 숫자·문장부호를 한 번에 요청해, 렌더 중 글꼴이 바뀌지 않게 한다
      let hangul = '';
      for (let c = 0xac00; c <= 0xd7a3; c += 1) hangul += String.fromCharCode(c);
      const sample = hangul + '0123456789%.,·—:()/ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      const faces = [
        ...['500', '700', '900'].map((w) => `${w} 20px '${SERIF_FAMILY}'`),
        ...['400', '500', '700', '900'].map((w) => `${w} 20px '${SANS_FAMILY}'`),
      ];
      Promise.allSettled(faces.map((f) => document.fonts.load(f, sample))).then(() => {
        clearTimeout(timeout);
        finish();
      });
    };
    if (link.sheet) requestAll();
    else {
      link.addEventListener('load', requestAll, { once: true });
      link.addEventListener('error', () => {
        clearTimeout(timeout);
        finish();
      }, { once: true });
    }
  });
  return fontsPromise;
}

/** 컴포지션 안에서 한 번 렌더하면 폰트가 준비될 때까지 렌더를 잠시 미룬다 */
export const FontLoader: React.FC = () => {
  const [handle] = React.useState(() => delayRender('Loading fonts', { timeoutInMilliseconds: 30000 }));
  React.useEffect(() => {
    loadFonts().then(() => continueRender(handle));
  }, [handle]);
  return null;
};

/* ───────── 테마: 따뜻한 크림 + 테라코타, 세리프 헤드라인, 손그림 일러스트 ───────── */
export const T = {
  bg: '#F3EFE7',
  paper: '#FBF9F4',
  ink: '#1F1D1A',
  ink2: '#6B665E',
  ink3: '#A8A299',
  line: '#E3DDD1',
  accent: '#D4784F',
  accentSoft: '#F2DCCD',
  clay: '#C45C3E',
  sage: '#8FA98F',
  sageSoft: '#DDE6D8',
  sky: '#7E9BB5',
  skySoft: '#DAE4EC',
  sand: '#D8B15A',
  sandSoft: '#F1E6C6',
  serif: `'${SERIF_FAMILY}', 'Nanum Myeongjo', 'Apple SD Gothic Neo', serif`,
  sans: `'${SANS_FAMILY}', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif`,
  margin: 140,
};

/** 중증도 색상 (따뜻한 톤으로 조정) */
export const SEV = {
  [C.good]: '#5F9A6B',
  [C.mild]: '#D6A03C',
  [C.moderate]: '#D4784F',
  [C.severe]: '#C45C3E',
} as Record<string, string>;
export const sev = (c?: string | null) => (c && SEV[c]) || T.ink;
/** 중증도 색상의 연한 배경 */
export const SEV_SOFT: Record<string, string> = {
  '#5F9A6B': '#DCE8DA',
  '#D6A03C': '#F3E6C4',
  '#D4784F': '#F2DCCD',
  '#C45C3E': '#F0D3C8',
};
export const soft = (c: string) => SEV_SOFT[c] ?? T.sandSoft;

/* ───────── 애니메이션 헬퍼 ───────── */
export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export function useEnter(startFrame: number, opts?: { damping?: number; stiffness?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - startFrame,
    fps,
    config: { damping: opts?.damping ?? 22, stiffness: opts?.stiffness ?? 90, mass: 0.9 },
  });
}

/** 아래에서 부드럽게 떠오르는 등장 */
export const Rise: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties; distance?: number }> = ({
  at,
  children,
  style,
  distance = 30,
}) => {
  const p = useEnter(at);
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * distance}px)`, ...style }}>
      {children}
    </div>
  );
};

/** 일러스트 등장: 살짝 커지며 페이드 */
export const Grow: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, children, style }) => {
  const p = useEnter(at, { damping: 18, stiffness: 70 });
  return <div style={{ opacity: p, transform: `scale(${0.92 + 0.08 * p})`, transformOrigin: 'center', ...style }}>{children}</div>;
};

/** 숫자 카운트업 */
export const AnimatedNumber: React.FC<{ value: number; at: number; duration?: number; decimals?: number; style?: React.CSSProperties }> = ({
  value,
  at,
  duration = 45,
  decimals = 1,
  style,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + duration], [0, 1], clamp);
  const eased = 1 - Math.pow(1 - p, 4);
  return <span style={{ fontVariantNumeric: 'tabular-nums', ...style }}>{(eased * value).toFixed(decimals)}</span>;
};

/* ───────── 타이포 ───────── */
export const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: T.sans, fontSize: 26, fontWeight: 700, color: T.accent, letterSpacing: 0.5 }}>{children}</div>
);

export const Headline: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({ children, size = 84, style }) => (
  <div style={{ fontFamily: T.serif, fontSize: size, fontWeight: 700, letterSpacing: -size * 0.02, lineHeight: 1.22, color: T.ink, ...style }}>{children}</div>
);

export const Body: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties; strong?: boolean }> = ({
  children,
  size = 30,
  style,
  strong,
}) => (
  <div style={{ fontFamily: T.sans, fontSize: size, fontWeight: strong ? 700 : 400, lineHeight: 1.55, color: strong ? T.ink : T.ink2, ...style }}>{children}</div>
);

/** 큰 숫자 + 단위 */
export const BigNumber: React.FC<{ value: number; at: number; unit?: string; decimals?: number; size?: number; color?: string; duration?: number }> = ({
  value,
  at,
  unit,
  decimals = 0,
  size = 220,
  color = T.ink,
  duration = 50,
}) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: size * 0.06, fontFamily: T.sans }}>
    <div style={{ fontSize: size, fontWeight: 900, lineHeight: 0.95, letterSpacing: -size * 0.05, color }}>
      <AnimatedNumber value={value} at={at} decimals={decimals} duration={duration} />
    </div>
    {unit && <div style={{ fontSize: size * 0.18, fontWeight: 700, color: T.ink2 }}>{unit}</div>}
  </div>
);

/** 중증도 알약 */
export const Pill: React.FC<{ color: string; children: React.ReactNode; size?: number; at?: number }> = ({ color, children, size = 28, at = 0 }) => {
  const p = useEnter(at, { damping: 14, stiffness: 160 });
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.4,
        background: soft(color),
        color,
        borderRadius: 999,
        padding: `${size * 0.35}px ${size * 0.85}px`,
        fontFamily: T.sans,
        fontSize: size,
        fontWeight: 900,
        opacity: p,
        transform: `scale(${0.8 + 0.2 * p})`,
        transformOrigin: 'left center',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: size * 0.45, height: size * 0.45, borderRadius: '50%', background: color }} />
      {children}
    </span>
  );
};

export const NA: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <span style={{ fontFamily: T.sans, color: T.ink3, fontWeight: 500, fontSize: size }}>결과지에서 읽지 못함</span>
);

/** 구간 스케일 — 얇은 막대와 마커. 활성 구간만 색이 있고 나머지는 연한 회색. */
export const SegmentScale: React.FC<{
  segments: Array<{ from: number; to: number; color: string; label: string }>;
  max: number;
  min?: number;
  value: number | null;
  activeLabel?: string | null;
  at: number;
  ticks?: Array<{ v: number; text?: string }>;
  height?: number;
}> = ({ segments, max, min = 0, value, activeLabel, at, ticks, height = 26 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - at, fps, config: { damping: 20, stiffness: 60, mass: 1.1 } });
  const range = max - min;
  const pct = value == null ? 0 : ((Math.min(max, Math.max(min, value)) - min) / range) * 100 * p;
  const on = frame >= at + 20;
  return (
    <div style={{ position: 'relative', fontFamily: T.sans }}>
      <div style={{ display: 'flex', height, borderRadius: height / 2, overflow: 'hidden', gap: 4 }}>
        {segments.map((s) => (
          <div key={s.label} style={{ width: `${((s.to - s.from) / range) * 100}%`, background: s.label === activeLabel && on ? s.color : T.line, borderRadius: height / 2 }} />
        ))}
      </div>
      {value != null && (
        <div style={{ position: 'absolute', top: -14, left: `${pct}%`, transform: 'translateX(-50%)', width: height + 28, height: height + 28, borderRadius: '50%', background: T.ink, border: `5px solid ${T.bg}`, boxShadow: '0 4px 12px rgba(0,0,0,.18)' }} />
      )}
      <div style={{ display: 'flex', marginTop: 20, fontSize: 22, fontWeight: 700, color: T.ink3 }}>
        {segments.map((s) => (
          <div key={s.label} style={{ width: `${((s.to - s.from) / range) * 100}%`, color: s.label === activeLabel && on ? s.color : T.ink3 }}>
            {s.label}
          </div>
        ))}
      </div>
      {ticks && (
        <div style={{ position: 'relative', height: 24, marginTop: 2 }}>
          {ticks.map((t) => (
            <span key={t.v} style={{ position: 'absolute', left: `${((t.v - min) / range) * 100}%`, transform: t.v === min ? 'none' : t.v === max ? 'translateX(-100%)' : 'translateX(-50%)', fontSize: 19, color: T.ink3 }}>
              {t.text ?? t.v}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/* ───────── 장면 레이아웃: 왼쪽 글, 오른쪽 일러스트 ───────── */
/** 일러스트 크기(정사각형 한 변)와 오른쪽 여백. 1080 높이보다 커서 위아래가 살짝 잘리지만 마스크로 자연스럽게 사라진다 */
export const ART_W = 1152;
/** 격자(여러 장) 일러스트는 글과 겹치지 않는 폭으로 */
export const ART_GRID_W = 720;
/** 자세 장면: 침대 부분만 세로로 잘라 보여 주므로 더 넓게 */
export const ART_POSITION_W = 798;
const ART_RIGHT = 40;
/** 글과 겹치는 왼쪽 절반과 위아래 13% 를 투명하게 (한 장짜리) */
const ART_MASK_FULL = 'linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 25%, #000 50%), linear-gradient(to bottom, rgba(0,0,0,0) 0%, #000 13%, #000 87%, rgba(0,0,0,0) 100%)';

export const SceneFrame: React.FC<{
  index: number;
  total: number;
  art?: React.ReactNode;
  artAt?: number;
  /** 일러스트 폭. 격자는 ART_GRID_W */
  artWidth?: number;
  /** 글 영역 너비 비율 (0~1) */
  split?: number;
  children: React.ReactNode;
}> = ({ index, total, art, artAt = 6, artWidth = ART_W, split = 0.56, children }) => {
  // 격자(작은 폭)는 글과 겹치지 않으므로 마스크 없이 그대로
  const artMask = artWidth >= 1100 ? ART_MASK_FULL : undefined;
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const inOp = interpolate(frame, [0, 14], [0, 1], clamp);
  const outOp = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: T.bg, fontFamily: T.sans, color: T.ink, opacity: Math.min(inOp, outOp) }}>
      {/* 상단: 워드마크 + 페이지 점 */}
      <div style={{ position: 'absolute', top: 44, left: T.margin, right: T.margin, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
        <div style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 700, color: T.ink2 }}>수면다원검사 결과 안내</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{ width: i === index ? 26 : 9, height: 9, borderRadius: 5, background: i === index ? T.accent : T.line }} />
          ))}
        </div>
      </div>

      {/* 일러스트: 글 뒤에 크게 깔리고, 글과 겹치는 왼쪽·위·아래는 그라데이션으로 사라진다 */}
      {art && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            right: ART_RIGHT,
            width: artWidth,
            transform: 'translateY(-50%)',
            WebkitMaskImage: artMask,
            maskImage: artMask,
            WebkitMaskComposite: artMask ? 'source-in' : undefined,
            maskComposite: artMask ? 'intersect' : undefined,
            pointerEvents: 'none',
          }}
        >
          <Grow at={artAt} style={{ width: '100%' }}>
            {art}
          </Grow>
        </div>
      )}

      {/* 본문 (글) */}
      <div style={{ position: 'absolute', top: 120, bottom: 120, left: T.margin, width: (1920 - T.margin * 2) * split, display: 'flex', alignItems: 'center', zIndex: 1 }}>
        <div style={{ width: '100%' }}>{children}</div>
      </div>
    </AbsoluteFill>
  );
};

/* ───────── 자막 ───────── */
export const Captions: React.FC<{ narration: string; dark?: boolean }> = ({ narration }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const sentences = splitSentences(narration);
  const speechFrames = Math.max(1, durationInFrames - SCENE_TAIL_SEC * fps);
  const totalChars = sentences.reduce((a, s) => a + s.length, 0) || 1;

  let acc = 0;
  let current = sentences[sentences.length - 1] ?? '';
  let start = 0;
  for (const s of sentences) {
    const len = (s.length / totalChars) * speechFrames;
    if (frame < acc + len) {
      current = s;
      start = acc;
      break;
    }
    acc += len;
  }
  if (!current) return null;
  const op = interpolate(frame, [start, start + 8], [0, 1], clamp);

  return (
    <div style={{ position: 'absolute', left: T.margin, right: T.margin, bottom: 44, textAlign: 'center', opacity: op }}>
      <span style={{ display: 'inline-block', fontFamily: T.sans, fontSize: 27, fontWeight: 500, lineHeight: 1.5, color: T.ink2, background: T.paper, padding: '10px 26px', borderRadius: 14, border: `1px solid ${T.line}` }}>
        {current}
      </span>
    </div>
  );
};

/* ───────── 표정 아이콘 (대시보드에서 사용) ───────── */
export const Face: React.FC<{ color: string; expr: FaceExpr; size?: number }> = ({ color, expr, size = 64 }) => {
  let brows: React.ReactNode = null;
  let mouth: React.ReactNode;
  if (expr === 'great') {
    brows = (
      <>
        <path d="M12,13 Q15,11 18,13" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M22,13 Q25,11 28,13" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </>
    );
    mouth = <path d="M10,24 Q20,35 30,24" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />;
  } else if (expr === 'ok') {
    mouth = <path d="M13,27 Q20,23 27,27" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />;
  } else if (expr === 'bad') {
    mouth = <path d="M13,28 Q20,23 27,28" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />;
  } else {
    brows = (
      <>
        <path d="M12,14 Q15,11 18,13" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M22,13 Q25,11 28,14" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
      </>
    );
    mouth = <path d="M10,30 Q20,20 30,30" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="18" fill={color} stroke="#fff" strokeWidth="2.5" />
      {brows}
      <circle cx="15" cy="17" r="2.8" fill="#333" />
      <circle cx="25" cy="17" r="2.8" fill="#333" />
      {mouth}
    </svg>
  );
};
