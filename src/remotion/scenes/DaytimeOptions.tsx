import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { ahiSeverity, isPositional } from '../../psg/script';
import type { PsgValues } from '../../psg/types';
import { Eyebrow, Headline, Rise, SceneFrame, T } from '../ui';
import { sentenceStartFrame } from '../timing';
import type { SceneProps } from './IntroOutro';

const SYMPTOMS = [
  { text: '회의나 운전 중, 갑자기 잠이 온다.', needle: '갑자기 잠이' },
  { text: '아침에 머리가 무겁고 목이 마른다.', needle: '갑자기 잠이', delay: 14 },
  { text: '기억이 잘 안 나고, 쉽게 짜증이 난다.', needle: '기억이' },
  { text: '오래되면 혈압과 심장에 부담이 쌓인다.', needle: '혈압' },
];

export const DaytimeScene: React.FC<SceneProps & { values: PsgValues }> = ({ index, total, narration, values }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const normal = ahiSeverity(values.ahi) === 'normal';
  const ats = SYMPTOMS.map((s) => (sentenceStartFrame(narration, s.needle, durationInFrames, fps) ?? 40) + (s.delay ?? 0));
  const current = ats.reduce((cur, a, i) => (frame >= a ? i : cur), -1);

  return (
    <SceneFrame index={index} total={total}>
      <div style={{ position: 'absolute', top: 120, left: 0, right: 0 }}>
        <Rise at={0}>
          <Eyebrow>{normal ? '참고로, 수면무호흡이 있으면' : '그래서'}</Eyebrow>
          <Headline style={{ marginTop: 12 }}>낮에 이런 일이 생깁니다.</Headline>
        </Rise>
        <div style={{ marginTop: 80, display: 'flex', flexDirection: 'column', gap: 30 }}>
          {SYMPTOMS.map((s, i) => (
            <Rise key={s.text} at={ats[i]}>
              <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -1.5, color: i === current ? T.ink : T.ink3, transition: 'color .3s' }}>{s.text}</div>
            </Rise>
          ))}
        </div>
      </div>
    </SceneFrame>
  );
};

const OPTIONS = [
  { n: 1, title: '양압기', desc: '자는 동안 숨길을 열어 주는 기계. 중등도·중증에서 가장 많이 씁니다.', needle: '첫째' },
  { n: 2, title: '수술 상담', desc: '코·목 구조가 막힌 원인을 보고 수술이 도움이 되는지 판단합니다.', needle: '둘째' },
  { n: 3, title: '자세 · 체중', desc: '바로 누울 때만 심하거나 체중이 원인일 때 같이 봅니다.', needle: '셋째' },
  { n: 4, title: '구강 장치', desc: '아래턱을 앞으로 당겨 숨길을 여는 장치. 적응증이 맞을 때.', needle: '넷째' },
];

export const OptionsScene: React.FC<SceneProps & { values: PsgValues }> = ({ index, total, narration, values }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const sevr = ahiSeverity(values.ahi);
  const positional = isPositional(values);

  const highlightAt = sentenceStartFrame(narration, /우선 후보|상의하는 경우/, durationInFrames, fps);
  const posAt = sentenceStartFrame(narration, '자세 교정도', durationInFrames, fps);
  const ats = OPTIONS.map((o) => sentenceStartFrame(narration, o.needle, durationInFrames, fps) ?? 40 + o.n * 20);
  const speaking = ats.reduce((cur, a, i) => (frame >= a ? i : cur), -1);

  const highlighted = new Set<number>();
  const hl = highlightAt != null && frame >= highlightAt;
  if (hl) {
    if (sevr === 'moderate' || sevr === 'severe') highlighted.add(1);
    if (sevr === 'mild') {
      highlighted.add(3);
      highlighted.add(4);
    }
  }
  if (posAt != null && frame >= posAt && positional) highlighted.add(3);
  const anyHl = highlighted.size > 0;

  const note =
    sevr === 'moderate' || sevr === 'severe'
      ? '중등도 이상에서는 양압기가 우선 후보로 논의되는 경우가 많습니다.'
      : sevr === 'mild'
        ? '경증에서는 자세·체중 교정이나 구강 장치부터 상의하는 경우가 많습니다.'
        : '';

  return (
    <SceneFrame index={index} total={total}>
      <div style={{ position: 'absolute', top: 120, left: 0, right: 0 }}>
        <Rise at={0}>
          <Eyebrow>영상이 치료를 정하지 않습니다 · 자주 나오는 선택지</Eyebrow>
          <Headline style={{ marginTop: 12 }}>진료실에서 고를 수 있는 다음 단계</Headline>
        </Rise>
        <div style={{ marginTop: 60, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px 80px' }}>
          {OPTIONS.map((o, i) => {
            const on = highlighted.has(o.n);
            const active = anyHl ? on : i === speaking;
            return (
              <Rise key={o.n} at={ats[i]}>
                <div style={{ borderTop: `3px solid ${active ? T.ink : T.line}`, paddingTop: 18, opacity: anyHl && !on ? 0.4 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
                    <span style={{ fontSize: 26, fontWeight: 700, color: T.ink3 }}>0{o.n}</span>
                    <span style={{ fontSize: 54, fontWeight: 900, letterSpacing: -1.5, color: T.ink }}>{o.title}</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 26, color: T.ink2, fontWeight: 500, lineHeight: 1.45 }}>{o.desc}</div>
                </div>
              </Rise>
            );
          })}
        </div>
        {hl && note && (
          <Rise at={highlightAt!}>
            <div style={{ marginTop: 50, fontSize: 32, fontWeight: 700, color: T.ink }}>
              {note}
              {positional && posAt != null && frame >= posAt ? ' 바로 누울 때 심했으니 자세 교정도 함께.' : ''}
            </div>
          </Rise>
        )}
      </div>
    </SceneFrame>
  );
};
