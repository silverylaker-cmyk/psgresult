import { getSeverity, metricById } from './metrics';
import type { PsgValues, SceneId, SceneSpec } from './types';

export const FPS = 30;
/** 나레이션이 끝난 뒤 장면 전환까지 남겨 두는 여유 (초) */
export const SCENE_TAIL_SEC = 1.0;

/**
 * 한국어 TTS 발화 시간 추정. (브라우저 TTS 는 실제 길이를 미리 알 수 없어 추정치를 쓰고,
 * 장면 끝에서 발화가 끝날 때까지 기다리도록 플레이어가 보정한다.)
 */
export function estimateSpeechSeconds(text: string, rate = 1): number {
  const chars = text.replace(/[\s.,!?…·]/g, '').length;
  const sentences = splitSentences(text).length;
  const sec = chars * 0.165 + sentences * 0.45;
  return sec / rate;
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const fmt1 = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const pct = (n: number) => `${fmt1(n)}퍼센트`;

type Severity = 'normal' | 'mild' | 'moderate' | 'severe' | 'unknown';

export function ahiSeverity(ahi: number | null): Severity {
  if (ahi == null) return 'unknown';
  if (ahi < 5) return 'normal';
  if (ahi < 15) return 'mild';
  if (ahi < 30) return 'moderate';
  return 'severe';
}

/** 바로 누울 때 호흡 불안정이 옆으로 잘 때보다 뚜렷하게 높은가 (자세 의존성) */
export function isPositional(v: PsgValues): boolean {
  const sides = [v.rmiLeft, v.rmiRight].filter((x): x is number => x != null);
  if (v.rmiSupine == null || sides.length === 0) return false;
  const best = Math.min(...sides);
  return v.rmiSupine >= 20 && v.rmiSupine >= best * 1.5;
}

interface Draft {
  id: SceneId;
  title: string;
  narration: string;
  minFrames: number;
}

/** 전체 길이(분) — 인트로 문구와 UI 에서 사용 */
export function estimatedMinutes(drafts: Draft[], rate = 1): number {
  const sec = drafts.reduce((a, d) => a + Math.max(d.minFrames / FPS, estimateSpeechSeconds(d.narration, rate) + SCENE_TAIL_SEC), 0);
  return Math.max(1, Math.round(sec / 60));
}

/** 검사 수치에 맞춰 장면별 나레이션을 만든다. */
export function buildDrafts(v: PsgValues, rate = 1): Draft[] {
  const body = buildBodyDrafts(v);
  const minutes = estimatedMinutes(body, rate);
  const intro: Draft = {
    id: 'intro',
    title: '진료 전에 먼저 보세요',
    narration:
      '안녕하세요. 진료 전에 미리 보시는 수면다원검사 결과 안내입니다. ' +
      '의사 선생님이 숫자 하나하나를 설명하기 전에, 오늘 검사가 무엇을 의미하는지만 먼저 정리해 드릴게요. ' +
      `약 ${minutes}분 정도 걸립니다.`,
    minFrames: FPS * 5,
  };
  return [intro, ...body];
}

function buildBodyDrafts(v: PsgValues): Draft[] {
  const sev = ahiSeverity(v.ahi);
  const drafts: Draft[] = [];

  // 2. 오늘 무엇을 봤나요
  {
    let n =
      '오늘 검사에서는 네 가지를 봤습니다. ' +
      '자면서 숨이 멈추거나 얕아진 횟수, 그때 피 속 산소가 얼마나 떨어졌는지, ' +
      '바로 누울 때와 옆으로 잘 때의 차이, 그리고 깊게 잔 시간과 중간에 깬 정도입니다. ' +
      '코골이 소리만 듣는 검사가 아닙니다.';
    if (v.tst != null && v.eff != null) {
      n += ` 이번 검사에서 실제로 주무신 시간은 약 ${(v.tst / 60).toFixed(1)}시간, 수면 효율은 ${Math.round(v.eff)}퍼센트였습니다.`;
    } else if (v.tst != null) {
      n += ` 이번 검사에서 실제로 주무신 시간은 약 ${(v.tst / 60).toFixed(1)}시간이었습니다.`;
    }
    drafts.push({ id: 'overview', title: '오늘 무엇을 봤나요', narration: n, minFrames: FPS * 6 });
  }

  // 3. AHI
  {
    let n =
      '기억할 숫자는 하나, AHI입니다. ' +
      'AHI는 잠든 한 시간 동안 숨이 멈추거나 매우 얕아진 평균 횟수입니다. ' +
      '5회 미만이면 정상, 5에서 15회는 경증, 15에서 30회는 중등도, 30회 이상은 중증으로 봅니다. ';
    if (v.ahi == null) {
      n += '이번 결과지에서는 AHI 값을 자동으로 읽지 못했습니다. 진료실에서 직접 확인해 드리겠습니다.';
    } else {
      const label = { normal: '정상', mild: '경증', moderate: '중등도', severe: '중증', unknown: '' }[sev];
      n += `환자분의 AHI는 시간당 ${fmt1(v.ahi)}회로, ${label} 범위에 해당합니다. `;
      n += `한 시간에 약 ${Math.round(v.ahi)}번, 숨이 얕아지거나 멈췄다는 뜻입니다. `;
      n += {
        normal: '수면 중 호흡은 비교적 안정적이었습니다. 코골이나 낮 졸음이 있다면 다른 지표도 함께 봅니다.',
        mild: '생활 습관과 자세 교정으로 좋아지는 경우가 많은 단계입니다.',
        moderate: '적극적인 치료를 상의할 단계입니다.',
        severe: '치료를 미루지 않는 것이 중요한 단계입니다.',
        unknown: '',
      }[sev];
    }
    drafts.push({ id: 'ahi', title: '기억할 숫자는 하나, AHI', narration: n, minFrames: FPS * 7 });
  }

  // 4. 산소
  {
    let n =
      '다음은 산소입니다. 숨이 막히면 피 속 산소가 떨어집니다. ' +
      '보통 깨어 있을 때는 95퍼센트 이상이고, 90퍼센트 아래로 자주 내려가면 몸에 부담이 됩니다. ';
    if (v.lowestspo2 == null) {
      n += '이번 결과지에서는 최저 산소포화도 값을 자동으로 읽지 못했습니다.';
    } else {
      const z = getSeverity(metricById('lowestspo2')!, v.lowestspo2);
      n += `환자분의 최저 산소포화도는 ${Math.round(v.lowestspo2)}퍼센트였습니다. `;
      const l = z?.l ?? '';
      n +=
        l === '정상'
          ? '정상 범위로, 잠자는 동안에도 산소는 잘 유지되었습니다.'
          : l === '경증 저하'
            ? '산소가 살짝 떨어지는 순간이 있었습니다.'
            : l === '중등도 저하'
              ? '잠자는 동안 몸에 들어가는 산소가 꽤 부족했던 순간이 있었습니다.'
              : '잠자는 동안 몸에 들어가는 산소가 많이 부족했던 순간이 있었습니다.';
    }
    drafts.push({ id: 'oxygen', title: '산소는 얼마나 떨어졌나요', narration: n, minFrames: FPS * 6 });
  }

  // 5. 자세 + 코골이
  {
    let n = '자세도 중요합니다. 바로 누울 때와 옆으로 잘 때, 호흡이 얼마나 불안정해지는지를 비교했습니다. ';
    const parts: string[] = [];
    if (v.rmiSupine != null) parts.push(`바로 누울 때 ${fmt1(v.rmiSupine)}`);
    if (v.rmiLeft != null) parts.push(`왼쪽으로 잘 때 ${fmt1(v.rmiLeft)}`);
    if (v.rmiRight != null) parts.push(`오른쪽으로 잘 때 ${fmt1(v.rmiRight)}`);
    if (parts.length === 0) {
      n += '이번 결과지에서는 자세별 수치를 자동으로 읽지 못했습니다. ';
    } else {
      n += parts.join(', ') + '이었습니다. ';
      if (isPositional(v)) {
        n += '바로 누울 때 호흡이 더 불안정해집니다. 옆으로 자면 횟수가 줄어드는 경우가 있어서, 자세 교정이 치료 후보 중 하나가 될 수 있습니다. ';
      } else if ([v.rmiSupine, v.rmiLeft, v.rmiRight].every((x) => x == null || x < 20)) {
        n += '어느 자세에서도 호흡 불안정은 낮은 편이었습니다. ';
      } else {
        n += '자세와 관계없이 비슷하게 나타났습니다. ';
      }
    }
    if (v.snorepct != null) {
      const z = getSeverity(metricById('snorepct')!, v.snorepct);
      n += `코골이는 잠자는 시간의 ${Math.round(v.snorepct)}퍼센트 동안 있었습니다.`;
      if (z && z.l !== '정상') n += ' 코골이 자체도 숨길이 좁아졌다는 신호입니다.';
    }
    drafts.push({ id: 'position', title: '자세에 따라 달라지나요', narration: n.trim(), minFrames: FPS * 6 });
  }

  // 6. 잠의 질
  {
    let n = '잠의 질도 봤습니다. 깊은 잠은 몸을 회복시키고, 꿈을 꾸는 렘수면은 뇌를 회복시킵니다. ';
    if (v.n3pct != null && v.rempct != null) {
      n += `깊은 잠인 N3 수면은 전체의 ${pct(v.n3pct)}, 렘수면은 ${pct(v.rempct)}였습니다. `;
    } else if (v.n3pct != null) {
      n += `깊은 잠인 N3 수면은 전체의 ${pct(v.n3pct)}였습니다. `;
    } else if (v.rempct != null) {
      n += `렘수면은 전체의 ${pct(v.rempct)}였습니다. `;
    } else {
      n += '이번 결과지에서는 수면 단계 비율을 자동으로 읽지 못했습니다. ';
    }
    if (v.n3pct != null) {
      n +=
        v.n3pct <= 10
          ? '깊은 잠이 많이 부족했습니다. 숨이 막힐 때마다 뇌가 잠깐씩 깨면서, 깊은 잠에 들어가지 못했을 가능성이 있습니다. '
          : v.n3pct <= 15
            ? '깊은 잠이 조금 부족했습니다. '
            : '깊은 잠은 충분한 편이었습니다. ';
    }
    if (v.rempct != null) {
      n += v.rempct <= 15 ? '렘수면도 부족했습니다. ' : v.rempct <= 25 ? '렘수면은 정상 범위였습니다. ' : '렘수면 비율은 다소 높은 편이었습니다. ';
    }
    if (v.rdi != null) {
      n += `숨이 불편해서 잠깐씩 깬 것까지 포함하면, 한 시간에 ${fmt1(v.rdi)}회였습니다.`;
    }
    drafts.push({ id: 'quality', title: '얼마나 깊이 잤나요', narration: n.trim(), minFrames: FPS * 6 });
  }

  // 7. 낮에 어떤 일이 생기나요
  {
    const lead =
      sev === 'normal'
        ? '환자분의 결과는 정상 범위에 가깝지만, 참고로 수면무호흡이 있으면 낮에 이런 일이 생길 수 있습니다. '
        : '그래서 낮에 이런 일이 생길 수 있습니다. ';
    const n =
      lead +
      '회의나 운전 중에 갑자기 잠이 오고, 아침에 머리가 무겁고 목이 마릅니다. ' +
      '기억이 잘 안 나고 쉽게 짜증이 나기도 합니다. ' +
      '이런 상태가 오래되면 혈압과 심장에 부담이 쌓일 수 있습니다.';
    drafts.push({ id: 'daytime', title: '그래서 낮에 어떤 일이 생기나요', narration: n, minFrames: FPS * 6 });
  }

  // 8. 다음 단계
  {
    let n =
      '진료실에서 고를 수 있는 다음 단계입니다. 이 영상이 치료를 정하지는 않습니다. 자주 나오는 선택지는 네 가지입니다. ' +
      '첫째, 양압기. 자는 동안 숨길을 열어 주는 기계로, 중등도와 중증에서 가장 많이 씁니다. ' +
      '둘째, 수술 상담. 코와 목 구조에서 막힌 원인을 보고, 수술이 도움이 되는지 판단합니다. ' +
      '셋째, 자세와 체중 교정. 바로 누울 때만 심하거나 체중이 원인일 때 같이 봅니다. ' +
      '넷째, 구강 장치. 아래턱을 앞으로 당겨 숨길을 여는 장치로, 적응증이 맞을 때 씁니다. ';
    if (sev === 'moderate' || sev === 'severe') {
      n += '환자분처럼 중등도 이상이면 양압기가 우선 후보로 논의되는 경우가 많습니다. ';
    } else if (sev === 'mild') {
      n += '경증에서는 자세와 체중 교정, 구강 장치부터 상의하는 경우가 많습니다. ';
    }
    if (isPositional(v)) {
      n += '바로 누울 때 더 심했기 때문에, 자세 교정도 함께 이야기해 볼 수 있습니다.';
    }
    drafts.push({ id: 'options', title: '진료실에서 고를 수 있는 다음 단계', narration: n.trim(), minFrames: FPS * 8 });
  }

  // 9. 아웃트로
  drafts.push({
    id: 'outro',
    title: '이제 진료실에서 이 세 가지만 확인하면 됩니다',
    narration:
      '이제 진료실에서 이 세 가지만 확인하면 됩니다. ' +
      '첫째, 내 AHI와 산소 숫자가 어디에 해당하는가. ' +
      '둘째, 양압기, 수술, 생활 교정 중 무엇이 맞는가. ' +
      '셋째, 언제 다시 와서 효과를 보는가. ' +
      '이 영상은 결과 안내입니다. 진단과 치료는 담당 의사가 결정합니다. 감사합니다.',
    minFrames: FPS * 6,
  });

  return drafts;
}

/** 추정 발화 시간으로 장면 길이를 정한 대본 (브라우저 TTS / 자막 전용 모드) */
export function buildScenes(v: PsgValues, rate = 1): SceneSpec[] {
  return buildDrafts(v, rate).map((d) => {
    const speech = Math.ceil((estimateSpeechSeconds(d.narration, rate) + SCENE_TAIL_SEC) * FPS);
    return { ...d, durationInFrames: Math.max(d.minFrames, speech) };
  });
}

/** 실제 오디오 길이(초)로 장면 길이를 확정한 대본 (서버 TTS 모드) */
export function applyAudio(
  scenes: SceneSpec[],
  audio: Array<{ id: SceneId; src: string; durationSec: number }>,
): SceneSpec[] {
  return scenes.map((s) => {
    const a = audio.find((x) => x.id === s.id);
    if (!a) return s;
    const frames = Math.ceil((a.durationSec + SCENE_TAIL_SEC) * FPS);
    return { ...s, audioSrc: a.src, durationInFrames: Math.max(s.minFrames, frames) };
  });
}

export function totalFrames(scenes: SceneSpec[]): number {
  return scenes.reduce((a, s) => a + s.durationInFrames, 0);
}

export function sceneStartFrame(scenes: SceneSpec[], index: number): number {
  let f = 0;
  for (let i = 0; i < index; i++) f += scenes[i].durationInFrames;
  return f;
}

export function sceneIndexAt(scenes: SceneSpec[], frame: number): number {
  let acc = 0;
  for (let i = 0; i < scenes.length; i++) {
    acc += scenes[i].durationInFrames;
    if (frame < acc) return i;
  }
  return scenes.length - 1;
}

/** 데모/미리보기용 예시 값 (PPT 4번 슬라이드의 예시와 동일) */
export const SAMPLE_VALUES: PsgValues = {
  ahi: 22.4,
  rdi: 25.3,
  n3pct: 8.2,
  rempct: 18.5,
  snorepct: 34,
  lowestspo2: 82,
  fli: 27,
  rmiSupine: 43.2,
  rmiLeft: 18.5,
  rmiRight: 21.0,
  tst: 372,
  eff: 85,
};
