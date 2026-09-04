import { SCENE_TAIL_SEC, splitSentences } from '../psg/script';

/**
 * 나레이션 안에서 특정 문구가 포함된 문장이 시작되는 프레임(장면 기준)을 구한다.
 * 자막(Captions)과 동일한 비례 배분을 쓰므로, 시각 요소를 "말하는 시점"에 맞춰 등장시킬 수 있다.
 */
export function sentenceStartFrame(
  narration: string,
  needle: string | RegExp,
  durationInFrames: number,
  fps: number,
): number | null {
  const sentences = splitSentences(narration);
  const speechFrames = Math.max(1, durationInFrames - SCENE_TAIL_SEC * fps);
  const totalChars = sentences.reduce((a, s) => a + s.length, 0) || 1;
  let acc = 0;
  for (const s of sentences) {
    const hit = typeof needle === 'string' ? s.includes(needle) : needle.test(s);
    if (hit) return Math.round(acc);
    acc += (s.length / totalChars) * speechFrames;
  }
  return null;
}
