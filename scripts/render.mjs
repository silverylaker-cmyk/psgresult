/**
 * CLI 렌더링: 수치 JSON → MP4 (음성 없이 자막만, 또는 서버 TTS 캐시 오디오 포함)
 *
 *   node scripts/render.mjs                          # 예시 값으로 out/psg-sample.mp4
 *   node scripts/render.mjs values.json out/x.mp4    # values.json: { "ahi": 22.4, "lowestspo2": 82, ... }
 *   node scripts/render.mjs values.json out/x.mp4 --tts   # 서버 TTS 로 음성 합성 후 포함 (.env 필요)
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { renderVideo } from '../server/render.mjs';
import { synthesize, providerName } from '../server/tts.mjs';

const [, , valuesFile, outArg, ...flags] = process.argv;
const useTts = flags.includes('--tts');

// TypeScript 대본 생성기를 그대로 쓰기 위해 esbuild 로 잠깐 변환한다 (vite 에 포함된 esbuild 사용)
const esbuild = await import('esbuild');
const built = await esbuild.build({
  entryPoints: [path.resolve('src/psg/script.ts')],
  bundle: true,
  format: 'esm',
  write: false,
  platform: 'node',
});
const tmp = path.resolve('node_modules/.cache/psg-script.mjs');
mkdirSync(path.dirname(tmp), { recursive: true });
writeFileSync(tmp, built.outputFiles[0].text);
const { SAMPLE_VALUES, buildScenes, applyAudio, toSpoken } = await import(tmp);

const values = valuesFile ? { ...SAMPLE_VALUES, ...JSON.parse(readFileSync(valuesFile, 'utf8')) } : SAMPLE_VALUES;
const out = path.resolve(outArg || 'out/psg-sample.mp4');
mkdirSync(path.dirname(out), { recursive: true });

let scenes = buildScenes(values, 1);
if (useTts) {
  if (!providerName()) throw new Error('TTS 공급자가 설정되지 않았습니다 (.env)');
  const dir = path.resolve('server/output/tts');
  mkdirSync(dir, { recursive: true });
  const audio = [];
  for (const s of scenes) {
    const spoken = toSpoken(s.narration);
    const hash = createHash('sha1').update(providerName() + '|' + spoken).digest('hex').slice(0, 20);
    const file = path.join(dir, `${hash}.mp3`);
    if (!existsSync(file)) writeFileSync(file, await synthesize(spoken));
    const durationSec = mp3Duration(file);
    audio.push({ id: s.id, src: file, durationSec });
    console.log(`  🔊 ${s.id}: ${durationSec.toFixed(1)}s`);
  }
  scenes = applyAudio(scenes, audio);
}

console.log(`렌더링 → ${out}`);
await renderVideo({ values, scenes, showCaptions: true }, out, (p) => {
  process.stdout.write(`\r  ${Math.round(p * 100)}%`);
});
console.log('\n완료');

/** ffprobe 가 있으면 정확히, 없으면 Remotion 의 ffprobe 를 사용해 오디오 길이를 잰다 */
function mp3Duration(file) {
  try {
    const s = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
    return parseFloat(s.trim());
  } catch {
    // @remotion/renderer 는 자체 ffprobe 를 내장한다
    const remotionFfprobe = path.resolve('node_modules/@remotion/compositor-' + process.platform + '-' + (process.arch === 'arm64' ? 'arm64' : 'x64'), 'ffprobe');
    const s = execFileSync(remotionFfprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
    return parseFloat(s.trim());
  }
}
