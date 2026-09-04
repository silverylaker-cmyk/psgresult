import React, { useState } from 'react';
import { serverBase, setServerBase, type ServerInfo } from '../tts/api';
import { GOOGLE_VOICES, getGoogleKey, getGoogleVoice, setGoogleKey, setGoogleVoice, type CloudSource } from '../tts/cloud';

/** 음성·서버 설정. 값은 이 브라우저(localStorage)에만 저장된다. */
export const SettingsBox: React.FC<{ server: ServerInfo | null; cloud: CloudSource; onChange: () => void }> = ({ server, cloud, onChange }) => {
  const [key, setKey] = useState(getGoogleKey());
  const [voice, setVoice] = useState(getGoogleVoice());
  const [srv, setSrv] = useState(serverBase());
  const [saved, setSaved] = useState(false);

  const save = () => {
    setGoogleKey(key.trim());
    setGoogleVoice(voice);
    setServerBase(srv);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    onChange();
  };

  return (
    <div className="settings-box">
      <div className="settings-title">⚙ 음성 · 서버 설정</div>
      <div className="settings-status">
        현재 고품질 음성:{' '}
        {cloud?.kind === 'google-browser' ? 'Google Cloud TTS (브라우저에서 직접 호출)' : cloud?.kind === 'server' ? `서버 TTS (${cloud.provider})` : '없음 → 브라우저 내장 음성 사용'}
        {' · '}서버: {server ? `연결됨${server.canRender ? ' (MP4 가능)' : ''}` : '없음'}
      </div>

      <label className="settings-row">
        <span>Google Cloud TTS API 키</span>
        <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="AIza… (Cloud Text-to-Speech API 사용 설정 후 발급)" autoComplete="off" />
      </label>
      <label className="settings-row">
        <span>Google 목소리</span>
        <select value={voice} onChange={(e) => setVoice(e.target.value)}>
          {GOOGLE_VOICES.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </label>
      <label className="settings-row">
        <span>서버 주소 (선택, MP4 저장용)</span>
        <input value={srv} onChange={(e) => setSrv(e.target.value)} placeholder="예: https://psg-server.example.com  (비우면 같은 주소)" />
      </label>
      <div className="share-actions">
        <button className="btn" onClick={save}>
          {saved ? '✓ 저장됨' : '저장'}
        </button>
      </div>
      <div className="hint">
        API 키는 이 브라우저에만 저장됩니다. 공개 사이트에서 쓰는 키이므로 Google Cloud 콘솔에서 반드시 <b>HTTP 리퍼러 제한</b>(이 사이트 주소만 허용)과{' '}
        <b>API 제한</b>(Cloud Text-to-Speech API 만)을 걸고, 일일 사용량 한도도 설정해 주세요. 환자 휴대폰에서도 고품질 음성이 나오게 하려면 배포
        빌드에 VITE_GOOGLE_TTS_KEY 를 넣어야 합니다 (README 참고). 영상 하나당 약 1,500자 → Chirp 3 HD 기준 약 60원입니다.
      </div>
    </div>
  );
};
