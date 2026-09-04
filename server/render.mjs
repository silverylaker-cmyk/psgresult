/**
 * Remotion 서버 렌더링. 컴포지션 번들은 최초 1회 만들고 재사용한다.
 */
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let bundlePromise = null;

export function prepareBundle() {
  if (!bundlePromise) {
    bundlePromise = bundle({
      entryPoint: path.join(ROOT, 'src/remotion/index.ts'),
      onProgress: () => {},
    });
  }
  return bundlePromise;
}

/**
 * @param {object} inputProps  { values, scenes, showCaptions }
 * @param {string} outFile
 * @param {(p:number)=>void} onProgress
 */
export async function renderVideo(inputProps, outFile, onProgress) {
  const serveUrl = await prepareBundle();
  const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || undefined;
  const composition = await selectComposition({ serveUrl, id: 'PsgExplainer', inputProps, browserExecutable });
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: outFile,
    inputProps,
    browserExecutable,
    onProgress: ({ progress }) => onProgress?.(progress),
    chromiumOptions: { gl: 'swangle' },
  });
  return outFile;
}
