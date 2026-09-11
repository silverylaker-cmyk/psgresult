import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { RMI_MAX, getSeverity, metricById, rmiColor, rmiLabel } from '../../psg/metrics';
import { isPositional, positionalRatio } from '../../psg/script';
import type { PsgValues } from '../../psg/types';
import { AnimatedNumber, Body, Eyebrow, Headline, NA, Rise, SceneFrame, T, clamp, sev, ART_POSITION_W } from '../ui';
import { PositionArt } from '../illustrations';
import { ART_FILES, ArtGrid } from '../art';
import { sentenceStartFrame } from '../timing';
import type { SceneProps } from './IntroOutro';

export const PositionScene: React.FC<SceneProps & { values: PsgValues }> = ({ index, total, narration, values }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const rows = [
    { key: 'rmiSupine', label: '바로 누울 때', v: values.rmiSupine },
    { key: 'rmiLeft', label: '왼쪽으로', v: values.rmiLeft },
    { key: 'rmiRight', label: '오른쪽으로', v: values.rmiRight },
  ];
  const barsAt = sentenceStartFrame(narration, /이었습니다|읽지 못했/, durationInFrames, fps) ?? 80;
  const noteAt = sentenceStartFrame(narration, /더 불안정|안정적이었|큰 차이가|읽지 못했/, durationInFrames, fps);
  const snoreAt = sentenceStartFrame(narration, '코골이는', durationInFrames, fps);
  const positional = isPositional(values);
  const ratio = positionalRatio(values);
  const snoreZone = getSeverity(metricById('snorepct')!, values.snorepct);
  const noteOp = noteAt == null ? 0 : interpolate(frame, [noteAt, noteAt + 15], [0, 1], clamp);
  const allNull = rows.every((r) => r.v == null);
  const highlight = (noteOp > 0 && positional ? 'supine' : 'none') as 'supine' | 'side' | 'none';

  return (
    <SceneFrame index={index} total={total} artWidth={ART_POSITION_W} art={
        <ArtGrid
          columns={2}
          cellAspect={0.56}
          fallback={<PositionArt highlight={highlight} />}
          items={[
            { name: ART_FILES.positionSupine, label: '바로 누울 때', on: highlight !== 'side', active: highlight === 'supine' },
            { name: ART_FILES.positionSide, label: '옆으로 잘 때', on: highlight !== 'supine', active: highlight === 'side' },
          ]}
        />
      } split={0.56}>
      <Rise at={0}>
        <Eyebrow>자세 이야기</Eyebrow>
        <Headline style={{ marginTop: 14 }}>어떤 자세에서<br />더 힘들었나.</Headline>
      </Rise>
      <Rise at={20}>
        <Body size={27} style={{ marginTop: 20, maxWidth: 820 }}>
          바로 누우면 혀와 목젖이 뒤로 처져 숨길이 좁아지기 쉽습니다. 자세마다 호흡이 얼마나 흔들렸는지 따로 쟀습니다.
        </Body>
      </Rise>

      <div style={{ marginTop: 34, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {rows.map((r, i) => {
          const p = spring({ frame: frame - (barsAt + i * 14), fps, config: { damping: 20, stiffness: 70 } });
          const pct = r.v == null ? 0 : Math.min(100, (r.v / RMI_MAX) * 100) * p;
          const c = sev(rmiColor(r.v));
          const dim = positional && r.key !== 'rmiSupine' && noteOp > 0;
          return (
            <Rise key={r.key} at={barsAt + i * 14}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, opacity: dim ? 0.45 : 1 }}>
                <div style={{ width: 210, fontSize: 28, fontWeight: 700, color: T.ink }}>{r.label}</div>
                <div style={{ flex: 1, height: 18, borderRadius: 9, background: T.line, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: r.v == null ? T.line : c, borderRadius: 9 }} />
                </div>
                <div style={{ width: 190, display: 'flex', alignItems: 'baseline', gap: 10, justifyContent: 'flex-end' }}>
                  {r.v == null ? (
                    <NA size={24} />
                  ) : (
                    <>
                      <span style={{ fontSize: 48, fontWeight: 900, color: c, lineHeight: 1, letterSpacing: -1.5 }}>
                        <AnimatedNumber value={r.v} at={barsAt + i * 14} duration={40} />
                      </span>
                      <span style={{ fontSize: 20, fontWeight: 700, color: T.ink2 }}>{rmiLabel(r.v)}</span>
                    </>
                  )}
                </div>
              </div>
            </Rise>
          );
        })}
      </div>

      <div style={{ marginTop: 30, opacity: noteOp }}>
        <Body size={28} strong>
          {positional
            ? `바로 누울 때가 옆으로 잘 때보다 약 ${ratio ?? 2}배 불안정. 옆으로 자는 습관만으로도 달라질 수 있습니다.`
            : allNull
              ? '자세별 수치는 진료실에서 직접 확인해 드립니다.'
              : rows.every((r) => r.v == null || r.v < 20)
                ? '어느 자세에서든 호흡은 비교적 안정적이었습니다.'
                : '자세를 바꿔도 큰 차이가 없었습니다. 숨길 자체를 넓히는 방법을 생각해 볼 단계입니다.'}
        </Body>
      </div>

      {values.snorepct != null && (
        <Rise at={snoreAt ?? barsAt + 120}>
          <Body size={30} strong style={{ marginTop: 14 }}>
            코골이는 잠자는 시간의{' '}
            <span style={{ fontSize: 50, fontWeight: 900, color: sev(snoreZone?.c), letterSpacing: -1 }}>
              <AnimatedNumber value={values.snorepct} at={snoreAt ?? barsAt + 120} decimals={0} />%
            </span>{' '}
            동안 이어졌습니다.
          </Body>
          {snoreZone && snoreZone.l !== '정상' && (
            <Body size={24} style={{ marginTop: 4 }}>
              숨길이 좁아져 떨리는 소리입니다.
            </Body>
          )}
        </Rise>
      )}
    </SceneFrame>
  );
};
