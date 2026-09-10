import React, { useEffect, useState } from 'react';
import { getSharedVideo, type SharedVideo } from '../tts/api';

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
    <div className="player-wrap patient-player">
      <video src={video.mp4Url} controls playsInline preload="metadata" style={{ width: '100%', height: '100%', background: '#000' }} />
    </div>
  );
};
