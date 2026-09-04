/**
 * TTS 공급자. 텍스트 → MP3 Buffer.
 *   google : Google Cloud Text-to-Speech (GOOGLE_TTS_API_KEY 필요, 유료 · 한국어 품질 가장 좋음: Chirp 3 HD)
 *   openai : OpenAI Audio API (OPENAI_API_KEY 필요, 유료)
 *   edge   : Microsoft Edge 읽어주기 음성 (무료, 비공식 · `npm i msedge-tts` 필요)
 */

export function providerName() {
  const p = (process.env.TTS_PROVIDER || '').toLowerCase();
  if (p === 'none') return null;
  if (p === 'google' || p === 'openai' || p === 'edge') return p;
  if (process.env.GOOGLE_TTS_API_KEY) return 'google';
  return process.env.OPENAI_API_KEY ? 'openai' : null;
}

export async function synthesize(text) {
  const p = providerName();
  if (p === 'google') return googleTts(text);
  if (p === 'openai') return openaiTts(text);
  if (p === 'edge') return edgeTts(text);
  throw new Error('TTS 공급자가 설정되지 않았습니다');
}

async function googleTts(text, voice = process.env.GOOGLE_TTS_VOICE || 'ko-KR-Chirp3-HD-Aoede') {
  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) throw new Error('GOOGLE_TTS_API_KEY 가 없습니다');
  const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: 'ko-KR', name: voice },
      audioConfig: { audioEncoding: 'MP3', speakingRate: Number(process.env.GOOGLE_TTS_RATE || 1) },
    }),
  });
  if (!r.ok) {
    const body = await r.text();
    // 선택한 음성이 지원되지 않으면 Neural2 로 한 번 더 시도
    if (voice !== 'ko-KR-Neural2-A' && (r.status === 400 || r.status === 404)) {
      console.warn(`[tts] ${voice} 실패(${r.status}), ko-KR-Neural2-A 로 재시도`);
      return googleTts(text, 'ko-KR-Neural2-A');
    }
    throw new Error(`Google TTS 오류 ${r.status}: ${body}`);
  }
  const { audioContent } = await r.json();
  return Buffer.from(audioContent, 'base64');
}

async function openaiTts(text) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY 가 없습니다');
  const r = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
      voice: process.env.OPENAI_TTS_VOICE || 'nova',
      input: text,
      response_format: 'mp3',
      instructions: '한국어. 병원에서 환자에게 검사 결과를 차분하고 친절하게 설명하는 톤. 또박또박, 너무 빠르지 않게.',
    }),
  });
  if (!r.ok) throw new Error(`OpenAI TTS 오류 ${r.status}: ${await r.text()}`);
  return Buffer.from(await r.arrayBuffer());
}

async function edgeTts(text) {
  let mod;
  try {
    mod = await import('msedge-tts');
  } catch {
    throw new Error('msedge-tts 패키지가 필요합니다: npm i msedge-tts');
  }
  const { MsEdgeTTS, OUTPUT_FORMAT } = mod;
  const tts = new MsEdgeTTS();
  await tts.setMetadata(process.env.EDGE_TTS_VOICE || 'ko-KR-SunHiNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text);
  const chunks = [];
  await new Promise((resolve, reject) => {
    audioStream.on('data', (d) => chunks.push(d));
    audioStream.on('end', resolve);
    audioStream.on('error', reject);
  });
  return Buffer.concat(chunks);
}
