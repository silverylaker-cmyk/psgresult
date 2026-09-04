import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, type FaceExpr } from '../psg/metrics';
import { SCENE_TAIL_SEC, splitSentences } from '../psg/script';

/* ───────── 테마 ───────── */
export const T = {
  bg: '#f4f7f9',
  card: '#ffffff',
  navy: C.navy,
  teal: C.teal,
  ink: '#16232b',
  gray: C.gray,
  mist: C.mist,
  font: "'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif",
  shadow: '0 8px 30px rgba(27,58,75,0.10)',
};

/* ───────── 애니메이션 헬퍼 ───────── */
export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export function useEnter(startFrame: number, opts?: { damping?: number; stiffness?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - startFrame,
    fps,
    config: { damping: opts?.damping ?? 18, stiffness: opts?.stiffness ?? 120, mass: 0.8 },
  });
}

/** 아래에서 위로 떠오르며 등장 */
export const Rise: React.FC<{
  at: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  distance?: number;
}> = ({ at, children, style, distance = 40 }) => {
  const p = useEnter(at);
  return (
    <div
      style={{
        opacity: interpolate(p, [0, 1], [0, 1]),
        transform: `translateY(${(1 - p) * distance}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** 부드럽게 커지며 등장 */
export const Pop: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  at,
  children,
  style,
}) => {
  const p = useEnter(at, { damping: 14, stiffness: 160 });
  return (
    <div style={{ opacity: Math.min(1, p * 1.5), transform: `scale(${0.6 + 0.4 * p})`, ...style }}>{children}</div>
  );
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
  const eased = 1 - Math.pow(1 - p, 3);
  const cur = eased * value;
  return <span style={{ fontVariantNumeric: 'tabular-nums', ...style }}>{cur.toFixed(decimals)}</span>;
};

/* ───────── 표정 아이콘 (대시보드와 동일 디자인) ───────── */
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

/* ───────── 라인 아이콘 ───────── */
type IconName =
  | 'breath'
  | 'oxygen'
  | 'position'
  | 'sleep'
  | 'drowsy'
  | 'headache'
  | 'focus'
  | 'heart'
  | 'cpap'
  | 'surgery'
  | 'posture'
  | 'oral'
  | 'check';

export const Icon: React.FC<{ name: IconName; size?: number; color?: string }> = ({
  name,
  size = 56,
  color = T.teal,
}) => {
  const s = { stroke: color, strokeWidth: 2.2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  const paths: Record<IconName, React.ReactNode> = {
    breath: (
      <>
        <path d="M4 14h11a3 3 0 1 0-3-3" {...s} />
        <path d="M4 20h15a3 3 0 1 1-3 3" {...s} />
        <path d="M4 8h7a2.5 2.5 0 1 0-2.5-2.5" {...s} />
      </>
    ),
    oxygen: (
      <>
        <path d="M14 3s7 7.5 7 13a7 7 0 0 1-14 0c0-5.5 7-13 7-13z" {...s} />
        <path d="M10.5 16.5a3.5 3.5 0 0 0 3.5 3.5" {...s} />
      </>
    ),
    position: (
      <>
        <circle cx="6" cy="14" r="2.5" {...s} />
        <path d="M9.5 14h9l3 5" {...s} />
        <path d="M2 21h24" {...s} />
        <path d="M12 14v-4h6" {...s} />
      </>
    ),
    sleep: (
      <>
        <path d="M21 15.5A9 9 0 0 1 9.5 4a9 9 0 1 0 11.5 11.5z" {...s} />
        <path d="M17 3h4l-4 4h4" {...s} />
      </>
    ),
    drowsy: (
      <>
        <circle cx="12" cy="13" r="8" {...s} />
        <path d="M8.5 12h3M13.5 12h3" {...s} />
        <path d="M9.5 16.5c1.5-1 3.5-1 5 0" {...s} />
        <path d="M19 3h4l-4 4h4" {...s} />
      </>
    ),
    headache: (
      <>
        <circle cx="12" cy="12" r="8" {...s} />
        <path d="M4 8l-2-1M20 8l2-1M5 15l-2 1M19 15l2 1" {...s} />
        <path d="M9 10.5l1 1M15 10.5l-1 1" {...s} />
        <path d="M9 16c2-1 4-1 6 0" {...s} />
      </>
    ),
    focus: (
      <>
        <circle cx="12" cy="12" r="9" {...s} />
        <circle cx="12" cy="12" r="5" {...s} />
        <circle cx="12" cy="12" r="1.2" fill={color} stroke="none" />
      </>
    ),
    heart: (
      <>
        <path d="M12 21s-8-5.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.5-8 11-8 11z" {...s} />
        <path d="M5 12h3l1.5-3 2.5 6 2-4h5" {...s} />
      </>
    ),
    cpap: (
      <>
        <rect x="3" y="13" width="10" height="7" rx="1.5" {...s} />
        <path d="M13 16h3c2 0 3-1 3-3V8a2 2 0 0 1 2-2h1" {...s} />
        <circle cx="22" cy="6" r="1" fill={color} stroke="none" />
        <path d="M6 16.5h4" {...s} />
      </>
    ),
    surgery: (
      <>
        <path d="M12 3c-4 0-6 2-6 5 0 4 2 5 2 8v4h8v-4c0-3 2-4 2-8 0-3-2-5-6-5z" {...s} />
        <path d="M9 12h6" {...s} />
        <path d="M10.5 15.5h3" {...s} />
      </>
    ),
    posture: (
      <>
        <circle cx="19" cy="9" r="2.5" {...s} />
        <path d="M2 17h14l3-3" {...s} />
        <path d="M2 21h20" {...s} />
        <path d="M7 17c0-3 3-4 6-4" {...s} />
      </>
    ),
    oral: (
      <>
        <path d="M3 9c0-3 3-4 9-4s9 1 9 4c0 4-3 8-9 8S3 13 3 9z" {...s} />
        <path d="M3 9c3 1.5 15 1.5 18 0" {...s} />
        <path d="M8 6.5v5M12 6.5v5M16 6.5v5" {...s} />
      </>
    ),
    check: <path d="M5 12l5 5L20 7" {...s} strokeWidth={3} />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {paths[name]}
    </svg>
  );
};

/* ───────── 장면 레이아웃 ───────── */
export const SceneFrame: React.FC<{
  title: string;
  subtitle?: string;
  index: number;
  total: number;
  dark?: boolean;
  children: React.ReactNode;
}> = ({ title, subtitle, index, total, dark = false, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const inOp = interpolate(frame, [0, 12], [0, 1], clamp);
  const outOp = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], clamp);
  const titleP = useEnter(0);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: dark ? T.navy : T.bg,
        fontFamily: T.font,
        color: dark ? '#fff' : T.ink,
        opacity: Math.min(inOp, outOp),
      }}
    >
      {/* 진행 표시 */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: dark ? 'rgba(255,255,255,0.12)' : T.mist }}>
        <div
          style={{
            height: '100%',
            width: `${((index + interpolate(frame, [0, durationInFrames], [0, 1], clamp)) / total) * 100}%`,
            background: T.teal,
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 28,
          right: 64,
          fontSize: 22,
          fontWeight: 500,
          color: dark ? 'rgba(255,255,255,0.55)' : T.gray,
          letterSpacing: 1,
        }}
      >
        {index + 1} / {total}
      </div>

      {/* 제목 */}
      <div style={{ position: 'absolute', top: 64, left: 96, right: 96 }}>
        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            letterSpacing: -1,
            lineHeight: 1.2,
            opacity: titleP,
            transform: `translateY(${(1 - titleP) * 24}px)`,
            color: dark ? '#fff' : T.navy,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ marginTop: 14, fontSize: 30, fontWeight: 500, color: dark ? 'rgba(255,255,255,0.7)' : T.gray, opacity: titleP }}>
            {subtitle}
          </div>
        )}
      </div>

      {/* 본문 영역: 1920 × (1080 - 260 - 170) */}
      <div style={{ position: 'absolute', top: 250, left: 96, right: 96, bottom: 170 }}>{children}</div>
    </AbsoluteFill>
  );
};

/* ───────── 자막 ───────── */
export const Captions: React.FC<{ narration: string; dark?: boolean }> = ({ narration, dark }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const sentences = splitSentences(narration);
  const speechFrames = Math.max(1, durationInFrames - SCENE_TAIL_SEC * fps);
  const totalChars = sentences.reduce((a, s) => a + s.length, 0) || 1;

  let acc = 0;
  let current = sentences[sentences.length - 1] ?? '';
  for (const s of sentences) {
    const len = (s.length / totalChars) * speechFrames;
    if (frame < acc + len) {
      current = s;
      break;
    }
    acc += len;
  }
  if (!current) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 56,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 120px',
      }}
    >
      <div
        style={{
          background: dark ? 'rgba(255,255,255,0.14)' : 'rgba(27,58,75,0.92)',
          color: '#fff',
          fontFamily: T.font,
          fontSize: 34,
          fontWeight: 500,
          lineHeight: 1.45,
          padding: '18px 36px',
          borderRadius: 18,
          textAlign: 'center',
          maxWidth: 1500,
        }}
      >
        {current}
      </div>
    </div>
  );
};

/* ───────── 카드 ───────── */
export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; accent?: string }> = ({
  children,
  style,
  accent,
}) => (
  <div
    style={{
      background: T.card,
      borderRadius: 28,
      boxShadow: T.shadow,
      padding: 36,
      border: accent ? `4px solid ${accent}` : '4px solid transparent',
      ...style,
    }}
  >
    {children}
  </div>
);

export const Badge: React.FC<{ color: string; children: React.ReactNode; size?: number }> = ({ color, children, size = 26 }) => (
  <span
    style={{
      display: 'inline-block',
      background: `${color}22`,
      color,
      border: `2px solid ${color}66`,
      borderRadius: 999,
      padding: '6px 22px',
      fontSize: size,
      fontWeight: 700,
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </span>
);

export const NA: React.FC = () => (
  <span style={{ color: '#9aa5ad', fontStyle: 'italic', fontSize: 30 }}>결과지에서 인식 불가</span>
);
