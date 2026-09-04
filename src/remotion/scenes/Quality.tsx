import React from 'react';
import { useVideoConfig } from 'remotion';
import { getSeverity, metricById } from '../../psg/metrics';
import type { PsgValues } from '../../psg/types';
import { AnimatedNumber, Badge, Card, Icon, NA, Rise, SceneFrame, T } from '../ui';
import { sentenceStartFrame } from '../timing';
import type { SceneProps } from './IntroOutro';
import { Donut } from './Position';

export const QualityScene: React.FC<SceneProps & { values: PsgValues }> = ({ index, total, title, narration, values }) => {
  const { durationInFrames, fps } = useVideoConfig();
  const n3 = values.n3pct;
  const rem = values.rempct;
  const n3z = getSeverity(metricById('n3pct')!, n3);
  const remz = getSeverity(metricById('rempct')!, rem);

  const donutAt = sentenceStartFrame(narration, /N3 수면|렘수면은 전체|읽지 못했/, durationInFrames, fps) ?? 50;
  const n3NoteAt = sentenceStartFrame(narration, /깊은 잠이|깊은 잠은/, durationInFrames, fps);
  const remNoteAt = sentenceStartFrame(narration, /렘수면도|렘수면은 정상|렘수면 비율/, durationInFrames, fps);
  const rdiAt = sentenceStartFrame(narration, '잠깐씩 깬', durationInFrames, fps);

  return (
    <SceneFrame title={title} subtitle="깊은 잠은 몸을, 렘수면은 뇌를 회복시킵니다" index={index} total={total}>
      <div style={{ display: 'flex', gap: 34 }}>
        <StageCard
          at={donutAt}
          noteAt={n3NoteAt}
          name="N3 깊은 잠"
          sub="육체 회복 · 정상 15~20% 이상"
          value={n3}
          color={n3z?.c ?? T.teal}
          label={n3z?.l}
          note={n3 == null ? null : n3 <= 10 ? '많이 부족 — 숨이 막힐 때마다 뇌가 잠깐씩 깨어 깊은 잠에 못 들어갔을 수 있음' : n3 <= 15 ? '조금 부족' : '충분한 편'}
        />
        <StageCard
          at={donutAt + 12}
          noteAt={remNoteAt}
          name="REM 렘수면"
          sub="두뇌 회복 · 정상 15~25%"
          value={rem}
          color={remz?.c ?? T.teal}
          label={remz?.l}
          note={rem == null ? null : rem <= 15 ? '부족' : rem <= 25 ? '정상 범위' : '다소 높은 편'}
        />

        <div style={{ flex: '0 0 440px', display: 'flex', flexDirection: 'column', gap: 26 }}>
          <Rise at={donutAt + 24}>
            <Card style={{ display: 'flex', alignItems: 'center', gap: 22, padding: '24px 28px' }}>
              <Icon name="sleep" size={60} />
              <div style={{ fontSize: 24, lineHeight: 1.5, color: T.navy, fontWeight: 500 }}>
                숨이 막히면 뇌가 잠깐 깨어납니다.
                <br />
                본인은 기억하지 못해도 잠이 얕아집니다.
              </div>
            </Card>
          </Rise>
          {values.rdi != null && (
            <Rise at={rdiAt ?? donutAt + 120}>
              <Card style={{ padding: '24px 28px' }}>
                <div style={{ fontSize: 24, color: T.gray, fontWeight: 500 }}>숨이 불편해서 깬 것까지 포함 (RDI)</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 6 }}>
                  <div style={{ fontSize: 64, fontWeight: 900, color: T.navy, lineHeight: 1 }}>
                    <AnimatedNumber value={values.rdi} at={rdiAt ?? donutAt + 120} />
                  </div>
                  <div style={{ fontSize: 26, color: T.gray }}>회 / 시간</div>
                </div>
              </Card>
            </Rise>
          )}
        </div>
      </div>
    </SceneFrame>
  );
};

const StageCard: React.FC<{
  at: number;
  noteAt: number | null;
  name: string;
  sub: string;
  value: number | null;
  color: string;
  label?: string;
  note: string | null;
}> = ({ at, noteAt, name, sub, value, color, label, note }) => (
  <Rise at={at} style={{ flex: 1 }}>
    <Card style={{ height: 620, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{ fontSize: 36, fontWeight: 900, color: T.navy }}>{name}</div>
      <div style={{ fontSize: 22, color: T.gray }}>{sub}</div>
      {value == null ? (
        <div style={{ marginTop: 100 }}>
          <NA />
        </div>
      ) : (
        <>
          <div style={{ marginTop: 10 }}>
            <Donut value={value} at={at} color={color} size={280} max={40} label="전체 수면 중" />
          </div>
          {label && <Badge color={color} size={24}>{label}</Badge>}
        </>
      )}
      {note && noteAt != null && (
        <Rise at={noteAt} style={{ marginTop: 'auto' }}>
          <div style={{ fontSize: 22, lineHeight: 1.45, color: T.navy, textAlign: 'center', background: '#e6f1f3', borderRadius: 16, padding: '12px 18px' }}>{note}</div>
        </Rise>
      )}
    </Card>
  </Rise>
);
