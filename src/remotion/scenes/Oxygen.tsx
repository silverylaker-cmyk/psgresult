import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, getSeverity, metricById } from '../../psg/metrics';
import type { PsgValues } from '../../psg/types';
import { BigNumber, Body, Eyebrow, Headline, NA, Pill, Rise, SceneFrame, SegmentScale, T, clamp, sev } from '../ui';
import { OxygenArt } from '../illustrations';
import { ART_FILES, ArtImage } from '../art';
import { sentenceStartFrame } from '../timing';
import type { SceneProps } from './IntroOutro';

const SEGMENTS = [
  { from: 70, to: 82, color: sev(C.severe), label: '심함' },
  { from: 82, to: 88, color: sev(C.moderate), label: '중간' },
  { from: 88, to: 92, color: sev(C.mild), label: '가벼움' },
  { from: 92, to: 100, color: sev(C.good), label: '정상' },
];
const LABEL: Record<string, string> = { '중증 저하': '심함', '중등도 저하': '중간', '경증 저하': '가벼움', 정상: '정상' };

/**
 * 산소포화도 추이 모션 그래픽. 평소(96%)에서 시작해 여러 번 내려갔다 올라오며, 가장 깊은 골이 환자의 최저값에 닿는다.
 * progress 0→1 동안 선이 왼쪽에서 오른쪽으로 그려지고, 선 끝에 현재 값이 따라다닌다.
 */
const OxygenTrace: React.FC<{ lowest: number | null; color: string; progress: number }> = ({ lowest, color, progress }) => {
  const W = 420;
  const H = 300;
  const padL = 70;
  const padR = 16;
  const top = 34;
  const bottom = 250;
  const yOf = (v: number) => top + ((100 - v) / 30) * (bottom - top);
  const low = lowest == null ? 96 : Math.max(70, Math.min(96, lowest));
  // 골 깊이 (평소 96 기준): 얕은 골 몇 개와 가장 깊은 골 하나
  const dips = lowest == null ? [] : [0.25, 0.45, 1, 0.6, 0.35].map((d) => 96 - (96 - low) * d);
  const n = 60;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let v = 96;
    dips.forEach((dv, k) => {
      const c = (k + 0.5) / dips.length;
      const w = 0.055;
      const g = Math.exp(-((t - c) * (t - c)) / (2 * w * w));
      v = Math.min(v, 96 - (96 - dv) * g);
    });
    pts.push([padL + t * (W - padL - padR), yOf(v)]);
  }
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const len = 1200;
  const headIdx = Math.min(n, Math.round(progress * n));
  const [hx, hy] = pts[headIdx];
  const headVal = Math.round(100 - ((hy - top) / (bottom - top)) * 30);
  const minSoFar = Math.round(100 - ((Math.max(...pts.slice(0, headIdx + 1).map((p) => p[1])) - top) / (bottom - top)) * 30);
  const dropping = progress > 0 && progress < 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
      {/* 눈금: 100 / 90 / 80 / 70 */}
      {[100, 90, 80, 70].map((v) => (
        <g key={v}>
          <line x1={padL} x2={W - padR} y1={yOf(v)} y2={yOf(v)} stroke={T.line} strokeWidth={v === 90 ? 3 : 2} strokeDasharray={v === 90 ? '8 8' : undefined} />
          <text x={padL - 12} y={yOf(v) + 8} textAnchor="end" fontFamily={T.sans} fontSize={20} fontWeight={700} fill={v === 90 ? T.clay : T.ink3}>
            {v}
          </text>
        </g>
      ))}
      <text x={padL} y={bottom + 34} fontFamily={T.sans} fontSize={19} fontWeight={700} fill={T.ink3}>
        잠든 뒤
      </text>
      <text x={W - padR} y={bottom + 34} textAnchor="end" fontFamily={T.sans} fontSize={19} fontWeight={700} fill={T.ink3}>
        아침
      </text>
      {/* 90 아래로 내려간 부분 강조 (선 아래 면) */}
      <clipPath id="oxy-below90">
        <rect x={0} y={yOf(90)} width={progress * W} height={H} />
      </clipPath>
      <path d={`${d} L${pts[n][0]} ${bottom} L${padL} ${bottom} Z`} fill={color} opacity={0.18} clipPath="url(#oxy-below90)" />
      {/* 선 */}
      <path d={d} stroke={T.ink} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - progress)} />
      {/* 선 끝 마커 + 현재 값 */}
      {progress > 0 && (
        <g>
          <circle cx={hx} cy={hy} r={dropping ? 11 : 9} fill={headVal < 90 ? color : T.sage} stroke={T.paper} strokeWidth={4} />
          <text x={Math.min(hx, W - padR - 40)} y={hy - 20} textAnchor="middle" fontFamily={T.sans} fontSize={26} fontWeight={900} fill={headVal < 90 ? color : T.ink}>
            {headVal}%
          </text>
        </g>
      )}
      {/* 최저점 표시 */}
      {lowest != null && progress >= 0.5 && (
        <g>
          <line x1={padL} x2={W - padR} y1={yOf(low)} y2={yOf(low)} stroke={color} strokeWidth={2} strokeDasharray="4 6" opacity={0.7} />
          <text x={W - padR} y={yOf(low) + 30} textAnchor="end" fontFamily={T.sans} fontSize={22} fontWeight={900} fill={color}>
            최저 {minSoFar}%
          </text>
        </g>
      )}
    </svg>
  );
};

export const OxygenScene: React.FC<SceneProps & { values: PsgValues }> = ({ index, total, narration, values }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const spo2 = values.lowestspo2;
  const zone = getSeverity(metricById('lowestspo2')!, spo2);
  const color = sev(zone?.c);
  const label = zone ? LABEL[zone.l] : undefined;

  const valueAt = sentenceStartFrame(narration, '환자분은', durationInFrames, fps) ?? sentenceStartFrame(narration, '읽지 못했', durationInFrames, fps) ?? 120;
  const noteAt = sentenceStartFrame(narration, /잘 유지|살짝 내려|포인트|읽지 못했/, durationInFrames, fps) ?? valueAt + 60;

  // 물방울 산소 높이: 100%에서 시작해 환자 값까지 내려간다
  const p = interpolate(frame, [valueAt, valueAt + 60], [0, 1], clamp);
  const shown = spo2 == null ? 100 : 100 - (100 - Math.max(70, spo2)) * p;
  const level = (shown - 70) / 30;

  return (
    <SceneFrame
      index={index}
      total={total}
      split={0.56}
      art={
        <ArtImage name={ART_FILES.oxygen} fallback={<OxygenArt level={level} color={color} />}>
          {/* 밤새 산소포화도가 떨어지는 모션 그래픽: 물방울 오른쪽 아래 빈 공간에 */}
          <div style={{ position: 'absolute', left: '62%', width: '36%', top: '55%', height: '30%' }}>
            <OxygenTrace lowest={spo2} color={color} progress={interpolate(frame, [valueAt, valueAt + 110], [0, 1], clamp)} />
          </div>
        </ArtImage>
      }
    >
      <Rise at={0}>
        <Eyebrow>숨이 막히면</Eyebrow>
        <Headline size={72} style={{ marginTop: 12 }}>피 속 산소가 내려갑니다.</Headline>
      </Rise>
      <Rise at={20}>
        <Body size={26} style={{ marginTop: 16, maxWidth: 820 }}>
          깨어 있을 때는 보통 <b style={{ color: T.ink }}>95% 이상</b>. <b style={{ color: T.ink }}>90% 아래</b>로 자주 떨어지면 심장과 혈관이 밤마다 비상 상황을 겪습니다.
        </Body>
      </Rise>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 40, marginTop: 28 }}>
        <Rise at={valueAt - 6}>
          <Body size={22} style={{ marginBottom: 6 }}>가장 낮을 때</Body>
          {spo2 == null ? <NA /> : <BigNumber value={spo2} at={valueAt} decimals={0} unit="%" size={150} color={color} />}
        </Rise>
        {label && (
          <div style={{ paddingBottom: 12 }}>
            <Pill color={color} size={28} at={valueAt + 30}>
              {label}
            </Pill>
          </div>
        )}
      </div>

      <Rise at={valueAt + 10}>
        <div style={{ marginTop: 30, maxWidth: 900 }}>
          <SegmentScale segments={SEGMENTS} min={70} max={100} value={spo2} activeLabel={label} at={valueAt} ticks={[{ v: 70 }, { v: 82 }, { v: 88 }, { v: 92 }, { v: 100 }]} height={22} />
        </div>
      </Rise>

      <Rise at={noteAt}>
        <Body size={26} strong style={{ marginTop: 22 }}>
          {spo2 == null
            ? '최저 산소포화도는 진료실에서 직접 확인해 드립니다.'
            : label === '정상'
              ? '밤새 산소는 잘 유지되었습니다.'
              : label === '가벼움'
                ? '잠깐 살짝 내려가는 정도였습니다.'
                : `평소보다 ${Math.max(0, Math.round(95 - spo2))}포인트 낮은 수치. 몸이 산소 부족을 느꼈을 순간이 있었습니다.`}
        </Body>
      </Rise>
    </SceneFrame>
  );
};
