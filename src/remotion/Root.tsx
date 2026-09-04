import React from 'react';
import { Composition } from 'remotion';
import { PsgExplainer, VIDEO } from './PsgExplainer';
import { SAMPLE_VALUES, buildScenes, totalFrames } from '../psg/script';
import type { ExplainerProps } from '../psg/types';

/**
 * Remotion Studio / CLI 진입점.
 * inputProps 로 { values, scenes, showCaptions } 를 넘기면 그 값으로 렌더링된다 (scripts/render.mjs 참고).
 */
export const RemotionRoot: React.FC = () => {
  const defaultProps: ExplainerProps = {
    values: SAMPLE_VALUES,
    scenes: buildScenes(SAMPLE_VALUES),
    showCaptions: true,
  };
  return (
    <Composition
      id="PsgExplainer"
      component={PsgExplainer}
      width={VIDEO.width}
      height={VIDEO.height}
      fps={VIDEO.fps}
      durationInFrames={totalFrames(defaultProps.scenes)}
      defaultProps={defaultProps}
      calculateMetadata={({ props }) => ({ durationInFrames: totalFrames(props.scenes) })}
    />
  );
};
