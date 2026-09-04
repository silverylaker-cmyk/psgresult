import React from 'react';
import { useVideoConfig } from 'remotion';
import { C } from '../../psg/metrics';
import { ahiSeverity } from '../../psg/script';
import type { PsgValues } from '../../psg/types';
import { BigNumber, Eyebrow, Headline, NA, Pill, Rise, SceneFrame, SegmentScale, T, sev } from '../ui';
import { sentenceStartFrame } from '../timing';
import type { SceneProps } from './IntroOutro';

/** 환자용 영상은 표준 기준(5 / 15 / 30)을 쓴다. 표시 상한 40. */
export const AHI_SEGMENTS = [
  { from: 0, to: 5, color: sev(C.good), label: '정상' },
  { from: 5, to: 15, color: sev(C.mild), label: '경증' },
  { from: 15, to: 30, color: sev(C.moderate), label: '중등도' },
  { from: 30, to: 40, color: sev(C.severe), label: '중증' },
];
const LABEL = { normal: '정상', mild: '경증', moderate: '중등도', severe: '중증', unknown: '' } as const;

export const AhiScene: React.FC<SceneProps & { values: PsgValues }> = ({ index, total, narration, values }) => {
  const { durationInFrames, fps } = useVideoConfig();
  const ahi = values.ahi;
  const label = LABEL[ahiSeverity(ahi)];
  const seg = AHI_SEGMENTS.find((s) => s.label === label);

  const zonesAt = sentenceStartFrame(narration, '5회 미만', durationInFrames, fps) ?? 50;
  const valueAt = sentenceStartFrame(narration, '환자분의', durationInFrames, fps) ?? sentenceStartFrame(narration, '읽지 못했', durationInFrames, fps) ?? 130;
  const noteAt = sentenceStartFrame(narration, /한 시간에 약|진료실에서 직접/, durationInFrames, fps) ?? valueAt + 60;

  return (
    <SceneFrame index={index} total={total}>
      <div style={{ position: 'absolute', top: 120, left: 0, right: 0 }}>
        <Rise at={0}>
          <Eyebrow>기억할 숫자는 하나</Eyebrow>
          <Headline style={{ marginTop: 12 }}>AHI</Headline>
          <div style={{ marginTop: 10, fontSize: 30, color: T.ink2, fontWeight: 500 }}>잠든 한 시간 동안 숨이 멈추거나 매우 얕아진 평균 횟수</div>
        </Rise>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 60, marginTop: 50 }}>
          <Rise at={valueAt - 6}>
            {ahi == null ? (
              <div style={{ height: 240, display: 'flex', alignItems: 'flex-end' }}>
                <NA />
              </div>
            ) : (
              <BigNumber value={ahi} at={valueAt} decimals={1} unit="회 / 시간" size={260} color={seg?.color ?? T.ink} />
            )}
          </Rise>
          {seg && (
            <div style={{ paddingBottom: 18 }}>
              <Pill color={seg.color} size={34} at={valueAt + 30}>
                {seg.label}
              </Pill>
            </div>
          )}
        </div>

        <Rise at={zonesAt}>
          <div style={{ marginTop: 60 }}>
            <SegmentScale segments={AHI_SEGMENTS} max={40} value={ahi} activeLabel={label} at={valueAt} ticks={[{ v: 0 }, { v: 5 }, { v: 15 }, { v: 30 }, { v: 40, text: '40+' }]} />
          </div>
        </Rise>

        <Rise at={noteAt}>
          <div style={{ marginTop: 40, fontSize: 34, fontWeight: 700, color: T.ink }}>
            {ahi == null ? 'AHI는 진료실에서 직접 확인해 드립니다.' : `한 시간에 약 ${Math.round(ahi)}번, 숨이 얕아지거나 멈췄다는 뜻입니다.`}
          </div>
        </Rise>
      </div>
    </SceneFrame>
  );
};
