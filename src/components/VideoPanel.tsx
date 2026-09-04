import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { PsgExplainer, VIDEO } from '../remotion/PsgExplainer';
import { applyAudio, buildScenes, totalFrames } from '../psg/script';
import type { ExplainerProps, PsgValues, SceneSpec } from '../psg/types';
import { browserTtsSupported, useKoreanVoices, useNarration, type NarrationMode } from '../tts/useNarration';
import { getRenderJob, getServerInfo, startRender, synthesizeScenes, type ServerInfo } from '../tts/api';

export const VideoPanel: React.FC<{ values: PsgValues }> = ({ values }) => {
  const playerRef = useRef<PlayerRef>(null);
  const voices = useKoreanVoices();
  const [voiceName, setVoiceName] = useState<string>('');
  const [rate, setRate] = useState(1);
  const [showCaptions, setShowCaptions] = useState(true);
  const [server, setServer] = useState<ServerInfo | null>(null);
  const [mode, setMode] = useState<NarrationMode>(browserTtsSupported ? 'browser' : 'off');
  const [serverScenes, setServerScenes] = useState<SceneSpec[] | null>(null);
  const [ttsBusy, setTtsBusy] = useState<string | null>(null);
  const [renderMsg, setRenderMsg] = useState<string | null>(null);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getServerInfo().then(setServer);
  }, []);

  // 브라우저 TTS / 자막 전용: 추정 길이 기반 대본
  const estimatedScenes = useMemo(() => buildScenes(values, rate), [values, rate]);
  // 값이 바뀌면 서버 합성 결과는 무효
  useEffect(() => {
    setServerScenes(null);
    setRenderUrl(null);
  }, [values]);

  const scenes = mode === 'server' && serverScenes ? serverScenes : estimatedScenes;
  const voice = useMemo(() => voices.find((v) => v.name === voiceName)?.voice ?? voices[0]?.voice ?? null, [voices, voiceName]);
  const { speakingNow } = useNarration({ playerRef, scenes, mode, voice, rate });

  const inputProps: ExplainerProps = useMemo(() => ({ values, scenes, showCaptions }), [values, scenes, showCaptions]);
  const duration = totalFrames(scenes);

  const synthesize = useCallback(async () => {
    setError(null);
    setTtsBusy('음성 합성 중…');
    try {
      const audio = await synthesizeScenes(buildScenes(values, 1), (d, t) => setTtsBusy(`음성 합성 중… ${d}/${t}`));
      setServerScenes(applyAudio(buildScenes(values, 1), audio));
      setMode('server');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTtsBusy(null);
    }
  }, [values]);

  const render = useCallback(async () => {
    setError(null);
    setRenderUrl(null);
    setRenderMsg('MP4 렌더링 준비 중…');
    try {
      let props = inputProps;
      if (mode !== 'server' || !serverScenes) {
        // MP4 에는 서버 TTS 음성이 들어가야 하므로 먼저 합성
        if (!server?.ttsProvider) throw new Error('MP4 에 음성을 넣으려면 서버에 TTS 가 설정되어야 합니다 (.env 참고).');
        setRenderMsg('음성 합성 중…');
        const audio = await synthesizeScenes(buildScenes(values, 1));
        const sc = applyAudio(buildScenes(values, 1), audio);
        setServerScenes(sc);
        setMode('server');
        props = { values, scenes: sc, showCaptions };
      }
      let job = await startRender(props);
      while (job.status === 'queued' || job.status === 'rendering') {
        setRenderMsg(`MP4 렌더링 중… ${Math.round(job.progress * 100)}%`);
        await new Promise((r) => setTimeout(r, 1200));
        job = await getRenderJob(job.id);
      }
      if (job.status === 'error') throw new Error(job.error ?? '렌더링 실패');
      setRenderUrl(job.url ?? null);
      setRenderMsg(null);
    } catch (e) {
      setError((e as Error).message);
      setRenderMsg(null);
    }
  }, [inputProps, mode, server, serverScenes, showCaptions, values]);

  const minutes = Math.floor(duration / VIDEO.fps / 60);
  const seconds = Math.round((duration / VIDEO.fps) % 60);

  return (
    <div className="video-panel">
      <div className="video-panel-head">
        <div>
          <h3>🎬 검사 결과 설명 영상</h3>
          <p>
            진료 전에 먼저 보세요 · 약 {minutes}분 {seconds}초 · {scenes.length}개 장면 · 음성 안내 {mode === 'off' ? '없음(자막만)' : mode === 'server' ? '서버 음성' : '브라우저 음성'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn"
            onClick={() => {
              playerRef.current?.seekTo(0);
              playerRef.current?.play();
            }}
          >
            ▶ 처음부터 재생
          </button>
          {server?.ttsProvider && mode !== 'server' && (
            <button className="btn secondary" onClick={synthesize} disabled={!!ttsBusy}>
              {ttsBusy ?? '🔊 고품질 음성으로 듣기'}
            </button>
          )}
          {server?.canRender && (
            <button className="btn secondary" onClick={render} disabled={!!renderMsg}>
              {renderMsg ?? '⬇ MP4 저장'}
            </button>
          )}
        </div>
      </div>

      <div className="player-wrap">
        <Player
          ref={playerRef}
          component={PsgExplainer}
          inputProps={inputProps}
          durationInFrames={duration}
          compositionWidth={VIDEO.width}
          compositionHeight={VIDEO.height}
          fps={VIDEO.fps}
          controls
          clickToPlay
          showVolumeControls={mode === 'server'}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      <div className="video-controls">
        <label>
          음성
          <select value={mode} onChange={(e) => setMode(e.target.value as NarrationMode)}>
            {browserTtsSupported && <option value="browser">브라우저 음성 (설치 불필요)</option>}
            {serverScenes && <option value="server">서버 음성 (고품질)</option>}
            <option value="off">음성 없이 자막만</option>
          </select>
        </label>
        {mode === 'browser' && voices.length > 0 && (
          <label>
            목소리
            <select value={voice?.name ?? ''} onChange={(e) => setVoiceName(e.target.value)}>
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </label>
        )}
        {mode === 'browser' && (
          <label>
            속도 {rate.toFixed(1)}×
            <input type="range" min={0.8} max={1.3} step={0.1} value={rate} onChange={(e) => setRate(parseFloat(e.target.value))} />
          </label>
        )}
        <label>
          <input type="checkbox" checked={showCaptions} onChange={(e) => setShowCaptions(e.target.checked)} /> 자막 표시
        </label>
        {speakingNow && <span className="narration-status">● 음성 안내 중</span>}
      </div>

      {renderUrl && (
        <div className="hint">
          ✅ 렌더링 완료 —{' '}
          <a href={renderUrl} download>
            MP4 다운로드
          </a>
        </div>
      )}
      {error && <div className="hint warn">⚠ {error}</div>}
      {mode === 'browser' && voices.length === 0 && browserTtsSupported && (
        <div className="hint warn">이 브라우저에는 한국어 음성이 없습니다. Windows 는 설정 → 시간 및 언어 → 음성에서 한국어 음성을 추가하거나, Chrome/Edge 를 사용해 주세요.</div>
      )}
      {!browserTtsSupported && <div className="hint warn">이 브라우저는 음성 합성을 지원하지 않아 자막만 표시됩니다.</div>}
      <div className="hint">
        브라우저 음성은 장면마다 읽기가 끝날 때까지 기다린 뒤 다음 장면으로 넘어갑니다. 이 영상은 결과 안내이며, 진단과 치료는 담당 의사가 결정합니다.
      </div>
    </div>
  );
};
