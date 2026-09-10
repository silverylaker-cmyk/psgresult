import React, { useCallback, useEffect, useRef, useState } from 'react';
import { extractFromPdf } from './psg/extract';
import { SAMPLE_VALUES } from './psg/script';
import { parseShareHash, type ShareTarget } from './psg/share';
import type { PsgValues } from './psg/types';
import { Dashboard } from './components/Dashboard';
import { VideoPanel } from './components/VideoPanel';
import { SharedVideoView } from './components/SharedVideoView';

export const App: React.FC = () => {
  const [share, setShare] = useState<ShareTarget | null>(() => parseShareHash());
  useEffect(() => {
    const onHash = () => setShare(parseShareHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // 환자용 링크로 열렸으면 업로드 화면 없이 영상만 보여준다
  if (share) return <PatientView share={share} />;
  return <DoctorView />;
};

/** 환자용 링크: 영상만 보여 준다 (제목·설정·대시보드 없음) */
const PatientView: React.FC<{ share: ShareTarget }> = ({ share }) => (
  <div className="patient">
    {share.mp4Id ? <SharedVideoView id={share.mp4Id} server={share.server} /> : share.values ? <VideoPanel values={share.values} patient /> : null}
  </div>
);

const DoctorView: React.FC = () => {
  const [values, setValues] = useState<PsgValues | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (file: File) => {
    setBusy(true);
    setError(null);
    setValues(null);
    try {
      const r = await extractFromPdf(file);
      setText(r.text);
      setValues(r.values);
    } catch (e) {
      setError('PDF 읽기 오류: ' + (e as Error).message);
      console.error(e);
    } finally {
      setBusy(false);
    }
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))) load(f);
    else setError('PDF 파일만 업로드 가능합니다.');
  };

  return (
    <>
      <div className="header">
        <h1>수면다원검사 결과 안내</h1>
        <p>REM Logic 형식의 수면다원검사 PDF를 올리면 환자용 설명 영상과 주요 지표 시각화를 자동으로 만듭니다</p>
      </div>

      <div
        className={'upload-zone' + (drag ? ' drag' : '')}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        <div className="icon">📋</div>
        <h2>PDF 파일을 여기에 드래그하거나 클릭하여 업로드</h2>
        <p>수면다원검사 결과지 PDF 파일 (REM Logic 형식)</p>
        <div className="demo">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setError(null);
              setText('');
              setValues(SAMPLE_VALUES);
            }}
          >
            예시 결과로 영상 미리보기
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) load(f);
            e.target.value = '';
          }}
        />
      </div>

      {busy && <div className="progress">PDF 분석 중... 잠시 기다려 주세요.</div>}
      {error && <div className="err">{error}</div>}

      {values && (
        <>
          <VideoPanel values={values} />
          <Dashboard values={values} />
          {text && (
            <div className="debug-section">
              <button className="debug-toggle" onClick={() => setShowDebug((s) => !s)}>
                {showDebug ? '▲' : '▼'} 추출된 텍스트 보기 (디버그)
              </button>
              {showDebug && <div className="debug-text">{text}</div>}
            </div>
          )}
        </>
      )}
    </>
  );
};
