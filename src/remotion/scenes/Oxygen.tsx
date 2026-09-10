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
    <SceneFrame index={index} total={total} art={<ArtImage name={ART_FILES.oxygen} fallback={<OxygenArt level={level} color={color} />} />} split={0.56}>
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
