/** PDF에서 추출한 수면다원검사 수치. 인식하지 못한 값은 null. */
export interface PsgValues {
  ahi: number | null;
  rdi: number | null;
  n3pct: number | null;
  rempct: number | null;
  snorepct: number | null;
  lowestspo2: number | null;
  fli: number | null;
  rmiSupine: number | null;
  rmiLeft: number | null;
  rmiRight: number | null;
  /** 총 수면 시간 (분) */
  tst: number | null;
  /** 수면 효율 (%) */
  eff: number | null;
}

export const EMPTY_VALUES: PsgValues = {
  ahi: null,
  rdi: null,
  n3pct: null,
  rempct: null,
  snorepct: null,
  lowestspo2: null,
  fli: null,
  rmiSupine: null,
  rmiLeft: null,
  rmiRight: null,
  tst: null,
  eff: null,
};

export interface Zone {
  /** 이 구간의 상한(포함) */
  t: number;
  /** 색상 */
  c: string;
  /** 라벨 */
  l: string;
}

export interface MetricDef {
  id: keyof PsgValues;
  name: string;
  sub: string;
  unit: string;
  min: number;
  max: number;
  /** true 이면 큰 값이 좋은 값 (녹색이 왼쪽) */
  reverse?: boolean;
  zones: Zone[];
  ticks: Array<number | { v: number; em?: boolean }>;
}

/** 영상 한 장면의 정의. 나레이션 텍스트와 길이(프레임)를 함께 가진다. */
export interface SceneSpec {
  id: SceneId;
  title: string;
  narration: string;
  /** 애니메이션이 끝나기 위한 최소 프레임 수 */
  minFrames: number;
  /** 최종 확정된 장면 길이(프레임). 나레이션 길이 추정치 또는 실제 오디오 길이로 계산 */
  durationInFrames: number;
  /** 서버 TTS 를 사용할 때 장면별 오디오 URL */
  audioSrc?: string;
}

export type SceneId =
  | 'intro'
  | 'overview'
  | 'ahi'
  | 'oxygen'
  | 'position'
  | 'quality'
  | 'daytime'
  | 'options'
  | 'outro';

export type ExplainerProps = {
  values: PsgValues;
  scenes: SceneSpec[];
  /** 자막 표시 여부 */
  showCaptions: boolean;
};
