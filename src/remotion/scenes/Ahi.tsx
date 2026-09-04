import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, faceExpr } from '../../psg/metrics';
import { ahiSeverity } from '../../psg/script';
import type { PsgValues } from '../../psg/types';
import { AnimatedNumber, Badge, Card, Face, NA, Rise, SceneFrame, T, clamp } from '../ui';
import { sentenceStartFrame } from '../timing';
import type { SceneProps } from './IntroOutro';

/** 환자용 영상은 표준 기준(5 / 15 / 30)을 쓴다. 표시 상한 40. */
const ZONES = [
  { from: 0, to: 5, c: C.good, l: '정상', desc: '5회 미만' },
  { from: 5, to: 15, c: C.mild, l: '경증', desc: '5–15회' },
  { from: 15, to: 30, c: C.moderate, l: '중등도', desc: '15–30회' },
  { from: 30, to: 40, c: C.severe, l: '중증', desc: '30회 이상' },
];
const MAX = 40;

export const AhiScene: React.FC<SceneProps & { values: PsgValues }> = ({ index, total, title, narration, values }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const ahi = values.ahi;
  const sev = ahiSeverity(ahi);
  const zone = ZONES.find((z) => z.l === { normal: '정상', mild: '경증', moderate: '중등도', severe: '중증', unknown: '' }[sev]);

  const zonesAt = sentenceStartFrame(narration, '5회 미만', durationInFrames, fps) ?? 40;
  const valueAt = sentenceStartFrame(narration, '환자분의', durationInFrames, fps) ?? sentenceStartFrame(narration, '읽지 못했', durationInFrames, fps) ?? 120;

  const markerP = spring({ frame: frame - valueAt, fps, config: { damping: 16, stiffness: 70, mass: 1 } });
  const pct = ahi == null ? 0 : (Math.min(MAX, ahi) / MAX) * 100 * markerP;
  const badgeOp = interpolate(frame, [valueAt + 40, valueAt + 55], [0, 1], clamp);
  const noteAt = sentenceStartFrame(narration, /한 시간에 약|진료실에서 직접/, durationInFrames, fps);
  const noteOp = noteAt == null ? 0 : interpolate(frame, [noteAt, noteAt + 15], [0, 1], clamp);
  const note =
    ahi == null
      ? 'AHI 는 진료실에서 직접 확인해 드립니다.'
      : `한 시간에 약 ${Math.round(ahi)}번, 숨이 얕아지거나 멈췄다는 뜻입니다.`;

  return (
    <SceneFrame title={title} subtitle="잠든 한 시간 동안 숨이 멈추거나 매우 얕아진 평균 횟수" index={index} total={total}>
      {/* 구간 설명 카드 4개 */}
      <div style={{ display: 'flex', gap: 22 }}>
        {ZONES.map((z, i) => {
          const active = zone?.l === z.l && frame >= valueAt + 30;
          return (
            <Rise key={z.l} at={zonesAt + i * 9} style={{ flex: 1 }}>
              <Card
                accent={active ? z.c : undefined}
                style={{ padding: '22px 28px', display: 'flex', alignItems: 'center', gap: 20, background: active ? `${z.c}12` : T.card }}
              >
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: z.c, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: T.navy }}>{z.desc}</div>
                  <div style={{ fontSize: 24, color: z.c, fontWeight: 700 }}>{z.l}</div>
                </div>
              </Card>
            </Rise>
          );
        })}
      </div>

      {/* 큰 숫자 + 스케일 */}
      <Rise at={valueAt - 6}>
        <Card style={{ marginTop: 30, padding: '30px 48px 36px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 34 }}>
            <div style={{ fontSize: 28, color: T.gray, fontWeight: 500, paddingBottom: 14 }}>환자분의 AHI</div>
            {ahi == null ? (
              <div style={{ paddingBottom: 16 }}>
                <NA />
              </div>
            ) : (
              <>
                <div style={{ fontSize: 112, fontWeight: 900, lineHeight: 1, color: zone?.c ?? T.navy, letterSpacing: -3 }}>
                  <AnimatedNumber value={ahi} at={valueAt} duration={50} />
                </div>
                <div style={{ fontSize: 30, color: T.gray, paddingBottom: 14 }}>회 / 시간</div>
                <div style={{ marginLeft: 'auto', paddingBottom: 12, opacity: badgeOp }}>
                  {zone && <Badge color={zone.c} size={34}>{zone.l}</Badge>}
                </div>
              </>
            )}
          </div>

          <div style={{ position: 'relative', marginTop: 46, height: 36 }}>
            <div style={{ display: 'flex', height: 36, borderRadius: 18, overflow: 'hidden' }}>
              {ZONES.map((z) => (
                <div key={z.l} style={{ width: `${((z.to - z.from) / MAX) * 100}%`, background: z.c }} />
              ))}
            </div>
            {ahi != null && (
              <div style={{ position: 'absolute', top: '50%', left: `${pct}%`, transform: 'translate(-50%,-56%)', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.3))' }}>
                <Face color={zone?.c ?? '#999'} expr={faceExpr(zone?.c)} size={80} />
              </div>
            )}
          </div>
          <div style={{ position: 'relative', height: 34, marginTop: 8 }}>
            {[0, 5, 15, 30, 40].map((v) => (
              <span
                key={v}
                style={{
                  position: 'absolute',
                  left: `${(v / MAX) * 100}%`,
                  transform: 'translateX(-50%)',
                  fontSize: v === 5 || v === 15 || v === 30 ? 28 : 22,
                  fontWeight: v === 5 || v === 15 || v === 30 ? 900 : 500,
                  color: T.gray,
                }}
              >
                {v === 40 ? '40+' : v}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 26, opacity: noteOp, background: '#e6f1f3', borderRadius: 18, padding: '18px 28px', fontSize: 30, fontWeight: 700, color: T.navy, textAlign: 'center' }}>
            {note}
          </div>
        </Card>
      </Rise>
    </SceneFrame>
  );
};
