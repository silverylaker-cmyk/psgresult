import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, type FaceExpr } from '../psg/metrics';
import { SCENE_TAIL_SEC, splitSentences } from '../psg/script';

/* ───────── 테마: 키노트 스타일 (큰 글자, 여백, 화면당 메시지 하나) ───────── */
export const T = {
  bg: '#fbfbfa',
  dark: '#0b0c0e',
  ink: '#111214',
  ink2: '#6e7074',
  ink3: '#a5a7ab',
  line: '#e6e6e4',
  accent: C.teal,
  font: "'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif",
  /** 본문 좌우 여백 */
  margin: 160,
};

/** 중증도 색상을 키노트 톤에 맞게 살짝 낮춘 값 */
export const SEV = {
  [C.good]: '#2e9e5b',
  [C.mild]: '#d99a00',
  [C.moderate]: '#e2622b',
  [C.severe]: '#d3302f',
} as Record<string, string>;
export const sev = (c?: string | null) => (c && SEV[c]) || T.ink;

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

/** 블러가 걷히며 아래에서 떠오르는 등장 (키노트 스타일) */
export const Rise: React.FC<{
  at: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  distance?: number;
}> = ({ at, children, style, distance = 36 }) => {
  const p = useEnter(at);
  return (
    <div
      style={{
        opacity: p,
        transform: `translateY(${(1 - p) * distance}px)`,
        filter: `blur(${(1 - p) * 12}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** 살짝 커지며 등장 */
export const Pop: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, children, style }) => {
  const p = useEnter(at, { damping: 16, stiffness: 140 });
  return <div style={{ opacity: Math.min(1, p * 1.5), transform: `scale(${0.85 + 0.15 * p})`, ...style }}>{children}</div>;
};

/** 숫자 카운트업 */
export const AnimatedNumber: React.FC<{
  value: number;
  at: number;
  duration?: number;
  decimals?: number;
  style?: React.CSSProperties;
}> = ({ value, at, duration = 45, decimals = 1, style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + duration], [0, 1], clamp);
  const eased = 1 - Math.pow(1 - p, 4);
  return <span style={{ fontVariantNumeric: 'tabular-nums', ...style }}>{(eased * value).toFixed(decimals)}</span>;
};

/* ───────── 타이포 ───────── */
/** 화면 상단의 작은 회색 라벨 */
export const Eyebrow: React.FC<{ children: React.ReactNode; dark?: boolean }> = ({ children, dark }) => (
  <div style={{ fontSize: 30, fontWeight: 500, color: dark ? 'rgba(255,255,255,0.55)' : T.ink2, letterSpacing: 0.2 }}>{children}</div>
);

/** 큰 헤드라인 */
export const Headline: React.FC<{ children: React.ReactNode; size?: number; dark?: boolean; style?: React.CSSProperties }> = ({
  children,
  size = 84,
  dark,
  style,
}) => (
  <div style={{ fontSize: size, fontWeight: 900, letterSpacing: -size * 0.03, lineHeight: 1.15, color: dark ? '#fff' : T.ink, ...style }}>
    {children}
  </div>
);

/** 큰 숫자 + 단위 */
export const BigNumber: React.FC<{
  value: number;
  at: number;
  unit?: string;
  decimals?: number;
  size?: number;
  color?: string;
  duration?: number;
}> = ({ value, at, unit, decimals = 0, size = 300, color = T.ink, duration = 50 }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: size * 0.06 }}>
    <div style={{ fontSize: size, fontWeight: 900, lineHeight: 0.9, letterSpacing: -size * 0.05, color }}>
      <AnimatedNumber value={value} at={at} decimals={decimals} duration={duration} />
    </div>
    {unit && <div style={{ fontSize: size * 0.2, fontWeight: 700, color: T.ink2 }}>{unit}</div>}
  </div>
);

/** 중증도 알약 */
export const Pill: React.FC<{ color: string; children: React.ReactNode; size?: number; at?: number }> = ({ color, children, size = 30, at = 0 }) => {
  const p = useEnter(at, { damping: 14, stiffness: 160 });
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.4,
        background: color,
        color: '#fff',
        borderRadius: 999,
        padding: `${size * 0.35}px ${size * 0.9}px`,
        fontSize: size,
        fontWeight: 900,
        opacity: p,
        transform: `scale(${0.8 + 0.2 * p})`,
        transformOrigin: 'left center',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: size * 0.45, height: size * 0.45, borderRadius: '50%', background: '#fff' }} />
      {children}
    </span>
  );
};

export const NA: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <span style={{ color: T.ink3, fontWeight: 500, fontSize: size }}>결과지에서 읽지 못함</span>
);

/**
 * 구간 스케일 — 얇은 막대와 세로 마커. 활성 구간만 색이 있고 나머지는 회색.
 * segments: 낮은값→높은값 순, 폭은 (to-from)/max
 */
export const SegmentScale: React.FC<{
  segments: Array<{ from: number; to: number; color: string; label: string }>;
  max: number;
  min?: number;
  value: number | null;
  activeLabel?: string | null;
  at: number;
  ticks?: Array<{ v: number; text?: string }>;
  height?: number;
  dark?: boolean;
}> = ({ segments, max, min = 0, value, activeLabel, at, ticks, height = 44, dark }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - at, fps, config: { damping: 20, stiffness: 60, mass: 1.1 } });
  const range = max - min;
  const pct = value == null ? 0 : ((Math.min(max, Math.max(min, value)) - min) / range) * 100 * p;
  const inactive = dark ? 'rgba(255,255,255,0.14)' : '#e6e6e4';
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', height, borderRadius: 6, overflow: 'hidden', gap: 3 }}>
        {segments.map((s) => (
          <div key={s.label} style={{ width: `${((s.to - s.from) / range) * 100}%`, background: s.label === activeLabel && frame >= at + 20 ? s.color : inactive }} />
        ))}
      </div>
      {value != null && (
        <div
          style={{
            position: 'absolute',
            top: -16,
            left: `${pct}%`,
            transform: 'translateX(-50%)',
            width: 5,
            height: height + 32,
            borderRadius: 3,
            background: dark ? '#fff' : T.ink,
          }}
        />
      )}
      <div style={{ display: 'flex', marginTop: 14, fontSize: 24, fontWeight: 700, color: T.ink2 }}>
        {segments.map((s) => (
          <div key={s.label} style={{ width: `${((s.to - s.from) / range) * 100}%`, color: s.label === activeLabel && frame >= at + 20 ? s.color : T.ink2 }}>
            {s.label}
          </div>
        ))}
      </div>
      {ticks && (
        <div style={{ position: 'relative', height: 26, marginTop: 4 }}>
          {ticks.map((t) => (
            <span key={t.v} style={{ position: 'absolute', left: `${((t.v - min) / range) * 100}%`, transform: t.v === min ? 'none' : t.v === max ? 'translateX(-100%)' : 'translateX(-50%)', fontSize: 20, color: T.ink3 }}>
              {t.text ?? t.v}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/* ───────── 장면 레이아웃 ───────── */
export const SceneFrame: React.FC<{
  index: number;
  total: number;
  dark?: boolean;
  children: React.ReactNode;
}> = ({ index, total, dark = false, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const inOp = interpolate(frame, [0, 14], [0, 1], clamp);
  const outOp = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], clamp);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: dark ? T.dark : T.bg,
        fontFamily: T.font,
        color: dark ? '#fff' : T.ink,
        opacity: Math.min(inOp, outOp),
      }}
    >
      {/* 페이지 점 표시 */}
      <div style={{ position: 'absolute', top: 44, right: T.margin, display: 'flex', gap: 8 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{ width: i === index ? 22 : 8, height: 8, borderRadius: 4, background: i === index ? (dark ? '#fff' : T.ink) : dark ? 'rgba(255,255,255,0.2)' : T.line }} />
        ))}
      </div>
      <div style={{ position: 'absolute', top: 0, left: T.margin, right: T.margin, bottom: 0 }}>{children}</div>
    </AbsoluteFill>
  );
};

/* ───────── 자막: 배경 없이 작은 회색 글자 ───────── */
export const Captions: React.FC<{ narration: string; dark?: boolean }> = ({ narration, dark }) => {
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
    <div style={{ position: 'absolute', left: T.margin, right: T.margin, bottom: 52, textAlign: 'center', opacity: op }}>
      <div style={{ fontFamily: T.font, fontSize: 28, fontWeight: 500, lineHeight: 1.5, color: dark ? 'rgba(255,255,255,0.6)' : T.ink2 }}>{current}</div>
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
