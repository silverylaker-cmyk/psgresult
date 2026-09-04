import React from 'react';
import { useVideoConfig } from 'remotion';
import type { PsgValues } from '../../psg/types';
import { AnimatedNumber, Eyebrow, Headline, Rise, SceneFrame, T } from '../ui';
import { sentenceStartFrame } from '../timing';
import type { SceneProps } from './IntroOutro';

const ITEMS = [
  { label: '숨', desc: '멈추거나 얕아진 횟수', needle: '횟수' },
  { label: '산소', desc: '피 속 산소가 떨어진 정도', needle: '횟수' },
  { label: '자세', desc: '바로 누울 때와 옆으로 잘 때', needle: '횟수' },
  { label: '잠의 질', desc: '깊게 잔 시간과 깬 정도', needle: '횟수' },
];

export const OverviewScene: React.FC<SceneProps & { values: PsgValues }> = ({ index, total, narration, values }) => {
  const { durationInFrames, fps } = useVideoConfig();
  const listAt = sentenceStartFrame(narration, '횟수', durationInFrames, fps) ?? 30;
  const noteAt = sentenceStartFrame(narration, '코골이 소리만', durationInFrames, fps) ?? listAt + 80;
  const sumAt = sentenceStartFrame(narration, '주무신 시간', durationInFrames, fps);
  const hasSummary = values.tst != null;

  return (
    <SceneFrame index={index} total={total}>
      <div style={{ position: 'absolute', top: 150, left: 0, right: 0 }}>
        <Rise at={0}>
          <Eyebrow>오늘 밤</Eyebrow>
          <Headline style={{ marginTop: 16 }}>네 가지를 봤습니다.</Headline>
        </Rise>

        <div style={{ display: 'flex', gap: 40, marginTop: 90 }}>
          {ITEMS.map((it, i) => (
            <Rise key={it.label} at={listAt + i * 14} style={{ flex: 1 }}>
              <div style={{ borderTop: `3px solid ${T.ink}`, paddingTop: 22 }}>
                <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: -2, color: T.ink }}>{it.label}</div>
                <div style={{ marginTop: 10, fontSize: 26, color: T.ink2, fontWeight: 500 }}>{it.desc}</div>
              </div>
            </Rise>
          ))}
        </div>

        <Rise at={noteAt}>
          <div style={{ marginTop: 80, fontSize: 34, fontWeight: 500, color: T.ink2 }}>코골이 소리만 듣는 검사가 아닙니다.</div>
        </Rise>

        {hasSummary && (
          <Rise at={sumAt ?? noteAt + 60}>
            <div style={{ marginTop: 24, fontSize: 34, fontWeight: 700, color: T.ink, lineHeight: 1.6 }}>
              실제로 <AnimatedNumber value={values.tst! / 60} at={(sumAt ?? noteAt + 60) + 5} decimals={1} style={{ fontSize: 48, fontWeight: 900 }} />시간 주무셨고,
              {values.eff != null && (
                <>
                  {' '}수면 효율은 <AnimatedNumber value={values.eff} at={(sumAt ?? noteAt + 60) + 5} decimals={0} style={{ fontSize: 48, fontWeight: 900 }} />%였습니다.
                </>
              )}
            </div>
          </Rise>
        )}
      </div>
    </SceneFrame>
  );
};
