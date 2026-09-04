import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { PsgValues } from '../../psg/types';
import { Body, Eyebrow, Headline, Rise, SceneFrame, T } from '../ui';
import { IntroArt, OutroArt } from '../illustrations';
import { sentenceStartFrame } from '../timing';

export interface SceneProps {
  index: number;
  total: number;
  title: string;
  narration: string;
}

export const IntroScene: React.FC<SceneProps> = ({ index, total, narration }) => {
  const { durationInFrames, fps } = useVideoConfig();
  const minutes = narration.match(/약 (\d+)분/)?.[1] ?? '3';
  const l2 = sentenceStartFrame(narration, '어려운 용어', durationInFrames, fps) ?? 40;
  const l3 = sentenceStartFrame(narration, '충분합니다', durationInFrames, fps) ?? 120;

  return (
    <SceneFrame index={index} total={total} art={<IntroArt />} split={0.52}>
      <Rise at={0}>
        <Eyebrow>진료 전에 먼저 보세요</Eyebrow>
      </Rise>
      <Rise at={8}>
        <Headline size={104} style={{ marginTop: 22 }}>
          어젯밤,
          <br />
          몸에서 있었던 일
        </Headline>
      </Rise>
      <Rise at={l2}>
        <Body size={32} style={{ marginTop: 36, maxWidth: 760 }}>
          어려운 용어 대신, 밤사이 무슨 일이 있었는지
          <br />
          이야기로 풀어 드립니다.
        </Body>
      </Rise>
      <Rise at={l3}>
        <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 18 }}>
          <span style={{ background: T.accent, color: T.paper, borderRadius: 999, padding: '12px 28px', fontSize: 26, fontWeight: 700 }}>약 {minutes}분</span>
          <Body size={26}>치료 선택은 진료실에서 의사와 함께</Body>
        </div>
      </Rise>
    </SceneFrame>
  );
};

export const OutroScene: React.FC<SceneProps & { values: PsgValues }> = ({ index, total, narration, values }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const q1 =
    values.ahi != null && values.lowestspo2 != null
      ? `내 AHI ${values.ahi.toFixed(1)}과 산소 ${Math.round(values.lowestspo2)}%는 얼마나 심각한가`
      : values.ahi != null
        ? `내 AHI ${values.ahi.toFixed(1)}은 얼마나 심각한가`
        : '내 결과는 얼마나 심각한가';
  const items = [
    { n: '1', text: q1, at: sentenceStartFrame(narration, '첫째', durationInFrames, fps) ?? 30 },
    { n: '2', text: '나에게 맞는 첫 번째 치료는 무엇인가', at: sentenceStartFrame(narration, '둘째', durationInFrames, fps) ?? 70 },
    { n: '3', text: '언제쯤 달라지고, 언제 다시 검사하는가', at: sentenceStartFrame(narration, '셋째', durationInFrames, fps) ?? 110 },
  ];
  const discAt = sentenceStartFrame(narration, '결과를 이해', durationInFrames, fps) ?? 150;
  const checked = items.filter((it) => frame >= it.at + 10).length;

  return (
    <SceneFrame index={index} total={total} art={<OutroArt checked={checked} />} split={0.58}>
      <Rise at={0}>
        <Eyebrow>진료실에서</Eyebrow>
        <Headline size={80} style={{ marginTop: 16 }}>
          이 세 가지만 물어보세요.
        </Headline>
      </Rise>
      <div style={{ marginTop: 50, display: 'flex', flexDirection: 'column', gap: 26 }}>
        {items.map((it) => (
          <Rise key={it.n} at={it.at}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 22 }}>
              <div style={{ flexShrink: 0, width: 46, height: 46, borderRadius: '50%', background: T.accent, color: T.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, marginTop: 4 }}>{it.n}</div>
              <div style={{ fontSize: 38, fontWeight: 700, lineHeight: 1.35, color: T.ink, letterSpacing: -0.5 }}>{it.text}</div>
            </div>
          </Rise>
        ))}
      </div>
      <Rise at={discAt}>
        <Body size={24} style={{ marginTop: 40 }}>
          이 영상은 결과를 이해하기 위한 안내입니다. 진단과 치료는 담당 의사가 결정합니다.
        </Body>
      </Rise>
    </SceneFrame>
  );
};
