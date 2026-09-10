import React from 'react';
import { useVideoConfig } from 'remotion';
import { getSeverity, metricById } from '../../psg/metrics';
import { nightlyEvents } from '../../psg/script';
import type { PsgValues } from '../../psg/types';
import { AnimatedNumber, BigNumber, Body, Eyebrow, Headline, NA, Pill, Rise, SceneFrame, T, sev } from '../ui';
import { StagesArt } from '../illustrations';
import { ART_FILES, ArtImage } from '../art';
import { sentenceStartFrame } from '../timing';
import type { SceneProps } from './IntroOutro';

export const QualityScene: React.FC<SceneProps & { values: PsgValues }> = ({ index, total, narration, values }) => {
  const { durationInFrames, fps } = useVideoConfig();
  const n3 = values.n3pct;
  const rem = values.rempct;
  const n3z = getSeverity(metricById('n3pct')!, n3);
  const remz = getSeverity(metricById('rempct')!, rem);
  const n3c = sev(n3z?.c);
  const remc = sev(remz?.c);

  const numAt = sentenceStartFrame(narration, /환자분은|읽지 못했/, durationInFrames, fps) ?? 70;
  const n3NoteAt = sentenceStartFrame(narration, /깊은 잠이 정상|깊은 잠이 조금|깊은 잠은 잘/, durationInFrames, fps);
  const remNoteAt = sentenceStartFrame(narration, /렘수면도|렘수면은 정상|렘수면은 다소/, durationInFrames, fps);
  const rdiAt = sentenceStartFrame(narration, '잠깐씩 깬', durationInFrames, fps);
  const rdiTotal = nightlyEvents(values.rdi, values.tst);

  return (
    <SceneFrame index={index} total={total} art={<ArtImage name={ART_FILES.quality} fallback={<StagesArt n3={n3} rem={rem} n3color={n3c} remcolor={remc} />} />} split={0.58}>
      <Rise at={0}>
        <Eyebrow>잠의 질</Eyebrow>
        <Headline style={{ marginTop: 14 }}>얼마나 깊이 잤나.</Headline>
      </Rise>
      <Rise at={20}>
        <Body size={27} style={{ marginTop: 18, maxWidth: 820 }}>
          잠은 얕은 잠, 깊은 잠, 꿈꾸는 렘수면이 번갈아 옵니다. 깊은 잠은 몸을 고치고, 렘수면은 기억과 감정을 정리합니다.
        </Body>
      </Rise>

      <div style={{ display: 'flex', gap: 60, marginTop: 40 }}>
        <Stage at={numAt} noteAt={n3NoteAt} name="깊은 잠" range="정상 15% 이상" value={n3} color={n3c} label={n3z?.l} note={n3 == null ? null : n3 <= 10 ? '정상의 절반도 안 됩니다. 숨이 막힐 때마다 뇌가 깨어나, 깊이 내려갈 틈이 없었습니다.' : n3 <= 15 ? '조금 모자랐습니다.' : '잘 유지되었습니다.'} />
        <Stage at={numAt + 14} noteAt={remNoteAt} name="렘수면" range="정상 15–25%" value={rem} color={remc} label={remz?.l} note={rem == null ? null : rem <= 15 ? '부족했습니다.' : rem <= 25 ? '정상이었습니다.' : '다소 많은 편이었습니다.'} />
      </div>

      {values.rdi != null && (
        <Rise at={rdiAt ?? numAt + 150}>
          <Body size={25} style={{ marginTop: 26 }}>
            숨 때문에 잠깐씩 깬 것까지 세면 한 시간에{' '}
            <span style={{ fontSize: 40, fontWeight: 900, color: T.ink, letterSpacing: -1 }}>
              <AnimatedNumber value={values.rdi} at={rdiAt ?? numAt + 150} />번
            </span>
            {rdiTotal != null && rdiTotal > 0 ? ` — 밤새 ${rdiTotal}번쯤 깨어난 셈입니다.` : '.'}
          </Body>
        </Rise>
      )}
    </SceneFrame>
  );
};

const Stage: React.FC<{ at: number; noteAt: number | null; name: string; range: string; value: number | null; color: string; label?: string; note: string | null }> = ({
  at,
  noteAt,
  name,
  range,
  value,
  color,
  label,
  note,
}) => (
  <div style={{ flex: 1 }}>
    <Rise at={at}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span style={{ fontFamily: T.serif, fontSize: 34, fontWeight: 700, color: T.ink }}>{name}</span>
        <span style={{ fontSize: 22, color: T.ink3 }}>{range}</span>
      </div>
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-end', gap: 20 }}>
        {value == null ? (
          <div style={{ height: 120, display: 'flex', alignItems: 'flex-end' }}>
            <NA size={30} />
          </div>
        ) : (
          <BigNumber value={value} at={at} decimals={0} unit="%" size={130} color={color} />
        )}
        {label && value != null && (
          <div style={{ paddingBottom: 10 }}>
            <Pill color={color} size={22} at={at + 30}>
              {label}
            </Pill>
          </div>
        )}
      </div>
    </Rise>
    {note && noteAt != null && (
      <Rise at={noteAt}>
        <Body size={24} strong style={{ marginTop: 14, lineHeight: 1.45 }}>
          {note}
        </Body>
      </Rise>
    )}
  </div>
);
