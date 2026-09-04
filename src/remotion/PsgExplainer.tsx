import React from 'react';
import { AbsoluteFill, Audio, Sequence } from 'remotion';
import type { ExplainerProps, SceneSpec } from '../psg/types';
import { Captions, T } from './ui';
import { IntroScene, OutroScene } from './scenes/IntroOutro';
import { OverviewScene } from './scenes/Overview';
import { AhiScene } from './scenes/Ahi';
import { OxygenScene } from './scenes/Oxygen';
import { PositionScene } from './scenes/Position';
import { QualityScene } from './scenes/Quality';
import { DaytimeScene, OptionsScene } from './scenes/DaytimeOptions';

export const VIDEO = { width: 1920, height: 1080, fps: 30 } as const;

const DARK: ReadonlySet<SceneSpec['id']> = new Set();

export const PsgExplainer: React.FC<ExplainerProps> = ({ values, scenes, showCaptions }) => {
  let from = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: T.bg, fontFamily: T.font }}>
      {scenes.map((s, i) => {
        const start = from;
        from += s.durationInFrames;
        const common = { index: i, total: scenes.length, title: s.title, narration: s.narration, values };
        let body: React.ReactNode;
        switch (s.id) {
          case 'intro':
            body = <IntroScene {...common} />;
            break;
          case 'overview':
            body = <OverviewScene {...common} />;
            break;
          case 'ahi':
            body = <AhiScene {...common} />;
            break;
          case 'oxygen':
            body = <OxygenScene {...common} />;
            break;
          case 'position':
            body = <PositionScene {...common} />;
            break;
          case 'quality':
            body = <QualityScene {...common} />;
            break;
          case 'daytime':
            body = <DaytimeScene {...common} />;
            break;
          case 'options':
            body = <OptionsScene {...common} />;
            break;
          case 'outro':
            body = <OutroScene {...common} />;
            break;
        }
        return (
          <Sequence key={s.id} from={start} durationInFrames={s.durationInFrames} name={s.title}>
            {body}
            {showCaptions && <Captions narration={s.narration} dark={DARK.has(s.id)} />}
            {s.audioSrc && <Audio src={s.audioSrc} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
