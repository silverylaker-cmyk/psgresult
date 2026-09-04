import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { ahiSeverity, isPositional } from '../../psg/script';
import type { PsgValues } from '../../psg/types';
import { Card, Icon, Rise, SceneFrame, T, clamp } from '../ui';
import { sentenceStartFrame } from '../timing';
import type { SceneProps } from './IntroOutro';

const SYMPTOMS = [
  { icon: 'drowsy', title: '졸음', desc: '회의·운전 중 갑자기 잠이 온다', needle: '갑자기 잠이' },
  { icon: 'headache', title: '두통 · 입마름', desc: '아침에 머리가 무겁고 목이 마른다', needle: '갑자기 잠이' },
  { icon: 'focus', title: '집중', desc: '기억이 잘 안 나고 쉽게 짜증이 난다', needle: '기억이' },
  { icon: 'heart', title: '혈압 · 심장', desc: '오래되면 혈압과 심장에 부담이 쌓일 수 있다', needle: '혈압' },
] as const;

export const DaytimeScene: React.FC<SceneProps & { values: PsgValues }> = ({ index, total, title, narration }) => {
  const { durationInFrames, fps } = useVideoConfig();
  return (
    <SceneFrame title={title} subtitle="수면무호흡이 낮 생활에 미치는 영향" index={index} total={total}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
        {SYMPTOMS.map((s, i) => {
          const at = (sentenceStartFrame(narration, s.needle, durationInFrames, fps) ?? 30) + (i % 2) * 12;
          return (
            <Rise key={s.title} at={at}>
              <Card style={{ display: 'flex', alignItems: 'center', gap: 30, height: 290, padding: '30px 40px' }}>
                <div style={{ width: 150, height: 150, borderRadius: '50%', background: '#e6f1f3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={s.icon} size={86} />
                </div>
                <div>
                  <div style={{ fontSize: 44, fontWeight: 900, color: T.navy }}>{s.title}</div>
                  <div style={{ fontSize: 28, lineHeight: 1.5, color: T.gray, marginTop: 10 }}>{s.desc}</div>
                </div>
              </Card>
            </Rise>
          );
        })}
      </div>
    </SceneFrame>
  );
};

const OPTIONS = [
  { n: 1, icon: 'cpap', title: '양압기', desc: '자는 동안 숨길을 열어 주는 기계. 중등도·중증에서 가장 많이 씁니다.', needle: '첫째' },
  { n: 2, icon: 'surgery', title: '수술 상담', desc: '코·목 구조가 막힌 원인을 보고 수술이 도움이 되는지 판단합니다.', needle: '둘째' },
  { n: 3, icon: 'posture', title: '자세 · 체중', desc: '바로 누울 때만 심하거나 체중이 원인일 때 같이 봅니다.', needle: '셋째' },
  { n: 4, icon: 'oral', title: '구강 장치', desc: '아래턱을 앞으로 당겨 숨길을 여는 장치. 적응증이 맞을 때.', needle: '넷째' },
] as const;

export const OptionsScene: React.FC<SceneProps & { values: PsgValues }> = ({ index, total, title, narration, values }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const sev = ahiSeverity(values.ahi);
  const positional = isPositional(values);

  const highlightAt = sentenceStartFrame(narration, /우선 후보|상의하는 경우/, durationInFrames, fps);
  const posAt = sentenceStartFrame(narration, '자세 교정도', durationInFrames, fps);

  const highlighted = new Set<number>();
  if (highlightAt != null && frame >= highlightAt) {
    if (sev === 'moderate' || sev === 'severe') highlighted.add(1);
    if (sev === 'mild') {
      highlighted.add(3);
      highlighted.add(4);
    }
  }
  if (posAt != null && frame >= posAt && positional) highlighted.add(3);

  const noteOp = highlightAt == null ? 0 : interpolate(frame, [highlightAt, highlightAt + 15], [0, 1], clamp);

  return (
    <SceneFrame title={title} subtitle="영상이 치료를 정하지 않습니다 · 자주 나오는 선택지" index={index} total={total}>
      <div style={{ display: 'flex', gap: 24 }}>
        {OPTIONS.map((o) => {
          const at = sentenceStartFrame(narration, o.needle, durationInFrames, fps) ?? 30 + o.n * 15;
          const on = highlighted.has(o.n);
          return (
            <Rise key={o.n} at={at} style={{ flex: 1 }}>
              <Card accent={on ? T.teal : undefined} style={{ height: 470, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: on ? '#e6f1f3' : T.card }}>
                <div style={{ alignSelf: 'flex-start', width: 52, height: 52, borderRadius: '50%', background: on ? T.teal : T.mist, color: on ? '#fff' : T.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900 }}>
                  {o.n}
                </div>
                <div style={{ width: 130, height: 130, borderRadius: '50%', background: on ? '#fff' : '#e6f1f3', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 6 }}>
                  <Icon name={o.icon} size={78} />
                </div>
                <div style={{ fontSize: 38, fontWeight: 900, color: T.navy, marginTop: 20 }}>{o.title}</div>
                <div style={{ fontSize: 24, lineHeight: 1.5, color: T.gray, marginTop: 12 }}>{o.desc}</div>
              </Card>
            </Rise>
          );
        })}
      </div>
      <div style={{ marginTop: 26, opacity: noteOp, fontSize: 28, fontWeight: 700, color: T.teal, textAlign: 'center' }}>
        {sev === 'moderate' || sev === 'severe'
          ? '중등도 이상에서는 양압기가 우선 후보로 논의되는 경우가 많습니다'
          : sev === 'mild'
            ? '경증에서는 자세·체중 교정이나 구강 장치부터 상의하는 경우가 많습니다'
            : ''}
        {positional && posAt != null && frame >= posAt ? ' · 바로 누울 때 심했다면 자세 교정도 함께' : ''}
      </div>
    </SceneFrame>
  );
};
