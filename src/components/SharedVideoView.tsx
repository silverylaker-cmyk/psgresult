import React, { useEffect, useState } from 'react';
import { getSharedVideo, type SharedVideo } from '../tts/api';
import { Dashboard } from './Dashboard';

/** 서버가 렌더링한 MP4 를 가리키는 환자용 링크(#m=…) 화면 */
export const SharedVideoView: React.FC<{ id: string; server?: string }> = ({ id, server }) => {
  const [video, setVideo] = useState<SharedVideo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base = (server ?? '').replace(/\/+$/, '');
    getSharedVideo(id, base).then(setVideo).catch((e) => setError((e as Error).message));
  }, [id, server]);

  if (error) return <div className="err">{error}</div>;
  if (!video) return <div className="progress">영상을 불러오는 중…</div>;

  return (
    <>
      <div className="video-panel">
        <div className="video-panel-head">
          <div>
            <h3>🎬 검사 결과 설명 영상</h3>
            <p>진료 전에 먼저 보세요 · 소리를 켜고 재생해 주세요</p>
          </div>
          <a className="btn secondary" href={video.mp4Url} download={`psg-${video.id}.mp4`}>
            ⬇ 영상 저장
          </a>
        </div>
        <div className="player-wrap">
          <video src={video.mp4Url} controls playsInline preload="metadata" style={{ width: '100%', height: '100%', background: '#000' }} />
        </div>
        <div className="hint">이 영상은 결과 안내이며, 진단과 치료는 담당 의사가 결정합니다.</div>
      </div>
      <Dashboard values={video.props.values} />
    </>
  );
};
