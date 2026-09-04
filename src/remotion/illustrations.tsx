import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { T } from './ui';

/**
 * 손그림 느낌의 단순한 일러스트 모음. 모두 640×640 viewBox, 굵은 둥근 선.
 * 수치에 따라 모양이 달라지는 것들은 props 로 받는다.
 */

const S = { stroke: T.ink, strokeWidth: 7, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
const thin = { ...S, strokeWidth: 5 } as const;

/** 유기적인 배경 덩어리 */
export const Blob: React.FC<{ color: string; d?: string }> = ({ color, d }) => (
  <path
    d={d ?? 'M320 60c120-20 250 40 270 160s-40 250-160 300-260 30-330-70S20 210 100 130 200 80 320 60z'}
    fill={color}
  />
);

const Star: React.FC<{ x: number; y: number; s?: number; color?: string }> = ({ x, y, s = 14, color = T.sand }) => (
  <path d={`M${x} ${y - s} q${s * 0.25} ${s * 0.75} ${s} ${s} q-${s * 0.75} ${s * 0.25} -${s} ${s} q-${s * 0.25} -${s * 0.75} -${s} -${s} q${s * 0.75} -${s * 0.25} ${s} -${s}z`} fill={color} />
);

const Moon: React.FC<{ x: number; y: number; r?: number }> = ({ x, y, r = 46 }) => (
  <path d={`M${x} ${y - r}a${r} ${r} 0 1 0 ${r * 0.85} ${r * 1.7}a${r * 0.72} ${r * 0.72} 0 1 1 -${r * 0.85} -${r * 1.7}z`} fill={T.sand} stroke={T.ink} strokeWidth={6} strokeLinejoin="round" />
);

/** 침대에 누워 자는 사람 (옆에서 본 모습) */
const Sleeper: React.FC<{ x?: number; y?: number; blanket?: string; scale?: number }> = ({ x = 60, y = 360, blanket = T.accentSoft, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    {/* 침대 */}
    <rect x="0" y="120" width="520" height="70" rx="22" fill={T.paper} stroke={T.ink} strokeWidth={7} />
    <rect x="18" y="190" width="30" height="46" rx="8" fill={T.ink} />
    <rect x="472" y="190" width="30" height="46" rx="8" fill={T.ink} />
    {/* 베개 */}
    <rect x="30" y="72" width="130" height="58" rx="26" fill={T.paper} stroke={T.ink} strokeWidth={7} />
    {/* 이불 */}
    <path d="M150 128c40-60 120-70 200-60s130 30 160 60z" fill={blanket} stroke={T.ink} strokeWidth={7} strokeLinejoin="round" />
    {/* 머리 */}
    <circle cx="105" cy="74" r="40" fill={T.paper} stroke={T.ink} strokeWidth={7} />
    <path d="M90 78q8 8 16 0M118 78q8 8 16 0" {...thin} />
  </g>
);

/* 1. 인트로 — 밤, 달, 잠든 사람 */
export const IntroArt: React.FC = () => {
  const frame = useCurrentFrame();
  const z = (i: number) => interpolate((frame + i * 20) % 60, [0, 60], [0, 1]);
  return (
    <svg viewBox="0 0 640 640" width="100%">
      <Blob color={T.skySoft} />
      <Moon x={430} y={160} />
      <Star x={520} y={120} />
      <Star x={150} y={150} s={10} />
      <Star x={560} y={250} s={9} />
      <Sleeper />
      {[0, 1, 2].map((i) => (
        <text key={i} x={200 + i * 26 + z(i) * 10} y={300 - z(i) * 60} fontSize={26 + i * 6} fontWeight={900} fill={T.accent} opacity={1 - z(i)} fontFamily={T.sans}>
          z
        </text>
      ))}
    </svg>
  );
};

/* 2. 개요 — 잠든 사람 주위에 네 가지 토큰 */
export const OverviewArt: React.FC<{ step: number }> = ({ step }) => {
  const tokens = [
    { x: 110, y: 130, color: T.accentSoft, icon: <path d="M-26 0h30a12 12 0 1 0-12-12M-26 18h44a10 10 0 1 1-10 10" {...thin} /> },
    { x: 300, y: 80, color: T.skySoft, icon: <path d="M0-28s-22 24-22 38a22 22 0 0 0 44 0c0-14-22-38-22-38z" {...thin} /> },
    { x: 490, y: 130, color: T.sageSoft, icon: <><circle cx="-16" cy="-4" r="9" {...thin} /><path d="M-4-2h34l8 14M-30 24h64" {...thin} /></> },
    { x: 560, y: 300, color: T.sandSoft, icon: <path d="M10-22a22 22 0 1 0 14 34a18 18 0 0 1-14-34z" {...thin} /> },
  ];
  return (
    <svg viewBox="0 0 640 640" width="100%">
      <Blob color={T.sandSoft} d="M300 90c130-40 260 20 290 150s-60 250-170 300-250 30-330-60S30 240 110 150 200 120 300 90z" />
      <Sleeper y={380} blanket={T.skySoft} />
      {tokens.map((t, i) => (
        <g key={i} transform={`translate(${t.x} ${t.y})`} opacity={i <= step ? 1 : 0.18}>
          <circle r="48" fill={t.color} stroke={T.ink} strokeWidth={6} />
          {t.icon}
        </g>
      ))}
    </svg>
  );
};

/* 3. AHI — 숨의 파형. gaps 만큼 평평한 구간(멈춤)이 생긴다 */
export const BreathArt: React.FC<{ gaps: number; color: string; progress: number }> = ({ gaps, color, progress }) => {
  // 640 폭에 물결 + 멈춤 구간
  const cycles = 10;
  const w = 560;
  const x0 = 40;
  const y0 = 330;
  const amp = 70;
  const gapSet = new Set<number>();
  const positions = [3, 6, 8, 5, 2];
  for (let i = 0; i < Math.min(gaps, positions.length); i++) gapSet.add(positions[i]);
  let d = `M${x0} ${y0}`;
  const seg = w / cycles;
  for (let c = 0; c < cycles; c++) {
    const xs = x0 + c * seg;
    if (gapSet.has(c)) d += ` L${xs + seg} ${y0}`;
    else d += ` C${xs + seg * 0.25} ${y0 - amp} ${xs + seg * 0.75} ${y0 + amp} ${xs + seg} ${y0}`;
  }
  const len = 1400;
  return (
    <svg viewBox="0 0 640 640" width="100%">
      <Blob color={T.accentSoft} />
      {/* 코와 입 옆모습 */}
      <path d="M470 120c30 30 40 70 20 100l-30 10 30 20c-10 30-40 40-70 30" {...S} />
      <path d={d} stroke={T.ink} strokeWidth={8} fill="none" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - progress)} />
      {Array.from(gapSet).map((c) => (
        <rect key={c} x={x0 + c * seg} y={y0 - 12} width={seg} height={24} rx={12} fill={color} opacity={progress > (c + 1) / cycles ? 1 : 0} />
      ))}
      <text x={320} y={470} textAnchor="middle" fontFamily={T.sans} fontSize={24} fontWeight={700} fill={T.ink2}>
        {gaps === 0 ? '고른 숨' : '숨이 멈춘 구간'}
      </text>
    </svg>
  );
};

/* 4. 산소 — 물방울 안의 산소 높이 */
export const OxygenArt: React.FC<{ level: number; color: string }> = ({ level, color }) => {
  const frame = useCurrentFrame();
  const top = 120;
  const bottom = 520;
  const y = bottom - (bottom - top) * level;
  const wave = Math.sin(frame / 12) * 8;
  return (
    <svg viewBox="0 0 640 640" width="100%">
      <Blob color={T.skySoft} />
      <defs>
        <clipPath id="drop">
          <path d="M320 100c-70 100-150 200-150 300a150 150 0 0 0 300 0c0-100-80-200-150-300z" />
        </clipPath>
      </defs>
      <path d="M320 100c-70 100-150 200-150 300a150 150 0 0 0 300 0c0-100-80-200-150-300z" fill={T.paper} />
      <g clipPath="url(#drop)">
        <path d={`M120 ${y + wave} q50 -16 100 0 t100 0 t100 0 t100 0 V600 H120z`} fill={color} opacity={0.85} />
        <circle cx="260" cy={y + 90} r="10" fill={T.paper} opacity=".7" />
        <circle cx="360" cy={y + 140} r="7" fill={T.paper} opacity=".7" />
      </g>
      <path d="M320 100c-70 100-150 200-150 300a150 150 0 0 0 300 0c0-100-80-200-150-300z" {...S} />
      {[95, 90].map((v) => {
        const yy = bottom - (bottom - top) * ((v - 70) / 30);
        return (
          <g key={v}>
            <line x1="485" x2="530" y1={yy} y2={yy} stroke={T.ink} strokeWidth={4} strokeDasharray="8 8" />
            <text x="540" y={yy + 8} fontFamily={T.sans} fontSize={22} fontWeight={700} fill={T.ink2}>
              {v}%
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/* 5. 자세 — 바로 누운 사람 vs 옆으로 누운 사람 */
export const PositionArt: React.FC<{ highlight: 'supine' | 'side' | 'none' }> = ({ highlight }) => (
  <svg viewBox="0 0 640 640" width="100%">
    <Blob color={T.sageSoft} />
    {/* 바로 누움 */}
    <g transform="translate(60 120)" opacity={highlight === 'side' ? 0.35 : 1}>
      <rect x="0" y="110" width="520" height="56" rx="20" fill={T.paper} stroke={T.ink} strokeWidth={7} />
      <circle cx="90" cy="80" r="36" fill={T.paper} stroke={T.ink} strokeWidth={7} />
      <path d="M126 96c60-30 180-30 300 0" fill={highlight === 'supine' ? T.accentSoft : T.skySoft} stroke={T.ink} strokeWidth={7} strokeLinejoin="round" />
      {/* 좁아진 숨길 */}
      <path d="M96 52c10-16 14-10 20 0s10 16 20 0" stroke={highlight === 'supine' ? T.clay : T.ink2} strokeWidth={5} fill="none" strokeLinecap="round" />
      <text x="0" y="16" fontFamily={T.sans} fontSize={24} fontWeight={700} fill={T.ink2}>바로 누울 때</text>
    </g>
    {/* 옆으로 누움 */}
    <g transform="translate(60 350)" opacity={highlight === 'supine' ? 0.35 : 1}>
      <rect x="0" y="110" width="520" height="56" rx="20" fill={T.paper} stroke={T.ink} strokeWidth={7} />
      <circle cx="90" cy="76" r="36" fill={T.paper} stroke={T.ink} strokeWidth={7} />
      <path d="M126 100c40-50 130-60 200-40s90 40 100 50" fill={T.sageSoft} stroke={T.ink} strokeWidth={7} strokeLinejoin="round" />
      <path d="M72 80q18 8 36 0" stroke={T.sage} strokeWidth={5} fill="none" strokeLinecap="round" />
      <text x="0" y="16" fontFamily={T.sans} fontSize={24} fontWeight={700} fill={T.ink2}>옆으로 잘 때</text>
    </g>
  </svg>
);

/* 6. 잠의 질 — 층층이 쌓인 잠 (얕은 잠 / 깊은 잠 / 렘) */
export const StagesArt: React.FC<{ n3: number | null; rem: number | null; n3color: string; remcolor: string }> = ({ n3, rem, n3color, remcolor }) => {
  const total = 360;
  const remH = rem == null ? 60 : Math.max(24, (rem / 100) * total * 1.8);
  const n3H = n3 == null ? 60 : Math.max(24, (n3 / 100) * total * 1.8);
  const lightH = Math.max(40, total - remH - n3H);
  const y0 = 140;
  const rows = [
    { label: '렘수면 · 꿈', h: remH, color: rem == null ? T.line : remcolor },
    { label: '얕은 잠', h: lightH, color: T.line },
    { label: '깊은 잠 · 회복', h: n3H, color: n3 == null ? T.line : n3color },
  ];
  let y = y0;
  return (
    <svg viewBox="0 0 640 640" width="100%">
      <Blob color={T.sandSoft} />
      <Moon x={520} y={110} r={34} />
      {rows.map((r) => {
        const yy = y;
        y += r.h + 10;
        return (
          <g key={r.label}>
            <rect x="120" y={yy} width="340" height={r.h} rx="18" fill={r.color} stroke={T.ink} strokeWidth={6} />
            <text x="140" y={yy + r.h / 2 + 9} fontFamily={T.sans} fontSize={24} fontWeight={700} fill={T.ink}>
              {r.label}
            </text>
          </g>
        );
      })}
      <path d="M110 540h360" stroke={T.ink} strokeWidth={7} strokeLinecap="round" />
    </svg>
  );
};

/* 7. 낮 — 책상에서 조는 사람과 해 */
export const DaytimeArt: React.FC = () => {
  const frame = useCurrentFrame();
  const nod = Math.sin(frame / 14) * 4;
  return (
    <svg viewBox="0 0 640 640" width="100%">
      <Blob color={T.sandSoft} />
      <circle cx="500" cy="140" r="52" fill={T.sand} stroke={T.ink} strokeWidth={6} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line key={a} x1={500 + Math.cos((a * Math.PI) / 180) * 70} y1={140 + Math.sin((a * Math.PI) / 180) * 70} x2={500 + Math.cos((a * Math.PI) / 180) * 86} y2={140 + Math.sin((a * Math.PI) / 180) * 86} stroke={T.ink} strokeWidth={6} strokeLinecap="round" />
      ))}
      {/* 책상 */}
      <rect x="70" y="440" width="500" height="26" rx="10" fill={T.ink} />
      <rect x="380" y="380" width="70" height="60" rx="12" fill={T.paper} stroke={T.ink} strokeWidth={6} />
      <path d="M450 395h22a12 12 0 0 1 0 30h-22" {...thin} />
      {/* 사람: 팔에 기댄 머리 */}
      <g transform={`translate(0 ${nod})`}>
        <circle cx="220" cy="330" r="48" fill={T.paper} stroke={T.ink} strokeWidth={7} />
        <path d="M200 338q10 8 20 0M232 338q10 8 20 0" {...thin} />
        <path d="M160 440c0-50 30-70 60-70h60c30 0 50 20 50 70" fill={T.accentSoft} stroke={T.ink} strokeWidth={7} />
      </g>
      <text x="300" y="300" fontFamily={T.sans} fontSize={34} fontWeight={900} fill={T.accent}>z</text>
      <text x="330" y="270" fontFamily={T.sans} fontSize={42} fontWeight={900} fill={T.accent}>z</text>
    </svg>
  );
};

/* 8. 선택지 — 네 가지 도구 */
export const OptionsArt: React.FC<{ active: Set<number> }> = ({ active }) => {
  const cell = (n: number, x: number, y: number, color: string, icon: React.ReactNode) => {
    const on = active.size === 0 || active.has(n);
    return (
      <g key={n} transform={`translate(${x} ${y})`} opacity={on ? 1 : 0.28}>
        <rect x="-110" y="-110" width="220" height="220" rx="40" fill={on && active.has(n) ? color : T.paper} stroke={T.ink} strokeWidth={6} />
        {icon}
      </g>
    );
  };
  return (
    <svg viewBox="0 0 640 640" width="100%">
      <Blob color={T.accentSoft} />
      {cell(1, 200, 200, T.skySoft, (
        <>
          {/* 양압기 마스크 + 관 */}
          <path d="M-60 10c0-40 30-60 60-60s60 20 60 60-30 50-60 50-60-10-60-50z" {...S} />
          <path d="M0 60v30c0 20 20 30 40 30h30" {...S} />
          <circle cx="-22" cy="0" r="6" fill={T.ink} />
          <circle cx="22" cy="0" r="6" fill={T.ink} />
        </>
      ))}
      {cell(2, 440, 200, T.sageSoft, (
        <>
          {/* 코 옆모습 + 열린 길 */}
          <path d="M-20-70c30 30 40 70 20 100l-30 10 30 20c-10 30-40 40-70 30" {...S} />
          <path d="M30 20l40 0M56 6l14 14-14 14" {...thin} />
        </>
      ))}
      {cell(3, 200, 440, T.sandSoft, (
        <>
          {/* 베개 위 옆으로 누운 사람 */}
          <rect x="-80" y="20" width="160" height="40" rx="18" fill={T.paper} stroke={T.ink} strokeWidth={6} />
          <circle cx="-40" cy="-6" r="24" fill={T.paper} stroke={T.ink} strokeWidth={6} />
          <path d="M-14 10c30-30 80-30 90 10" {...S} />
        </>
      ))}
      {cell(4, 440, 440, T.accentSoft, (
        <>
          {/* 마우스피스 */}
          <path d="M-70-10c0-30 30-40 70-40s70 10 70 40c0 30-30 50-70 50s-70-20-70-50z" {...S} />
          <path d="M-70-10c30 12 110 12 140 0" {...thin} />
          <path d="M-36-30v22M0-34v26M36-30v22" {...thin} />
        </>
      ))}
    </svg>
  );
};

/* 9. 아웃트로 — 체크리스트가 있는 클립보드 */
export const OutroArt: React.FC<{ checked: number }> = ({ checked }) => (
  <svg viewBox="0 0 640 640" width="100%">
    <Blob color={T.sageSoft} />
    <rect x="150" y="110" width="340" height="440" rx="28" fill={T.paper} stroke={T.ink} strokeWidth={7} />
    <rect x="260" y="84" width="120" height="50" rx="16" fill={T.accent} stroke={T.ink} strokeWidth={6} />
    {[0, 1, 2].map((i) => {
      const y = 210 + i * 100;
      const on = i < checked;
      return (
        <g key={i}>
          <rect x="190" y={y - 22} width="44" height="44" rx="12" fill={on ? T.accent : T.paper} stroke={T.ink} strokeWidth={6} />
          {on && <path d={`M200 ${y}l10 10 20-22`} stroke={T.paper} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
          <rect x="256" y={y - 8} width={160 - i * 30} height="16" rx="8" fill={on ? T.ink : T.line} />
        </g>
      );
    })}
    {/* 청진기 */}
    <path d="M470 470c40 0 60-30 60-70v-60" {...S} />
    <circle cx="470" cy="470" r="20" fill={T.accentSoft} stroke={T.ink} strokeWidth={7} />
  </svg>
);
