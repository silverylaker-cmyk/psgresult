/**
 * 카카오톡·인스타그램 등 앱 안의 웹뷰(인앱 브라우저) 감지.
 * 인앱 브라우저는 기기 내장 음성(Web Speech API)이 없거나 소리가 나지 않는 경우가 많다.
 */
export function detectInApp(): { kakao: boolean; other: boolean; ios: boolean; android: boolean } {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const kakao = /KAKAOTALK/i.test(ua);
  const other = /Instagram|FBAN|FBAV|Line\/|NAVER\(inapp|DaumApps|SamsungBrowser\/[0-9.]+ .*wv|; wv\)/i.test(ua);
  return { kakao, other, ios: /iPhone|iPad|iPod/i.test(ua), android: /Android/i.test(ua) };
}

/** 인앱 브라우저에서 기본 브라우저(크롬·사파리)로 같은 주소를 연다 */
export function openInExternalBrowser(url: string = window.location.href) {
  const { kakao, android } = detectInApp();
  if (kakao) {
    // 카카오톡 공식 스킴: 외부 브라우저로 열기
    window.location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url);
    return;
  }
  if (android) {
    // 안드로이드: Chrome intent
    const u = new URL(url);
    window.location.href = `intent://${u.host}${u.pathname}${u.search}${u.hash}#Intent;scheme=${u.protocol.replace(':', '')};package=com.android.chrome;end`;
    return;
  }
  // iOS 등: 새 창 시도 (안 되면 사용자가 메뉴에서 "Safari로 열기")
  window.open(url, '_blank');
}

/** 브라우저 내장 음성을 실제로 쓸 수 있는지 (API 존재 + 목소리 목록) */
export function speechLikelyWorks(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  try {
    return speechSynthesis.getVoices().length > 0 || !detectInApp().kakao;
  } catch {
    return false;
  }
}
