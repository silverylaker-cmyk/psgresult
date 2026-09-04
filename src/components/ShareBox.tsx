import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * 환자용 링크 표시: 주소 + 복사 + QR + (모바일) 공유.
 * 문자 앱은 붙이지 않는다 — 링크만 복사해서 병원의 문자 발송 시스템이나 카카오톡에 붙여 넣으면 된다.
 */
export const ShareBox: React.FC<{ url: string; title: string; note?: React.ReactNode }> = ({ url, title, note }) => {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(url, { margin: 1, width: 176, color: { dark: '#1b3a4b', light: '#ffffff' } })
      .then((d) => alive && setQr(d))
      .catch(() => alive && setQr(null));
    return () => {
      alive = false;
    };
  }, [url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div className="share-box">
      {qr && <img className="share-qr" src={qr} alt="환자용 링크 QR 코드" width={176} height={176} />}
      <div className="share-body">
        <div className="share-title">{title}</div>
        <input className="share-url" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
        <div className="share-actions">
          <button className="btn" onClick={copy}>
            {copied ? '✓ 복사됨' : '링크 복사'}
          </button>
          {canShare && (
            <button className="btn secondary" onClick={() => navigator.share({ title: '수면다원검사 결과 안내', url }).catch(() => {})}>
              공유…
            </button>
          )}
          <a className="btn secondary" href={url} target="_blank" rel="noreferrer">
            새 창에서 열기
          </a>
        </div>
        {note && <div className="hint">{note}</div>}
      </div>
    </div>
  );
};
