import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { PsgExplainer, VIDEO } from '../remotion/PsgExplainer';
import { applyAudio, buildScenes, totalFrames } from '../psg/script';
import type { ExplainerProps, PsgValues, SceneSpec } from '../psg/types';
import { buildShareUrl } from '../psg/share';
import { browserTtsSupported, useKoreanVoices, useNarration, type NarrationMode } from '../tts/useNarration';
import { getRenderJob, getServerInfo, serverBase, startRender, uploadAudio, type ServerInfo } from '../tts/api';
import { resolveCloudSource, synthesizeScenes, type CloudSource, type SceneAudio } from '../tts/cloud';
import { ShareBox } from './ShareBox';
import { SettingsBox } from './SettingsBox';

/**
 * 영상 패널.
 *  - 의사용(기본): 재생 + 환자용 링크 만들기 + (서버가 있으면) MP4 저장 + 설정
 *  - 환자용(patient): 재생만. 링크로 열었을 때 쓴다.
 *
 * 음성 우선순위: 고품질(Google TTS 브라우저 직접 호출 또는 서버 TTS) → 브라우저 내장 음성 → 자막만
 */
export const VideoPanel: React.FC<{ values: PsgValues; patient?: boolean }> = ({ values, patient = false }) => {
  const playerRef = useRef<PlayerRef>(null);
  const voices = useKoreanVoices();
  const [voiceName, setVoiceName] = useState<string>('');
  const [rate, setRate] = useState(1);
  const [showCaptions, setShowCaptions] = useState(true);
  const [server, setServer] = useState<ServerInfo | null>(null);
  const [settingsVersion, setSettingsVersion] = useState(0);
  const [mode, setMode] = useState<NarrationMode>(browserTtsSupported ? 'browser' : 'off');
  const [cloudScenes, setCloudScenes] = useState<SceneSpec[] | null>(null);
  const cloudAudio = useRef<SceneAudio[]>([]);
  const [ttsBusy, setTtsBusy] = useState<string | null>(null);
  const [renderMsg, setRenderMsg] = useState<string | null>(null);
  const [mp4, setMp4] = useState<{ id: string; downloadUrl: string; shareUrl: string } | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getServerInfo().then(setServer);
  }, [settingsVersion]);

  const cloud: CloudSource = useMemo(() => resolveCloudSource(server), [server, settingsVersion]);

  // 브라우저 TTS / 자막 전용: 추정 길이 기반 대본
  const estimatedScenes = useMemo(() => buildScenes(values, rate), [values, rate]);
  const scenes = mode === 'cloud' && cloudScenes ? cloudScenes : estimatedScenes;
  const voice = useMemo(() => voices.find((v) => v.name === voiceName)?.voice ?? voices[0]?.voice ?? null, [voices, voiceName]);
  const { speakingNow } = useNarration({ playerRef, scenes, mode, voice, rate });

  const inputProps: ExplainerProps = useMemo(() => ({ values, scenes, showCaptions }), [values, scenes, showCaptions]);
  const duration = totalFrames(scenes);

  // 고품질 음성 합성 (값이 바뀌면 다시)
  const synthesize = useCallback(
    async (source: NonNullable<CloudSource>) => {
      setError(null);
      setTtsBusy('고품질 음성 준비 중…');
      try {
        const audio = await synthesizeScenes(source, buildScenes(values, 1), (d, t) => setTtsBusy(`고품질 음성 준비 중… ${d}/${t}`));
        cloudAudio.current = audio;
        setCloudScenes(applyAudio(buildScenes(values, 1), audio));
        setMode('cloud');
      } catch (e) {
        setError(`고품질 음성을 만들지 못해 브라우저 음성으로 재생합니다. (${(e as Error).message})`);
      } finally {
        setTtsBusy(null);
      }
    },
    [values],
  );

  const synthesizedFor = useRef<string>('');
  useEffect(() => {
    setCloudScenes(null);
    cloudAudio.current = [];
    setMp4(null);
    setShowShare(false);
    if (mode === 'cloud') setMode(browserTtsSupported ? 'browser' : 'off');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);
  useEffect(() => {
    if (!cloud) return;
    const key = JSON.stringify(values) + '|' + cloud.kind;
    if (synthesizedFor.current === key) return;
    synthesizedFor.current = key;
    synthesize(cloud);
  }, [cloud, synthesize, values]);

  // MP4 렌더링 (서버 필요). 음성은 서버 TTS 또는 브라우저에서 만든 오디오를 올려서 넣는다.
  const render = useCallback(async () => {
    setError(null);
    setMp4(null);
    setRenderMsg('MP4 준비 중…');
    try {
      let sc = cloudScenes;
      if (!sc || !cloudAudio.current.length) {
        if (!cloud) throw new Error('MP4 에 음성을 넣으려면 고품질 음성(Google TTS 키 또는 서버 TTS)이 필요합니다. ⚙ 설정을 확인해 주세요.');
        setRenderMsg('음성 합성 중…');
        const audio = await synthesizeScenes(cloud, buildScenes(values, 1));
        cloudAudio.current = audio;
        sc = applyAudio(buildScenes(values, 1), audio);
        setCloudScenes(sc);
        setMode('cloud');
      }
      // 브라우저에서 만든 오디오(blob:)는 서버가 읽을 수 없으므로 올려서 서버 주소로 바꾼다
      const needsUpload = cloudAudio.current.some((a) => a.src.startsWith('blob:'));
      if (needsUpload) {
        setRenderMsg('음성 파일 업로드 중…');
        const uploaded = await uploadAudio(cloudAudio.current);
        sc = sc.map((s) => {
          const u = uploaded.find((x) => x.id === s.id);
          return u ? { ...s, audioSrc: u.url } : s;
        });
      }
      let job = await startRender({ values, scenes: sc, showCaptions });
      while (job.status === 'queued' || job.status === 'rendering') {
        setRenderMsg(`MP4 만드는 중… ${Math.round(job.progress * 100)}%`);
        await new Promise((r) => setTimeout(r, 1200));
        job = await getRenderJob(job.id);
      }
      if (job.status === 'error' || !job.url) throw new Error(job.error ?? '렌더링 실패');
      const serverPublic = (server?.publicUrl || serverBase() || window.location.origin).replace(/\/+$/, '');
      const shareUrl = server?.publicUrl
        ? `${server.publicUrl.replace(/\/+$/, '')}/#m=${job.id}`
        : buildShareUrl({ mp4Id: job.id, server: serverBase() || undefined });
      setMp4({ id: job.id, downloadUrl: serverPublic + job.url, shareUrl });
      setShowShare(true);
      setRenderMsg(null);
    } catch (e) {
      setError((e as Error).message);
      setRenderMsg(null);
    }
  }, [cloud, cloudScenes, server, showCaptions, values]);

  const valuesShareUrl = useMemo(() => buildShareUrl({ values }), [values]);

  // 환자용 링크: 플레이어만 (훅은 모두 위에서 호출됨)
  if (patient) {
    return (
      <div className="player-wrap patient-player">
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
          showVolumeControls={mode === 'cloud'}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    );
  }

  const minutes = Math.floor(duration / VIDEO.fps / 60);
  const seconds = Math.round((duration / VIDEO.fps) % 60);
  const modeLabel = mode === 'off' ? '없음(자막만)' : mode === 'cloud' ? '고품질 음성' : '브라우저 음성';

  return (
    <div className="video-panel">
      <div className="video-panel-head">
        <div>
          <h3>🎬 검사 결과 설명 영상</h3>
          <p>
            진료 전에 먼저 보세요 · 약 {minutes}분 {seconds}초 · {scenes.length}개 장면 · 음성 안내 {modeLabel}
            {ttsBusy && <> · {ttsBusy}</>}
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
          {!patient && (
            <button className="btn secondary" onClick={() => setShowShare((s) => !s)}>
              📱 환자용 링크
            </button>
          )}
          {!patient && server?.canRender && (
            <button className="btn secondary" onClick={render} disabled={!!renderMsg || !!ttsBusy}>
              {renderMsg ?? '⬇ MP4 만들기'}
            </button>
          )}
          {!patient && (
            <button className="btn secondary" onClick={() => setShowSettings((s) => !s)} title="음성·서버 설정">
              ⚙
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
          showVolumeControls={mode === 'cloud'}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      <div className="video-controls">
        <label>
          음성
          <select value={mode} onChange={(e) => setMode(e.target.value as NarrationMode)}>
            {cloudScenes && <option value="cloud">고품질 음성</option>}
            {browserTtsSupported && <option value="browser">브라우저 음성 (설치 불필요)</option>}
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

      {!patient && showShare && (
        <div className="share-section">
          {mp4 ? (
            <ShareBox
              url={mp4.shareUrl}
              title="환자용 MP4 링크 (완성된 영상 · 어떤 휴대폰에서도 바로 재생)"
              note={
                <>
                  <a href={mp4.downloadUrl} download={`psg-${mp4.id}.mp4`}>
                    ⬇ MP4 파일 다운로드
                  </a>
                  {' · '}이 링크는 서버에 파일이 남아 있는 동안 유효합니다.
                </>
              }
            />
          ) : null}
          <ShareBox
            url={valuesShareUrl}
            title={mp4 ? '환자용 링크 (서버 없이 재생되는 버전)' : '환자용 링크'}
            note={
              <>
                이 링크는 검사 수치만 담고 있고 이름·생년월일 등 개인정보는 들어 있지 않습니다. 환자 휴대폰에서 열면 같은 영상이 만들어져 재생됩니다
                {cloud ? ' (고품질 음성 포함)' : ' (휴대폰 내장 음성 사용)'}. 문자·카카오톡에 붙여 넣어 보내세요.
              </>
            }
          />
        </div>
      )}

      {!patient && showSettings && (
        <SettingsBox
          server={server}
          cloud={cloud}
          onChange={() => {
            synthesizedFor.current = '';
            setSettingsVersion((v) => v + 1);
          }}
        />
      )}

      {error && <div className="hint warn">⚠ {error}</div>}
      {mode === 'browser' && voices.length === 0 && browserTtsSupported && (
        <div className="hint warn">이 브라우저에는 한국어 음성이 없습니다. Windows 는 설정 → 시간 및 언어 → 음성에서 한국어 음성을 추가하거나, Chrome/Edge 를 사용해 주세요.</div>
      )}
      {!browserTtsSupported && !cloudScenes && <div className="hint warn">이 브라우저는 음성 합성을 지원하지 않아 자막만 표시됩니다.</div>}
      <div className="hint">
        {mode === 'browser' && '브라우저 음성은 장면마다 읽기가 끝날 때까지 기다린 뒤 다음 장면으로 넘어갑니다. '}
        이 영상은 결과 안내이며, 진단과 치료는 담당 의사가 결정합니다.
      </div>
    </div>
  );
};
