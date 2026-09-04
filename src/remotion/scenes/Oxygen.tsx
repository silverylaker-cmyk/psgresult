import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, faceExpr, getSeverity, metricById } from '../../psg/metrics';
import type { PsgValues } from '../../psg/types';
import { AnimatedNumber, Badge, Card, Face, Icon, NA, Rise, SceneFrame, T, clamp } from '../ui';
import { sentenceStartFrame } from '../timing';
import type { SceneProps } from './IntroOutro';

const MIN = 70;
const MAX = 100;
const ARCS = [
  { from: 70, to: 82, c: C.severe },
  { from: 82, to: 88, c: C.moderate },
  { from: 88, to: 92, c: C.mild },
  { from: 92, to: 100, c: C.good },
];

/** 반원 게이지: 왼쪽(70%) → 오른쪽(100%) */
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}
const angleOf = (v: number) => Math.PI + ((v - MIN) / (MAX - MIN)) * Math.PI;

export const OxygenScene: React.FC<SceneProps & { values: PsgValues }> = ({ index, total, title, narration, values }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const spo2 = values.lowestspo2;
  const zone = getSeverity(metricById('lowestspo2')!, spo2);

  const infoAt = sentenceStartFrame(narration, '95퍼센트', durationInFrames, fps) ?? 30;
  const valueAt = sentenceStartFrame(narration, '환자분의', durationInFrames, fps) ?? sentenceStartFrame(narration, '읽지 못했', durationInFrames, fps) ?? 110;

  const p = spring({ frame: frame - valueAt, fps, config: { damping: 15, stiffness: 60, mass: 1.1 } });
  const shown = spo2 == null ? MAX : MAX - (MAX - Math.max(MIN, spo2)) * p;
  const ang = angleOf(shown);
  const badgeOp = interpolate(frame, [valueAt + 45, valueAt + 60], [0, 1], clamp);

  const cx = 330;
  const cy = 330;
  const r = 250;

  return (
    <SceneFrame title={title} subtitle="숨이 막히면 피 속 산소가 떨어집니다" index={index} total={total}>
      <div style={{ display: 'flex', gap: 40, alignItems: 'stretch' }}>
        <Rise at={valueAt - 10} style={{ flex: '0 0 760px' }}>
          <Card style={{ height: 620, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: 660, height: 400 }}>
            <svg width={660} height={400} viewBox="0 0 660 400" style={{ position: 'absolute', inset: 0 }}>
              {ARCS.map((a) => (
                <path key={a.c} d={arcPath(cx, cy, r, angleOf(a.from), angleOf(a.to))} stroke={a.c} strokeWidth={44} fill="none" />
              ))}
              {[70, 82, 88, 92, 100].map((v) => {
                const a = angleOf(v);
                const x = cx + (r + 60) * Math.cos(a);
                const y = cy + (r + 60) * Math.sin(a) + 10;
                return (
                  <text key={v} x={x} y={y} textAnchor="middle" fontSize={26} fontWeight={700} fill={T.gray} fontFamily={T.font}>
                    {v}
                  </text>
                );
              })}
              {spo2 != null && (
                <g transform={`translate(${cx + r * Math.cos(ang)}, ${cy + r * Math.sin(ang)})`}>
                  <foreignObject x={-44} y={-44} width={88} height={88}>
                    <div style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.3))' }}>
                      <Face color={zone?.c ?? '#999'} expr={faceExpr(zone?.c)} size={88} />
                    </div>
                  </foreignObject>
                </g>
              )}
            </svg>
            <div style={{ position: 'absolute', left: 0, right: 0, top: cy - 100, textAlign: 'center' }}>
              <div style={{ fontSize: 30, color: T.gray, fontWeight: 500 }}>최저 산소포화도</div>
              {spo2 != null ? (
                <div style={{ fontSize: 120, fontWeight: 900, lineHeight: 1, color: zone?.c ?? T.navy, letterSpacing: -3, marginTop: 6 }}>
                  <AnimatedNumber value={spo2} at={valueAt} duration={55} decimals={0} />%
                </div>
              ) : (
                <div style={{ marginTop: 30 }}>
                  <NA />
                </div>
              )}
            </div>
            </div>
            <div style={{ marginTop: -20, opacity: badgeOp, height: 60 }}>{zone && <Badge color={zone.c} size={32}>{zone.l}</Badge>}</div>
          </Card>
        </Rise>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 26 }}>
          <Rise at={infoAt}>
            <Fact icon="oxygen" color={C.good} big="95% 이상" text="깨어 있을 때의 보통 산소포화도" />
          </Rise>
          <Rise at={infoAt + 16}>
            <Fact icon="heart" color={C.severe} big="90% 아래" text="자주 내려가면 심장과 혈관에 부담" />
          </Rise>
          <Rise at={valueAt + 30}>
            <div style={{ background: '#e6f1f3', borderRadius: 22, padding: '26px 32px', fontSize: 28, lineHeight: 1.5, color: T.navy, fontWeight: 500 }}>
              {spo2 == null
                ? '최저 산소포화도는 진료실에서 직접 확인해 드립니다.'
                : zone?.l === '정상'
                  ? '잠자는 동안에도 산소가 잘 유지되었습니다.'
                  : '잠자는 동안 몸에 들어가는 산소가 부족했던 순간이 있었습니다.'}
            </div>
          </Rise>
        </div>
      </div>
    </SceneFrame>
  );
};

const Fact: React.FC<{ icon: 'oxygen' | 'heart'; color: string; big: string; text: string }> = ({ icon, color, big, text }) => (
  <Card style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '26px 32px' }}>
    <div style={{ width: 96, height: 96, borderRadius: '50%', background: `${color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon name={icon} size={54} color={color} />
    </div>
    <div>
      <div style={{ fontSize: 44, fontWeight: 900, color }}>{big}</div>
      <div style={{ fontSize: 26, color: T.gray, marginTop: 4 }}>{text}</div>
    </div>
  </Card>
);
