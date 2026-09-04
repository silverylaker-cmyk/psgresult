import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { RMI_MAX, getSeverity, metricById, rmiColor, rmiLabel } from '../../psg/metrics';
import { isPositional } from '../../psg/script';
import type { PsgValues } from '../../psg/types';
import { AnimatedNumber, Badge, Card, NA, Rise, SceneFrame, T, clamp } from '../ui';
import { sentenceStartFrame } from '../timing';
import type { SceneProps } from './IntroOutro';

export const PositionScene: React.FC<SceneProps & { values: PsgValues }> = ({ index, total, title, narration, values }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const rows = [
    { key: 'rmiSupine', label: '바로 누울 때', sub: 'Supine', v: values.rmiSupine },
    { key: 'rmiLeft', label: '왼쪽으로 잘 때', sub: 'Left', v: values.rmiLeft },
    { key: 'rmiRight', label: '오른쪽으로 잘 때', sub: 'Right', v: values.rmiRight },
  ];
  const barsAt = sentenceStartFrame(narration, /이었습니다|읽지 못했/, durationInFrames, fps) ?? 60;
  const noteAt = sentenceStartFrame(narration, /더 불안정|낮은 편|비슷하게|읽지 못했/, durationInFrames, fps);
  const snoreAt = sentenceStartFrame(narration, '코골이는', durationInFrames, fps);
  const positional = isPositional(values);
  const snoreZone = getSeverity(metricById('snorepct')!, values.snorepct);
  const noteOp = noteAt == null ? 0 : interpolate(frame, [noteAt, noteAt + 15], [0, 1], clamp);

  return (
    <SceneFrame title={title} subtitle="자세별 호흡 불안정 지수 (RMI) · 낮을수록 안정적" index={index} total={total}>
      <div style={{ display: 'flex', gap: 40 }}>
        <Rise at={barsAt - 10} style={{ flex: 1 }}>
          <Card style={{ height: 620, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 34 }}>
            {rows.map((r, i) => {
              const p = spring({ frame: frame - (barsAt + i * 14), fps, config: { damping: 18, stiffness: 80 } });
              const pct = r.v == null ? 0 : Math.min(100, (r.v / RMI_MAX) * 100) * p;
              const c = rmiColor(r.v);
              const highlight = positional && r.key === 'rmiSupine' && noteOp > 0;
              return (
                <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <div style={{ width: 250 }}>
                    <div style={{ fontSize: 30, fontWeight: 700, color: T.navy }}>{r.label}</div>
                    <div style={{ fontSize: 20, color: '#9aa5ad' }}>{r.sub}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 40, borderRadius: 20, background: '#eef2f4', overflow: 'hidden', outline: highlight ? `4px solid ${c}` : 'none', outlineOffset: 3 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: c, borderRadius: 20 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, color: '#b0b8be', marginTop: 4 }}>
                      <span>0</span>
                      <span>20</span>
                      <span>35</span>
                      <span>60</span>
                    </div>
                  </div>
                  <div style={{ width: 170, textAlign: 'right' }}>
                    {r.v == null ? (
                      <NA />
                    ) : (
                      <>
                        <div style={{ fontSize: 46, fontWeight: 900, color: c, lineHeight: 1 }}>
                          <AnimatedNumber value={r.v} at={barsAt + i * 14} duration={40} />
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <Badge color={c} size={20}>{rmiLabel(r.v)}</Badge>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            <div style={{ opacity: noteOp, background: positional ? '#fff3e6' : '#e6f1f3', borderRadius: 18, padding: '18px 26px', fontSize: 26, fontWeight: 700, color: positional ? '#b4540f' : T.navy }}>
              {positional
                ? '바로 누울 때 더 심함 → 옆으로 자면 줄어드는 경우가 있습니다 (치료 후보 중 하나)'
                : rows.every((r) => r.v == null)
                  ? '자세별 수치는 진료실에서 직접 확인해 드립니다.'
                  : rows.every((r) => r.v == null || r.v < 20)
                    ? '어느 자세에서도 호흡 불안정은 낮은 편이었습니다.'
                    : '자세와 관계없이 비슷하게 나타났습니다.'}
            </div>
          </Card>
        </Rise>

        {values.snorepct != null && (
          <Rise at={snoreAt ?? barsAt + 90} style={{ flex: '0 0 460px' }}>
            <Card style={{ height: 620, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: T.navy }}>코골이 시간</div>
              <Donut value={values.snorepct} at={snoreAt ?? barsAt + 90} color={snoreZone?.c ?? T.teal} label="수면 시간 대비" />
              {snoreZone && <Badge color={snoreZone.c} size={26}>{snoreZone.l}</Badge>}
              <div style={{ fontSize: 22, color: T.gray, textAlign: 'center', lineHeight: 1.5 }}>코골이 자체도 숨길이<br />좁아졌다는 신호입니다</div>
            </Card>
          </Rise>
        )}
      </div>
    </SceneFrame>
  );
};

export const Donut: React.FC<{ value: number; at: number; color: string; label?: string; size?: number; max?: number }> = ({
  value,
  at,
  color,
  label,
  size = 300,
  max = 100,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - at, fps, config: { damping: 18, stiffness: 70 } });
  const r = size / 2 - 22;
  const circ = 2 * Math.PI * r;
  const frac = Math.min(1, value / max) * p;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#eef2f4" strokeWidth={30} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={30} fill="none" strokeLinecap="round" strokeDasharray={`${circ * frac} ${circ}`} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: size * 0.24, fontWeight: 900, color, lineHeight: 1 }}>
          <AnimatedNumber value={value} at={at} decimals={0} />%
        </div>
        {label && <div style={{ fontSize: size * 0.07, color: T.gray, marginTop: 6 }}>{label}</div>}
      </div>
    </div>
  );
};
