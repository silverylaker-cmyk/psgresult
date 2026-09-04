import React from 'react';
import { useVideoConfig } from 'remotion';
import { Eyebrow, Headline, Rise, SceneFrame, T } from '../ui';
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
  const l2 = sentenceStartFrame(narration, '숫자 하나하나', durationInFrames, fps) ?? 40;
  const l3 = sentenceStartFrame(narration, '정도 걸립니다', durationInFrames, fps) ?? 120;

  return (
    <SceneFrame index={index} total={total} dark>
      <div style={{ position: 'absolute', top: 260, left: 0, right: 0 }}>
        <Rise at={0}>
          <Eyebrow dark>진료 전에 먼저 보세요.</Eyebrow>
        </Rise>
        <Rise at={10}>
          <Headline size={136} dark style={{ marginTop: 24 }}>
            수면다원검사
            <br />
            결과 안내
          </Headline>
        </Rise>
        <Rise at={l2}>
          <div style={{ marginTop: 44, fontSize: 36, fontWeight: 500, lineHeight: 1.5, color: 'rgba(255,255,255,0.6)', maxWidth: 1100 }}>
            의사가 숫자 하나하나를 읽기 전에,
            <br />
            오늘 검사가 의미하는 것만 먼저 정리했습니다.
          </div>
        </Rise>
        <Rise at={l3}>
          <div style={{ marginTop: 40, fontSize: 30, fontWeight: 700, color: '#fff' }}>
            약 {minutes}분 <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 500, margin: '0 16px' }}>·</span>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>치료 선택은 진료실에서 의사와 함께</span>
          </div>
        </Rise>
      </div>
    </SceneFrame>
  );
};

export const OutroScene: React.FC<SceneProps> = ({ index, total, narration }) => {
  const { durationInFrames, fps } = useVideoConfig();
  const items = [
    { n: '01', text: '내 AHI와 산소 숫자가 어디에 해당하는가', at: sentenceStartFrame(narration, '첫째', durationInFrames, fps) ?? 30 },
    { n: '02', text: '양압기 · 수술 · 생활 교정 중 무엇이 맞나', at: sentenceStartFrame(narration, '둘째', durationInFrames, fps) ?? 70 },
    { n: '03', text: '언제 다시 와서 효과를 보나', at: sentenceStartFrame(narration, '셋째', durationInFrames, fps) ?? 110 },
  ];
  const discAt = sentenceStartFrame(narration, '결과 안내', durationInFrames, fps) ?? 150;

  return (
    <SceneFrame index={index} total={total} dark>
      <div style={{ position: 'absolute', top: 150, left: 0, right: 0 }}>
        <Rise at={0}>
          <Eyebrow dark>이제 진료실에서</Eyebrow>
          <Headline size={92} dark style={{ marginTop: 16 }}>
            이 세 가지만 확인하면 됩니다.
          </Headline>
        </Rise>
        <div style={{ marginTop: 70, display: 'flex', flexDirection: 'column', gap: 34 }}>
          {items.map((it) => (
            <Rise key={it.n} at={it.at}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 36 }}>
                <div style={{ fontSize: 30, fontWeight: 700, color: 'rgba(255,255,255,0.35)', fontVariantNumeric: 'tabular-nums' }}>{it.n}</div>
                <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: -1, color: '#fff' }}>{it.text}</div>
              </div>
            </Rise>
          ))}
        </div>
        <Rise at={discAt}>
          <div style={{ marginTop: 70, fontSize: 28, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
            이 영상은 결과 안내입니다. 진단과 치료는 담당 의사가 결정합니다.
          </div>
        </Rise>
      </div>
    </SceneFrame>
  );
};

export const darkScene = { color: T.dark };
