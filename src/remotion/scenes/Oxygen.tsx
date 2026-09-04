import React from 'react';
import { useVideoConfig } from 'remotion';
import { C, getSeverity, metricById } from '../../psg/metrics';
import type { PsgValues } from '../../psg/types';
import { BigNumber, Eyebrow, Headline, NA, Pill, Rise, SceneFrame, SegmentScale, T, sev } from '../ui';
import { sentenceStartFrame } from '../timing';
import type { SceneProps } from './IntroOutro';

const SEGMENTS = [
  { from: 70, to: 82, color: sev(C.severe), label: '중증 저하' },
  { from: 82, to: 88, color: sev(C.moderate), label: '중등도 저하' },
  { from: 88, to: 92, color: sev(C.mild), label: '경증 저하' },
  { from: 92, to: 100, color: sev(C.good), label: '정상' },
];

export const OxygenScene: React.FC<SceneProps & { values: PsgValues }> = ({ index, total, narration, values }) => {
  const { durationInFrames, fps } = useVideoConfig();
  const spo2 = values.lowestspo2;
  const zone = getSeverity(metricById('lowestspo2')!, spo2);
  const color = sev(zone?.c);

  const infoAt = sentenceStartFrame(narration, '95퍼센트', durationInFrames, fps) ?? 40;
  const valueAt = sentenceStartFrame(narration, '환자분의', durationInFrames, fps) ?? sentenceStartFrame(narration, '읽지 못했', durationInFrames, fps) ?? 120;
  const noteAt = sentenceStartFrame(narration, /순간이 있었|잘 유지|읽지 못했/, durationInFrames, fps) ?? valueAt + 60;

  return (
    <SceneFrame index={index} total={total}>
      <div style={{ position: 'absolute', top: 120, left: 0, right: 0 }}>
        <Rise at={0}>
          <Eyebrow>숨이 막히면</Eyebrow>
          <Headline style={{ marginTop: 12 }}>피 속 산소가 떨어집니다.</Headline>
        </Rise>

        <Rise at={infoAt}>
          <div style={{ marginTop: 28, fontSize: 30, color: T.ink2, fontWeight: 500 }}>
            깨어 있을 때는 보통 <b style={{ color: T.ink }}>95% 이상</b>. <b style={{ color: T.ink }}>90% 아래</b>로 자주 내려가면 몸에 부담이 됩니다.
          </div>
        </Rise>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 60, marginTop: 50 }}>
          <Rise at={valueAt - 6}>
            <div style={{ fontSize: 28, color: T.ink2, fontWeight: 500, marginBottom: 14 }}>환자분의 최저 산소포화도</div>
            {spo2 == null ? <NA /> : <BigNumber value={spo2} at={valueAt} decimals={0} unit="%" size={240} color={color} />}
          </Rise>
          {zone && (
            <div style={{ paddingBottom: 18 }}>
              <Pill color={color} size={34} at={valueAt + 30}>
                {zone.l}
              </Pill>
            </div>
          )}
        </div>

        <Rise at={valueAt + 10}>
          <div style={{ marginTop: 56 }}>
            <SegmentScale segments={SEGMENTS} min={70} max={100} value={spo2} activeLabel={zone?.l} at={valueAt} ticks={[{ v: 70 }, { v: 82 }, { v: 88 }, { v: 92 }, { v: 100 }]} height={36} />
          </div>
        </Rise>

        <Rise at={noteAt}>
          <div style={{ marginTop: 40, fontSize: 34, fontWeight: 700, color: T.ink }}>
            {spo2 == null ? '최저 산소포화도는 진료실에서 직접 확인해 드립니다.' : zone?.l === '정상' ? '잠자는 동안에도 산소가 잘 유지되었습니다.' : '잠자는 동안 몸에 들어가는 산소가 부족했던 순간이 있었습니다.'}
          </div>
        </Rise>
      </div>
    </SceneFrame>
  );
};
