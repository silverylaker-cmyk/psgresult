import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { RMI_MAX, getSeverity, metricById, rmiColor, rmiLabel } from '../../psg/metrics';
import { isPositional } from '../../psg/script';
import type { PsgValues } from '../../psg/types';
import { AnimatedNumber, Eyebrow, Headline, NA, Rise, SceneFrame, T, clamp, sev } from '../ui';
import { sentenceStartFrame } from '../timing';
import type { SceneProps } from './IntroOutro';

export const PositionScene: React.FC<SceneProps & { values: PsgValues }> = ({ index, total, narration, values }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const rows = [
    { key: 'rmiSupine', label: '바로 누울 때', v: values.rmiSupine },
    { key: 'rmiLeft', label: '왼쪽으로 잘 때', v: values.rmiLeft },
    { key: 'rmiRight', label: '오른쪽으로 잘 때', v: values.rmiRight },
  ];
  const barsAt = sentenceStartFrame(narration, /이었습니다|읽지 못했/, durationInFrames, fps) ?? 70;
  const noteAt = sentenceStartFrame(narration, /더 불안정|낮은 편|비슷하게|읽지 못했/, durationInFrames, fps);
  const snoreAt = sentenceStartFrame(narration, '코골이는', durationInFrames, fps);
  const positional = isPositional(values);
  const snoreZone = getSeverity(metricById('snorepct')!, values.snorepct);
  const noteOp = noteAt == null ? 0 : interpolate(frame, [noteAt, noteAt + 15], [0, 1], clamp);
  const allNull = rows.every((r) => r.v == null);

  return (
    <SceneFrame index={index} total={total}>
      <div style={{ position: 'absolute', top: 120, left: 0, right: 0 }}>
        <Rise at={0}>
          <Eyebrow>자세에 따라</Eyebrow>
          <Headline style={{ marginTop: 12 }}>호흡은 얼마나 달라졌나요.</Headline>
          <div style={{ marginTop: 10, fontSize: 30, color: T.ink2, fontWeight: 500 }}>자세별 호흡 불안정 지수 (RMI) · 낮을수록 안정적</div>
        </Rise>

        <div style={{ marginTop: 60, display: 'flex', flexDirection: 'column', gap: 26 }}>
          {rows.map((r, i) => {
            const p = spring({ frame: frame - (barsAt + i * 14), fps, config: { damping: 20, stiffness: 70 } });
            const pct = r.v == null ? 0 : Math.min(100, (r.v / RMI_MAX) * 100) * p;
            const c = sev(rmiColor(r.v));
            const dim = positional && r.key !== 'rmiSupine' && noteOp > 0;
            return (
              <Rise key={r.key} at={barsAt + i * 14}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 40, opacity: dim ? 0.4 : 1 }}>
                  <div style={{ width: 330, fontSize: 38, fontWeight: 700, color: T.ink, letterSpacing: -0.5 }}>{r.label}</div>
                  <div style={{ flex: 1, height: 22, borderRadius: 4, background: T.line, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: r.v == null ? T.line : c }} />
                  </div>
                  <div style={{ width: 300, display: 'flex', alignItems: 'baseline', gap: 14, justifyContent: 'flex-end' }}>
                    {r.v == null ? (
                      <NA size={30} />
                    ) : (
                      <>
                        <span style={{ fontSize: 64, fontWeight: 900, color: c, lineHeight: 1, letterSpacing: -2 }}>
                          <AnimatedNumber value={r.v} at={barsAt + i * 14} duration={40} />
                        </span>
                        <span style={{ fontSize: 24, fontWeight: 700, color: T.ink2 }}>{rmiLabel(r.v)}</span>
                      </>
                    )}
                  </div>
                </div>
              </Rise>
            );
          })}
        </div>

        <div style={{ marginTop: 56, opacity: noteOp, fontSize: 34, fontWeight: 700, color: T.ink }}>
          {positional
            ? '바로 누울 때 더 심합니다. 옆으로 자면 줄어드는 경우가 있어, 자세 교정이 치료 후보 중 하나입니다.'
            : allNull
              ? '자세별 수치는 진료실에서 직접 확인해 드립니다.'
              : rows.every((r) => r.v == null || r.v < 20)
                ? '어느 자세에서도 호흡 불안정은 낮은 편이었습니다.'
                : '자세와 관계없이 비슷하게 나타났습니다.'}
        </div>

        {values.snorepct != null && (
          <Rise at={snoreAt ?? barsAt + 120}>
            <div style={{ marginTop: 24, fontSize: 30, fontWeight: 500, color: T.ink2, display: 'flex', alignItems: 'baseline', gap: 10 }}>
              코골이는 잠자는 시간의
              <span style={{ fontSize: 48, fontWeight: 900, color: sev(snoreZone?.c), letterSpacing: -1 }}>
                <AnimatedNumber value={values.snorepct} at={snoreAt ?? barsAt + 120} decimals={0} />%
              </span>
              동안 있었습니다{snoreZone && snoreZone.l !== '정상' ? ' — 숨길이 좁아졌다는 신호입니다.' : '.'}
            </div>
          </Rise>
        )}
      </div>
    </SceneFrame>
  );
};
