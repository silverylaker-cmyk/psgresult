import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { SEV_WORD, ahiSeverity, isPositional } from '../../psg/script';
import type { PsgValues } from '../../psg/types';
import { Body, Eyebrow, Headline, Rise, SceneFrame, T } from '../ui';
import { DaytimeArt, OptionsArt } from '../illustrations';
import { sentenceStartFrame } from '../timing';
import type { SceneProps } from './IntroOutro';

const SYMPTOMS = [
  { text: '자고 나도 개운하지 않고, 오후만 되면 졸음이 쏟아진다.', needle: '개운하지' },
  { text: '운전 중에 깜빡 졸고, 아침엔 머리가 무겁고 입이 마른다.', needle: '운전 중' },
  { text: '집중이 안 되고, 사소한 일에 짜증이 난다.', needle: '집중이' },
  { text: '몇 년 쌓이면 혈압 · 심장 · 당뇨 위험이 함께 올라간다.', needle: '몇 년' },
];

export const DaytimeScene: React.FC<SceneProps & { values: PsgValues }> = ({ index, total, narration, values }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const normal = ahiSeverity(values.ahi) === 'normal';
  const ats = SYMPTOMS.map((s) => sentenceStartFrame(narration, s.needle, durationInFrames, fps) ?? 40);
  const current = ats.reduce((cur, a, i) => (frame >= a ? i : cur), -1);

  return (
    <SceneFrame index={index} total={total} art={<DaytimeArt />} split={0.58}>
      <Rise at={0}>
        <Eyebrow>{normal ? '참고로, 수면무호흡이 있으면' : '그래서'}</Eyebrow>
        <Headline style={{ marginTop: 14 }}>낮이 힘든 겁니다.</Headline>
      </Rise>
      <div style={{ marginTop: 50, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {SYMPTOMS.map((s, i) => (
          <Rise key={s.text} at={ats[i]}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0, width: 14, height: 14, borderRadius: '50%', background: i === current ? T.accent : T.line, marginTop: 18 }} />
              <div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.4, letterSpacing: -0.5, color: i === current ? T.ink : T.ink3 }}>{s.text}</div>
            </div>
          </Rise>
        ))}
      </div>
    </SceneFrame>
  );
};

const OPTIONS = [
  { n: 1, title: '양압기', desc: '코로 부드럽게 바람을 넣어 숨길이 닫히지 않게. 중간 이상에서 가장 확실한 방법.', needle: '첫째' },
  { n: 2, title: '수술', desc: '코나 목에서 실제로 막힌 곳을 찾아 넓힘. 구조적 원인이 뚜렷할 때.', needle: '둘째' },
  { n: 3, title: '자세 · 체중', desc: '옆으로 자기, 체중 감량, 술 줄이기. 가벼운 경우엔 효과가 큼.', needle: '셋째' },
  { n: 4, title: '구강 장치', desc: '아래턱을 살짝 앞으로 당겨 숨길을 열어 주는 마우스피스.', needle: '넷째' },
];

export const OptionsScene: React.FC<SceneProps & { values: PsgValues }> = ({ index, total, narration, values }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const s = ahiSeverity(values.ahi);
  const positional = isPositional(values);

  const highlightAt = sentenceStartFrame(narration, /이야기를 시작|생활 습관부터/, durationInFrames, fps);
  const posAt = sentenceStartFrame(narration, '옆으로 자는 방법', durationInFrames, fps);
  const ats = OPTIONS.map((o) => sentenceStartFrame(narration, o.needle, durationInFrames, fps) ?? 40 + o.n * 20);
  const speaking = ats.reduce((cur, a, i) => (frame >= a ? i : cur), -1);

  const highlighted = new Set<number>();
  const hl = highlightAt != null && frame >= highlightAt;
  if (hl) {
    if (s === 'moderate' || s === 'severe') highlighted.add(1);
    if (s === 'mild' || s === 'normal') {
      highlighted.add(3);
      if (s === 'mild') highlighted.add(4);
    }
  }
  if (posAt != null && frame >= posAt && positional) highlighted.add(3);
  const anyHl = highlighted.size > 0;
  const artActive = anyHl ? highlighted : speaking >= 0 ? new Set([speaking + 1]) : new Set<number>();

  const note =
    s === 'moderate' || s === 'severe'
      ? `${SEV_WORD[s]}라면 보통 양압기부터 이야기를 시작합니다.`
      : s === 'mild'
        ? '가벼운 단계라면 자세·체중, 구강 장치부터 이야기를 시작합니다.'
        : s === 'normal'
          ? '당장 치료가 필요한 단계는 아닐 수 있습니다. 증상이 있다면 생활 습관부터.'
          : '';

  return (
    <SceneFrame index={index} total={total} art={<OptionsArt active={artActive} />} split={0.56}>
      <Rise at={0}>
        <Eyebrow>결정은 진료실에서 함께 · 후보를 미리 알고 오시면 대화가 쉽습니다</Eyebrow>
        <Headline style={{ marginTop: 14 }}>무엇을 할 수 있나.</Headline>
      </Rise>
      <div style={{ marginTop: 34, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {OPTIONS.map((o, i) => {
          const on = highlighted.has(o.n);
          const active = anyHl ? on : i === speaking;
          return (
            <Rise key={o.n} at={ats[i]}>
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', opacity: anyHl && !on ? 0.4 : 1 }}>
                <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: '50%', background: active ? T.accent : T.line, color: active ? T.paper : T.ink2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, marginTop: 4 }}>
                  {o.n}
                </div>
                <div>
                  <div style={{ fontFamily: T.serif, fontSize: 36, fontWeight: 700, color: T.ink }}>{o.title}</div>
                  <div style={{ fontSize: 23, color: T.ink2, lineHeight: 1.45, marginTop: 2 }}>{o.desc}</div>
                </div>
              </div>
            </Rise>
          );
        })}
      </div>
      {hl && note && (
        <Rise at={highlightAt!}>
          <Body size={27} strong style={{ marginTop: 26, color: T.accent }}>
            {note}
            {positional && posAt != null && frame >= posAt ? ' 옆으로 자는 방법은 어떤 단계에서든 함께.' : ''}
          </Body>
        </Rise>
      )}
    </SceneFrame>
  );
};
