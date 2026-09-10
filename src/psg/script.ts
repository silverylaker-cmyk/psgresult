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

export type Severity = 'normal' | 'mild' | 'moderate' | 'severe' | 'unknown';

export function ahiSeverity(ahi: number | null): Severity {
  if (ahi == null) return 'unknown';
  if (ahi < 5) return 'normal';
  if (ahi < 15) return 'mild';
  if (ahi < 30) return 'moderate';
  return 'severe';
}

/** 환자용 쉬운 표현 */
export const SEV_WORD: Record<Severity, string> = {
  normal: '정상',
  mild: '가벼운 단계',
  moderate: '중간 단계',
  severe: '심한 단계',
  unknown: '',
};

/** 바로 누울 때 호흡 불안정이 옆으로 잘 때보다 뚜렷하게 높은가 (자세 의존성) */
export function isPositional(v: PsgValues): boolean {
  const sides = [v.rmiLeft, v.rmiRight].filter((x): x is number => x != null);
  if (v.rmiSupine == null || sides.length === 0) return false;
  const best = Math.min(...sides);
  return v.rmiSupine >= 20 && v.rmiSupine >= best * 1.5;
}

/** 바로 누울 때가 옆으로 잘 때보다 몇 배 불안정한가 (1자리) */
export function positionalRatio(v: PsgValues): number | null {
  const sides = [v.rmiLeft, v.rmiRight].filter((x): x is number => x != null);
  if (v.rmiSupine == null || sides.length === 0) return null;
  const best = Math.min(...sides);
  if (best <= 0) return null;
  return Math.round((v.rmiSupine / best) * 10) / 10;
}

/** 밤새 총 이벤트 횟수 추정 (AHI × 수면 시간) */
export function nightlyEvents(rate: number | null, tstMin: number | null): number | null {
  if (rate == null || tstMin == null) return null;
  return Math.round((rate * tstMin) / 60);
}

/** 분 → "6시간 12분" */
export function hoursText(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
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
    title: '어젯밤, 몸에서 있었던 일',
    narration:
      '안녕하세요. 어젯밤 검사 결과를 진료 전에 먼저 보여드리려고 합니다. ' +
      '어려운 용어 대신, 밤사이 몸에서 무슨 일이 있었는지 이야기로 풀어 드릴게요. ' +
      `약 ${minutes}분이면 충분합니다.`,
    minFrames: FPS * 5,
  };
  return [intro, ...body];
}

function buildBodyDrafts(v: PsgValues): Draft[] {
  const sev = ahiSeverity(v.ahi);
  const drafts: Draft[] = [];

  // 2. 밤새 무엇을 지켜봤나
  {
    let n =
      '검사실에서는 밤새 네 가지를 지켜봤습니다. ' +
      '숨이 몇 번 멈췄는지, 그때 산소가 얼마나 떨어졌는지, 어떤 자세에서 더 힘들었는지, 그리고 얼마나 깊이 잤는지입니다. ';
    if (v.tst != null && v.eff != null) {
      n += `어젯밤 실제로 잠든 시간은 ${hoursText(v.tst)}이었고, 누워 있던 시간의 ${Math.round(v.eff)}퍼센트를 잠으로 보내셨습니다.`;
    } else if (v.tst != null) {
      n += `어젯밤 실제로 잠든 시간은 ${hoursText(v.tst)}이었습니다.`;
    } else {
      n += '코골이 소리를 듣는 검사가 아니라, 몸 전체를 밤새 기록하는 검사입니다.';
    }
    drafts.push({ id: 'overview', title: '밤새 네 가지를 지켜봤습니다', narration: n.trim(), minFrames: FPS * 6 });
  }

  // 3. AHI
  {
    let n =
      '가장 중요한 숫자부터 보겠습니다. AHI, 한 시간에 숨이 멈추거나 크게 얕아진 횟수입니다. ' +
      '5번 미만이면 정상, 15번까지는 가벼운 편, 30번까지는 중간, 그 이상이면 심한 편으로 봅니다. ';
    if (v.ahi == null) {
      n += '이번 결과지에서는 AHI 값을 자동으로 읽지 못했습니다. 진료실에서 직접 확인해 드리겠습니다.';
    } else {
      n += `환자분은 한 시간에 ${fmt1(v.ahi)}번이었습니다. ${SEV_WORD[sev]}입니다. `;
      const total = nightlyEvents(v.ahi, v.tst);
      if (total != null && total > 0) {
        n += `어젯밤 ${hoursText(v.tst!)} 동안 약 ${total}번, 숨이 막혔다 풀리기를 반복했다는 뜻입니다. `;
      } else {
        n += `한 시간에 약 ${Math.round(v.ahi)}번, 숨이 막혔다 풀리기를 반복했다는 뜻입니다. `;
      }
      n += {
        normal: '밤사이 호흡은 안정적이었습니다. 코골이나 낮 졸음이 신경 쓰이신다면 다른 항목도 함께 보겠습니다.',
        mild: '체중, 자는 자세, 술과 수면제 같은 생활 요인을 먼저 손보는 경우가 많은 단계입니다.',
        moderate: '그냥 두기보다, 치료를 시작할지 상의할 시점입니다.',
        severe: '치료를 미루지 않는 것이 중요한 단계입니다.',
        unknown: '',
      }[sev];
    }
    drafts.push({ id: 'ahi', title: '가장 중요한 숫자, AHI', narration: n.trim(), minFrames: FPS * 7 });
  }

  // 4. 산소
  {
    let n =
      '숨이 막히면 피 속 산소가 내려갑니다. ' +
      '깨어 있을 때는 보통 95퍼센트가 넘고, 90 아래로 자주 떨어지면 심장과 혈관이 밤마다 비상 상황을 겪습니다. ';
    if (v.lowestspo2 == null) {
      n += '이번 결과지에서는 최저 산소포화도 값을 자동으로 읽지 못했습니다.';
    } else {
      const z = getSeverity(metricById('lowestspo2')!, v.lowestspo2);
      const drop = Math.max(0, Math.round(95 - v.lowestspo2));
      n += `환자분은 가장 낮을 때 ${Math.round(v.lowestspo2)}퍼센트까지 내려갔습니다. `;
      const l = z?.l ?? '';
      n +=
        l === '정상'
          ? '밤새 산소는 잘 유지되었습니다.'
          : l === '경증 저하'
            ? '잠깐 살짝 내려가는 정도였습니다.'
            : l === '중등도 저하'
              ? `평소보다 ${drop}포인트 낮은 수치로, 몸이 산소 부족을 느꼈을 순간이 있었습니다.`
              : `평소보다 ${drop}포인트 넘게 떨어진 수치로, 밤사이 몸이 여러 번 산소 부족을 겪었을 가능성이 큽니다.`;
    }
    drafts.push({ id: 'oxygen', title: '산소는 얼마나 내려갔나', narration: n.trim(), minFrames: FPS * 6 });
  }

  // 5. 자세 + 코골이
  {
    let n =
      '자세 이야기입니다. 바로 누우면 혀와 목젖이 뒤로 처져 숨길이 좁아지기 쉽습니다. ' +
      '그래서 자세마다 호흡이 얼마나 흔들렸는지를 따로 쟀습니다. ';
    const parts: string[] = [];
    if (v.rmiSupine != null) parts.push(`바로 누울 때 ${fmt1(v.rmiSupine)}`);
    if (v.rmiLeft != null) parts.push(`왼쪽으로 잘 때 ${fmt1(v.rmiLeft)}`);
    if (v.rmiRight != null) parts.push(`오른쪽으로 잘 때 ${fmt1(v.rmiRight)}`);
    if (parts.length === 0) {
      n += '이번 결과지에서는 자세별 수치를 자동으로 읽지 못했습니다. ';
    } else {
      n += parts.join(', ') + '이었습니다. ';
      const ratio = positionalRatio(v);
      if (isPositional(v)) {
        n += `바로 누울 때가 옆으로 잘 때보다 약 ${ratio != null ? fmt1(ratio) : '두'}배 더 불안정했습니다. 옆으로 자는 습관만으로도 달라질 수 있는 분입니다. `;
      } else if ([v.rmiSupine, v.rmiLeft, v.rmiRight].every((x) => x == null || x < 20)) {
        n += '어느 자세에서든 호흡은 비교적 안정적이었습니다. ';
      } else {
        n += '자세를 바꿔도 큰 차이가 없었습니다. 자세보다는 숨길 자체를 넓히는 방법을 생각해 볼 단계입니다. ';
      }
    }
    if (v.snorepct != null) {
      const z = getSeverity(metricById('snorepct')!, v.snorepct);
      n += `코골이는 잠자는 시간의 ${Math.round(v.snorepct)}퍼센트 동안 이어졌습니다.`;
      if (z && z.l !== '정상') n += ' 코골이는 소리 문제가 아니라, 숨길이 좁아져 떨리는 소리입니다.';
    }
    drafts.push({ id: 'position', title: '어떤 자세에서 더 힘들었나', narration: n.trim(), minFrames: FPS * 6 });
  }

  // 6. 잠의 질
  {
    let n =
      '이제 잠의 질입니다. 잠은 얕은 잠, 깊은 잠, 꿈꾸는 렘수면이 번갈아 옵니다. ' +
      '깊은 잠은 몸을 고치고, 렘수면은 기억과 감정을 정리합니다. ';
    if (v.n3pct != null && v.rempct != null) {
      n += `환자분은 깊은 잠이 전체의 ${fmt1(v.n3pct)}퍼센트, 렘수면이 ${fmt1(v.rempct)}퍼센트였습니다. `;
    } else if (v.n3pct != null) {
      n += `환자분은 깊은 잠이 전체의 ${fmt1(v.n3pct)}퍼센트였습니다. `;
    } else if (v.rempct != null) {
      n += `환자분은 렘수면이 전체의 ${fmt1(v.rempct)}퍼센트였습니다. `;
    } else {
      n += '이번 결과지에서는 수면 단계 비율을 자동으로 읽지 못했습니다. ';
    }
    if (v.n3pct != null) {
      n +=
        v.n3pct <= 10
          ? '깊은 잠이 정상의 절반도 안 됩니다. 숨이 막힐 때마다 뇌가 깜짝 놀라 깨어나니, 깊은 잠으로 내려갈 틈이 없었던 겁니다. 자고 나도 잔 것 같지 않은 이유가 여기 있습니다. '
          : v.n3pct <= 15
            ? '깊은 잠이 조금 모자랐습니다. '
            : '깊은 잠은 잘 유지되었습니다. ';
    }
    if (v.rempct != null) {
      n += v.rempct <= 15 ? '렘수면도 부족했습니다. ' : v.rempct <= 25 ? '렘수면은 정상이었습니다. ' : '렘수면은 다소 많은 편이었습니다. ';
    }
    if (v.rdi != null) {
      const total = nightlyEvents(v.rdi, v.tst);
      n += `숨 때문에 잠깐씩 깬 것까지 세면 한 시간에 ${fmt1(v.rdi)}번입니다.`;
      if (total != null && total > 0) n += ` 본인은 기억하지 못해도, 몸은 밤새 ${total}번쯤 깨어난 셈입니다.`;
    }
    drafts.push({ id: 'quality', title: '얼마나 깊이 잤나', narration: n.trim(), minFrames: FPS * 6 });
  }

  // 7. 낮
  {
    const lead = sev === 'normal' ? '환자분은 정상 범위에 가깝지만, 수면무호흡이 있으면 낮에 이런 일이 생깁니다. ' : '그래서 낮이 힘든 겁니다. ';
    const n =
      lead +
      '잠은 잤는데 개운하지 않고, 오후만 되면 졸음이 쏟아집니다. ' +
      '운전 중에 깜빡 조는 일이 생기고, 아침엔 머리가 무겁고 입이 마릅니다. ' +
      '집중이 안 되고 사소한 일에 짜증이 납니다. ' +
      '이런 밤이 몇 년 쌓이면 혈압과 심장, 당뇨 위험이 함께 올라갑니다.';
    drafts.push({ id: 'daytime', title: '그래서 낮이 힘든 겁니다', narration: n, minFrames: FPS * 6 });
  }

  // 8. 선택지
  {
    let n =
      '이제 무엇을 할 수 있는지 보겠습니다. 결정은 진료실에서 함께 하지만, 후보를 미리 알고 오시면 대화가 훨씬 쉽습니다. ' +
      '첫째, 양압기. 자는 동안 코로 부드럽게 바람을 넣어 숨길이 닫히지 않게 합니다. 중간 이상 단계에서 가장 확실한 방법입니다. ' +
      '둘째, 수술. 코나 목에서 실제로 막힌 곳을 찾아 넓힙니다. 구조적인 원인이 뚜렷할 때 고려합니다. ' +
      '셋째, 자세와 체중. 옆으로 자는 습관, 체중 감량, 술 줄이기만으로도 가벼운 경우엔 효과가 큽니다. ' +
      '아래턱을 앞으로 당기는 구강 장치라는 것도 있지만, 맞는 경우가 제한적이라 필요할 때만 말씀드리겠습니다. ';
    if (sev === 'moderate' || sev === 'severe') {
      n += `환자분처럼 ${SEV_WORD[sev]}라면 보통 양압기부터 이야기를 시작합니다. `;
    } else if (sev === 'mild') {
      n += '환자분처럼 가벼운 단계라면 자세와 체중부터 이야기를 시작하는 경우가 많습니다. ';
    } else if (sev === 'normal') {
      n += '환자분은 지금 당장 치료가 필요한 단계는 아닐 수 있습니다. 증상이 있다면 생활 습관부터 점검합니다. ';
    }
    if (isPositional(v)) {
      n += '바로 누울 때 유독 심했으니, 옆으로 자는 방법은 어떤 단계에서든 함께 해 볼 만합니다.';
    }
    drafts.push({ id: 'options', title: '무엇을 할 수 있나', narration: n.trim(), minFrames: FPS * 8 });
  }

  // 9. 아웃트로
  {
    const q1 =
      v.ahi != null && v.lowestspo2 != null
        ? `내 AHI ${fmt1(v.ahi)}과 산소 ${Math.round(v.lowestspo2)}퍼센트는 어느 정도로 심각한가.`
        : v.ahi != null
          ? `내 AHI ${fmt1(v.ahi)}은 어느 정도로 심각한가.`
          : '내 결과는 어느 정도로 심각한가.';
    drafts.push({
      id: 'outro',
      title: '진료실에서 물어볼 세 가지',
      narration:
        '진료실에 들어오시면 이 세 가지만 물어보세요. ' +
        `첫째, ${q1} ` +
        '둘째, 나에게 맞는 첫 번째 치료는 무엇인가. ' +
        '셋째, 치료를 시작하면 언제쯤 달라지고, 언제 다시 검사하는가. ' +
        '이 영상은 결과를 이해하기 위한 안내입니다. 진단과 치료는 담당 의사가 결정합니다. 감사합니다.',
      minFrames: FPS * 6,
    });
  }

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

/** 데모/미리보기용 예시 값 */
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
