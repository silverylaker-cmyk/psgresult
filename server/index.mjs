/**
 * 선택 기능 서버: 고품질 TTS + MP4 렌더링.
 *
 *   npm run server          → http://localhost:3123
 *   (개발 중에는 vite 가 /api, /media 를 이 서버로 프록시한다. 배포 시에는 dist/ 를 이 서버가 함께 서빙한다.)
 *
 * 환경변수 (.env 또는 셸):
 *   TTS_PROVIDER = openai | edge | none   (기본: OPENAI_API_KEY 가 있으면 openai, 없으면 none)
 *   OPENAI_API_KEY, OPENAI_TTS_MODEL(기본 gpt-4o-mini-tts), OPENAI_TTS_VOICE(기본 nova)
 *   EDGE_TTS_VOICE (기본 ko-KR-SunHiNeural, `npm i msedge-tts` 필요)
 *   PORT (기본 3123)
 */
import express from 'express';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { synthesize, providerName } from './tts.mjs';
import { renderVideo, prepareBundle } from './render.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'output');
const TTS_DIR = path.join(OUT, 'tts');
const MP4_DIR = path.join(OUT, 'mp4');
for (const d of [OUT, TTS_DIR, MP4_DIR]) mkdirSync(d, { recursive: true });

loadDotEnv(path.join(ROOT, '.env'));

const PORT = Number(process.env.PORT || 3123);
const app = express();
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ttsProvider: providerName(), canRender: true });
});

/** 장면별 텍스트 → 오디오 파일. 같은 텍스트는 캐시된다. */
app.post('/api/tts', async (req, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items)) return res.status(400).send('items 배열이 필요합니다');
  if (!providerName()) return res.status(503).send('서버에 TTS 가 설정되어 있지 않습니다 (.env 의 TTS_PROVIDER / OPENAI_API_KEY 확인)');
  try {
    const out = [];
    for (const it of items) {
      const text = String(it.text ?? '');
      const hash = createHash('sha1').update(providerName() + '|' + text).digest('hex').slice(0, 20);
      const file = path.join(TTS_DIR, `${hash}.mp3`);
      if (!existsSync(file)) {
        const audio = await synthesize(text);
        writeFileSync(file, audio);
      }
      out.push({ id: it.id, url: `/media/tts/${hash}.mp3` });
    }
    res.json({ items: out });
  } catch (e) {
    console.error(e);
    res.status(500).send(String(e?.message ?? e));
  }
});

/** MP4 렌더링 (비동기 작업) */
const jobs = new Map();
app.post('/api/render', async (req, res) => {
  const props = req.body;
  if (!props?.values || !Array.isArray(props?.scenes)) return res.status(400).send('values, scenes 가 필요합니다');
  const id = createHash('sha1').update(JSON.stringify(props) + Date.now()).digest('hex').slice(0, 12);
  const job = { id, status: 'queued', progress: 0 };
  jobs.set(id, job);
  res.json(job);

  // 브라우저에서 넘어온 오디오 URL(/media/tts/..)을 렌더러가 읽을 수 있는 절대 경로로 바꾼다
  const scenes = props.scenes.map((s) => {
    if (!s.audioSrc) return s;
    const m = String(s.audioSrc).match(/\/media\/tts\/([a-f0-9]+\.mp3)/);
    return m ? { ...s, audioSrc: `http://localhost:${PORT}/media/tts/${m[1]}` } : s;
  });

  try {
    job.status = 'rendering';
    const outFile = path.join(MP4_DIR, `psg-${id}.mp4`);
    await renderVideo({ ...props, scenes }, outFile, (p) => (job.progress = p));
    job.status = 'done';
    job.progress = 1;
    job.url = `/media/mp4/psg-${id}.mp4`;
  } catch (e) {
    console.error(e);
    job.status = 'error';
    job.error = String(e?.message ?? e);
  }
});
app.get('/api/render/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).send('작업을 찾을 수 없습니다');
  res.json(job);
});

app.use('/media', express.static(OUT));

// 빌드된 정적 사이트가 있으면 함께 서빙 (npm run build 후)
const DIST = path.join(ROOT, 'dist');
if (existsSync(DIST)) app.use(express.static(DIST));

app.listen(PORT, () => {
  console.log(`[psgresult] server on http://localhost:${PORT}  (TTS: ${providerName() ?? '없음'})`);
  prepareBundle().catch((e) => console.error('Remotion 번들 준비 실패:', e));
});

function loadDotEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] == null) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
