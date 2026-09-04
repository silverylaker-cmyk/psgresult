import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Icon, Rise, SceneFrame, T, clamp, useEnter } from '../ui';
import { sentenceStartFrame } from '../timing';

export interface SceneProps {
  index: number;
  total: number;
  title: string;
  narration: string;
}

export const IntroScene: React.FC<SceneProps> = ({ index, total, narration }) => {
  const frame = useCurrentFrame();
  const p = useEnter(0);
  const p2 = useEnter(14);
  const p3 = useEnter(30);
  const moon = useEnter(4, { damping: 12 });
  const float = Math.sin(frame / 22) * 8;
  const minutes = narration.match(/약 (\d+)분/)?.[1] ?? '3';

  return (
    <SceneFrame title="" index={index} total={total} dark>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 80 }}>
        <div style={{ flex: 1, paddingLeft: 40 }}>
          <div style={{ fontSize: 34, fontWeight: 500, color: T.mist, opacity: p, transform: `translateY(${(1 - p) * 20}px)` }}>
            진료 전에 먼저 보세요
          </div>
          <div
            style={{
              marginTop: 14,
              fontSize: 84,
              fontWeight: 900,
              letterSpacing: -2,
              lineHeight: 1.15,
              opacity: p2,
              transform: `translateY(${(1 - p2) * 30}px)`,
            }}
          >
            수면다원검사
            <br />
            결과 안내
          </div>
          <div
            style={{
              marginTop: 34,
              fontSize: 30,
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.75)',
              opacity: p3,
              transform: `translateY(${(1 - p3) * 24}px)`,
              maxWidth: 820,
            }}
          >
            의사가 숫자 하나하나를 읽기 전에,
            <br />
            오늘 검사가 의미하는 것만 먼저 정리했습니다.
          </div>
          <div style={{ marginTop: 40, display: 'flex', gap: 16, opacity: p3 }}>
            <Chip>약 {minutes}분</Chip>
            <Chip>진료실에서 치료 선택은 의사와 함께</Chip>
          </div>
        </div>
        <div
          style={{
            width: 480,
            height: 480,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #3f8a9c, #1f5563 70%, #1b3a4b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${0.7 + 0.3 * moon}) translateY(${float}px)`,
            opacity: moon,
            boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
            marginRight: 40,
          }}
        >
          <Icon name="sleep" size={220} color="#eaf4f7" />
        </div>
      </div>
    </SceneFrame>
  );
};

const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      border: '2px solid rgba(255,255,255,0.35)',
      borderRadius: 999,
      padding: '10px 26px',
      fontSize: 24,
      fontWeight: 500,
      color: 'rgba(255,255,255,0.9)',
    }}
  >
    {children}
  </span>
);

export const OutroScene: React.FC<SceneProps> = ({ index, total, title, narration }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const items = [
    { n: '1', text: '내 AHI와 산소 숫자가 어디에 해당하는가', at: sentenceStartFrame(narration, '첫째', durationInFrames, fps) ?? 20 },
    { n: '2', text: '양압기 · 수술 · 생활 교정 중 무엇이 맞나', at: sentenceStartFrame(narration, '둘째', durationInFrames, fps) ?? 60 },
    { n: '3', text: '언제 다시 와서 효과를 보나', at: sentenceStartFrame(narration, '셋째', durationInFrames, fps) ?? 100 },
  ];
  const discAt = sentenceStartFrame(narration, '결과 안내', durationInFrames, fps) ?? 140;
  const discOp = interpolate(frame, [discAt, discAt + 15], [0, 1], clamp);

  return (
    <SceneFrame title={title} index={index} total={total} dark>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 30, paddingTop: 20 }}>
        {items.map((it) => (
          <Rise key={it.n} at={it.at}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
              <div
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: '50%',
                  background: T.teal,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 42,
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >
                {it.n}
              </div>
              <div style={{ fontSize: 46, fontWeight: 700, letterSpacing: -0.5 }}>{it.text}</div>
            </div>
          </Rise>
        ))}
        <div style={{ marginTop: 40, fontSize: 28, color: 'rgba(255,255,255,0.65)', opacity: discOp }}>
          이 영상은 결과 안내입니다. 진단과 치료는 담당 의사가 결정합니다.
        </div>
      </div>
    </SceneFrame>
  );
};
