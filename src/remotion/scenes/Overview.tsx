import React from 'react';
import { useVideoConfig } from 'remotion';
import type { PsgValues } from '../../psg/types';
import { AnimatedNumber, Card, Icon, Rise, SceneFrame, T } from '../ui';
import { sentenceStartFrame } from '../timing';
import type { SceneProps } from './IntroOutro';

const ITEMS = [
  { icon: 'breath', label: '숨', desc: '숨이 멈추거나\n얕아진 횟수' },
  { icon: 'oxygen', label: '산소', desc: '피 속 산소가\n떨어진 정도' },
  { icon: 'position', label: '자세', desc: '바로 누울 때와\n옆으로 잘 때' },
  { icon: 'sleep', label: '잠의 질', desc: '깊게 잔 시간과\n중간에 깬 정도' },
] as const;

export const OverviewScene: React.FC<SceneProps & { values: PsgValues }> = ({ index, total, title, narration, values }) => {
  const { durationInFrames, fps } = useVideoConfig();
  const listAt = sentenceStartFrame(narration, '횟수', durationInFrames, fps) ?? 20;
  const sumAt = sentenceStartFrame(narration, '주무신 시간', durationInFrames, fps);
  const hasSummary = values.tst != null || values.eff != null;

  return (
    <SceneFrame title={title} subtitle="코골이 소리만 듣는 검사가 아닙니다" index={index} total={total}>
      <div style={{ display: 'flex', gap: 28 }}>
        {ITEMS.map((it, i) => (
          <Rise key={it.label} at={listAt + i * 12} style={{ flex: 1 }}>
            <Card style={{ height: 330, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  background: '#e6f1f3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={it.icon} size={68} />
              </div>
              <div style={{ marginTop: 22, fontSize: 40, fontWeight: 900, color: T.navy }}>{it.label}</div>
              <div style={{ marginTop: 10, fontSize: 26, lineHeight: 1.45, color: T.gray, whiteSpace: 'pre-line' }}>{it.desc}</div>
            </Card>
          </Rise>
        ))}
      </div>

      {hasSummary && (
        <Rise at={sumAt ?? listAt + 70}>
          <div style={{ display: 'flex', gap: 24, marginTop: 34 }}>
            {values.tst != null && (
              <Summary label="실제로 주무신 시간">
                <AnimatedNumber value={values.tst / 60} at={(sumAt ?? 90) + 5} decimals={1} /> 시간
              </Summary>
            )}
            {values.eff != null && (
              <Summary label="수면 효율 (누워 있던 시간 중 잠든 비율)">
                <AnimatedNumber value={values.eff} at={(sumAt ?? 90) + 5} decimals={0} /> %
              </Summary>
            )}
          </div>
        </Rise>
      )}
    </SceneFrame>
  );
};

const Summary: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ flex: 1, background: '#e6f1f3', borderRadius: 22, padding: '22px 34px', display: 'flex', alignItems: 'baseline', gap: 24 }}>
    <div style={{ fontSize: 26, color: T.gray, fontWeight: 500 }}>{label}</div>
    <div style={{ fontSize: 48, fontWeight: 900, color: T.navy, marginLeft: 'auto' }}>{children}</div>
  </div>
);
