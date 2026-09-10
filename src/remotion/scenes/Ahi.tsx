import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { C } from '../../psg/metrics';
import { SEV_WORD, ahiSeverity, hoursText, nightlyEvents } from '../../psg/script';
import type { PsgValues } from '../../psg/types';
import { BigNumber, Body, Eyebrow, Headline, NA, Pill, Rise, SceneFrame, SegmentScale, T, clamp, sev } from '../ui';
import { BreathArt, BreathWave } from '../illustrations';
import { ART_FILES, ArtImage } from '../art';
import { sentenceStartFrame } from '../timing';
import type { SceneProps } from './IntroOutro';

/** 환자용 영상은 표준 기준(5 / 15 / 30)을 쓴다. 표시 상한 40. */
export const AHI_SEGMENTS = [
  { from: 0, to: 5, color: sev(C.good), label: '정상' },
  { from: 5, to: 15, color: sev(C.mild), label: '가벼움' },
  { from: 15, to: 30, color: sev(C.moderate), label: '중간' },
  { from: 30, to: 40, color: sev(C.severe), label: '심함' },
];
const SEG_LABEL = { normal: '정상', mild: '가벼움', moderate: '중간', severe: '심함', unknown: '' } as const;
const GAPS = { normal: 0, mild: 1, moderate: 2, severe: 4, unknown: 0 } as const;

export const AhiScene: React.FC<SceneProps & { values: PsgValues }> = ({ index, total, narration, values }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const ahi = values.ahi;
  const s = ahiSeverity(ahi);
  const seg = AHI_SEGMENTS.find((x) => x.label === SEG_LABEL[s]);
  const color = seg?.color ?? T.ink;

  const zonesAt = sentenceStartFrame(narration, '5번 미만', durationInFrames, fps) ?? 50;
  const valueAt = sentenceStartFrame(narration, '환자분은', durationInFrames, fps) ?? sentenceStartFrame(narration, '읽지 못했', durationInFrames, fps) ?? 130;
  const noteAt = sentenceStartFrame(narration, /반복했다는|진료실에서 직접/, durationInFrames, fps) ?? valueAt + 60;
  const waveP = interpolate(frame, [10, 90], [0, 1], clamp);
  const nightly = nightlyEvents(ahi, values.tst);

  return (
    <SceneFrame index={index} total={total} art={
        <ArtImage name={ART_FILES.ahi} fallback={<BreathArt gaps={GAPS[s]} color={color} progress={waveP} />}>
          <svg viewBox="0 0 640 160" style={{ position: 'absolute', left: 0, right: 0, top: '11%', width: '100%' }}>
            <BreathWave gaps={GAPS[s]} color={color} progress={waveP} y0={80} amp={40} />
          </svg>
        </ArtImage>
      } split={0.58}>
      <Rise at={0}>
        <Eyebrow>가장 중요한 숫자</Eyebrow>
        <Headline style={{ marginTop: 14 }}>한 시간에 숨이<br />몇 번 멈췄나.</Headline>
      </Rise>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 40, marginTop: 40 }}>
        <Rise at={valueAt - 6}>
          {ahi == null ? (
            <div style={{ height: 180, display: 'flex', alignItems: 'flex-end' }}>
              <NA />
            </div>
          ) : (
            <BigNumber value={ahi} at={valueAt} decimals={1} unit="번 / 시간" size={200} color={color} />
          )}
        </Rise>
        {seg && (
          <div style={{ paddingBottom: 14 }}>
            <Pill color={color} size={30} at={valueAt + 30}>
              {SEV_WORD[s]}
            </Pill>
          </div>
        )}
      </div>

      <Rise at={zonesAt}>
        <div style={{ marginTop: 44, maxWidth: 900 }}>
          <SegmentScale segments={AHI_SEGMENTS} max={40} value={ahi} activeLabel={SEG_LABEL[s]} at={valueAt} ticks={[{ v: 0 }, { v: 5 }, { v: 15 }, { v: 30 }, { v: 40, text: '40+' }]} />
        </div>
      </Rise>

      <Rise at={noteAt}>
        <Body size={30} strong style={{ marginTop: 34 }}>
          {ahi == null
            ? 'AHI는 진료실에서 직접 확인해 드립니다.'
            : nightly != null && nightly > 0
              ? `어젯밤 ${hoursText(values.tst!)} 동안 약 ${nightly}번, 숨이 막혔다 풀리기를 반복했습니다.`
              : `한 시간에 약 ${Math.round(ahi)}번, 숨이 막혔다 풀리기를 반복했습니다.`}
        </Body>
      </Rise>
    </SceneFrame>
  );
};
