import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { PsgValues } from '../../psg/types';
import { hoursText } from '../../psg/script';
import { Body, Eyebrow, Headline, Rise, SceneFrame, T } from '../ui';
import { OverviewArt } from '../illustrations';
import { sentenceStartFrame } from '../timing';
import type { SceneProps } from './IntroOutro';

const ITEMS = [
  { label: '숨', desc: '몇 번 멈췄는지' },
  { label: '산소', desc: '얼마나 떨어졌는지' },
  { label: '자세', desc: '어디서 더 힘들었는지' },
  { label: '잠', desc: '얼마나 깊이 잤는지' },
];

export const OverviewScene: React.FC<SceneProps & { values: PsgValues }> = ({ index, total, narration, values }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const listAt = sentenceStartFrame(narration, '몇 번 멈췄는지', durationInFrames, fps) ?? 30;
  const sumAt = sentenceStartFrame(narration, /잠든 시간은|몸 전체를/, durationInFrames, fps) ?? listAt + 100;
  const step = Math.floor((frame - listAt) / 14);

  return (
    <SceneFrame index={index} total={total} art={<OverviewArt step={step} />}>
      <Rise at={0}>
        <Eyebrow>검사실에서는</Eyebrow>
        <Headline style={{ marginTop: 14 }}>밤새 네 가지를<br />지켜봤습니다.</Headline>
      </Rise>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px 40px', marginTop: 50 }}>
        {ITEMS.map((it, i) => (
          <Rise key={it.label} at={listAt + i * 14}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, borderBottom: `2px solid ${T.line}`, paddingBottom: 14 }}>
              <span style={{ fontFamily: T.serif, fontSize: 44, fontWeight: 700, color: T.ink }}>{it.label}</span>
              <span style={{ fontSize: 26, color: T.ink2 }}>{it.desc}</span>
            </div>
          </Rise>
        ))}
      </div>
      <Rise at={sumAt}>
        <Body size={30} strong style={{ marginTop: 44 }}>
          {values.tst != null ? (
            <>
              어젯밤 실제로 잠든 시간 <span style={{ color: T.accent, fontSize: 40, fontWeight: 900 }}>{hoursText(values.tst)}</span>
              {values.eff != null && (
                <>
                  {' '}· 수면 효율 <span style={{ color: T.accent, fontSize: 40, fontWeight: 900 }}>{Math.round(values.eff)}%</span>
                </>
              )}
            </>
          ) : (
            '코골이 소리를 듣는 검사가 아니라, 몸 전체를 밤새 기록하는 검사입니다.'
          )}
        </Body>
      </Rise>
    </SceneFrame>
  );
};
