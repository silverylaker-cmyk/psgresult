import React from 'react';
import { useVideoConfig } from 'remotion';
import { getSeverity, metricById } from '../../psg/metrics';
import type { PsgValues } from '../../psg/types';
import { AnimatedNumber, BigNumber, Eyebrow, Headline, NA, Pill, Rise, SceneFrame, T, sev } from '../ui';
import { sentenceStartFrame } from '../timing';
import type { SceneProps } from './IntroOutro';

export const QualityScene: React.FC<SceneProps & { values: PsgValues }> = ({ index, total, narration, values }) => {
  const { durationInFrames, fps } = useVideoConfig();
  const n3 = values.n3pct;
  const rem = values.rempct;
  const n3z = getSeverity(metricById('n3pct')!, n3);
  const remz = getSeverity(metricById('rempct')!, rem);

  const numAt = sentenceStartFrame(narration, /N3 수면|렘수면은 전체|읽지 못했/, durationInFrames, fps) ?? 60;
  const n3NoteAt = sentenceStartFrame(narration, /깊은 잠이|깊은 잠은/, durationInFrames, fps);
  const remNoteAt = sentenceStartFrame(narration, /렘수면도|렘수면은 정상|렘수면 비율/, durationInFrames, fps);
  const rdiAt = sentenceStartFrame(narration, '잠깐씩 깬', durationInFrames, fps);

  return (
    <SceneFrame index={index} total={total}>
      <div style={{ position: 'absolute', top: 120, left: 0, right: 0 }}>
        <Rise at={0}>
          <Eyebrow>잠의 질</Eyebrow>
          <Headline style={{ marginTop: 12 }}>얼마나 깊이 잤나요.</Headline>
          <div style={{ marginTop: 10, fontSize: 30, color: T.ink2, fontWeight: 500 }}>깊은 잠은 몸을, 렘수면은 뇌를 회복시킵니다.</div>
        </Rise>

        <div style={{ display: 'flex', gap: 80, marginTop: 70 }}>
          <Stage at={numAt} noteAt={n3NoteAt} name="N3 깊은 잠" range="정상 15% 이상" value={n3} color={sev(n3z?.c)} label={n3z?.l} note={n3 == null ? null : n3 <= 10 ? '많이 부족 — 숨이 막힐 때마다 뇌가 잠깐씩 깨어, 깊은 잠에 못 들어갔을 수 있습니다.' : n3 <= 15 ? '조금 부족합니다.' : '충분한 편입니다.'} />
          <Stage at={numAt + 14} noteAt={remNoteAt} name="REM 렘수면" range="정상 15–25%" value={rem} color={sev(remz?.c)} label={remz?.l} note={rem == null ? null : rem <= 15 ? '부족합니다.' : rem <= 25 ? '정상 범위입니다.' : '다소 높은 편입니다.'} />
        </div>

        {values.rdi != null && (
          <Rise at={rdiAt ?? numAt + 150}>
            <div style={{ marginTop: 60, fontSize: 30, fontWeight: 500, color: T.ink2, display: 'flex', alignItems: 'baseline', gap: 10 }}>
              숨이 불편해서 잠깐씩 깬 것까지 포함하면, 한 시간에
              <span style={{ fontSize: 48, fontWeight: 900, color: T.ink, letterSpacing: -1 }}>
                <AnimatedNumber value={values.rdi} at={rdiAt ?? numAt + 150} />회
              </span>
              였습니다.
            </div>
          </Rise>
        )}
      </div>
    </SceneFrame>
  );
};

const Stage: React.FC<{
  at: number;
  noteAt: number | null;
  name: string;
  range: string;
  value: number | null;
  color: string;
  label?: string;
  note: string | null;
}> = ({ at, noteAt, name, range, value, color, label, note }) => (
  <div style={{ flex: 1 }}>
    <Rise at={at}>
      <div style={{ borderTop: `3px solid ${T.ink}`, paddingTop: 22 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: T.ink }}>{name}</div>
          <div style={{ fontSize: 24, color: T.ink3, fontWeight: 500 }}>{range}</div>
        </div>
        <div style={{ marginTop: 24, display: 'flex', alignItems: 'flex-end', gap: 30 }}>
          {value == null ? (
            <div style={{ height: 150, display: 'flex', alignItems: 'flex-end' }}>
              <NA size={36} />
            </div>
          ) : (
            <BigNumber value={value} at={at} decimals={0} unit="%" size={170} color={color} />
          )}
          {label && value != null && (
            <div style={{ paddingBottom: 14 }}>
              <Pill color={color} size={26} at={at + 30}>
                {label}
              </Pill>
            </div>
          )}
        </div>
      </div>
    </Rise>
    {note && noteAt != null && (
      <Rise at={noteAt}>
        <div style={{ marginTop: 24, fontSize: 28, lineHeight: 1.45, fontWeight: 700, color: T.ink }}>{note}</div>
      </Rise>
    )}
  </div>
);
