import type { MetricDef, PsgValues, Zone } from './types';

/** 색상 상수 (대시보드·영상 공통) */
export const C = {
  good: '#4caf50',
  mild: '#ffc107',
  moderate: '#ff7043',
  severe: '#e53935',
  navy: '#1b3a4b',
  teal: '#2a6f7f',
  ink: '#1a1a2e',
  gray: '#5c6670',
  mist: '#d7e3e8',
  paper: '#f6f9fb',
};

// zones 는 항상 낮은값→높은값 순으로 정의 (getSeverity 로직 유지)
export const METRICS: MetricDef[] = [
  {
    id: 'ahi',
    name: 'AHI (무호흡-저호흡 지수)',
    sub: 'Apnea + Hypopnea Index',
    unit: '회/시간',
    min: 0,
    max: 30,
    zones: [
      { t: 5, c: C.good, l: '정상' },
      { t: 15, c: C.mild, l: '경증' },
      { t: 22, c: C.moderate, l: '중등도' },
      { t: 30, c: C.severe, l: '중증' },
    ],
    ticks: [0, { v: 5, em: true }, 15, 22, 30],
  },
  {
    id: 'rdi',
    name: 'RDI (호흡 장애 지수) - 각성',
    sub: 'Respiratory Disturbance Index',
    unit: '회/시간',
    min: 0,
    max: 30,
    zones: [
      { t: 5, c: C.good, l: '정상' },
      { t: 15, c: C.mild, l: '경증' },
      { t: 22, c: C.moderate, l: '중등도' },
      { t: 30, c: C.severe, l: '중증' },
    ],
    ticks: [0, { v: 5, em: true }, 15, 22, 30],
  },
  {
    id: 'n3pct',
    name: 'N3 수면 (깊은 수면)',
    sub: '육체 회복',
    unit: '%',
    min: 5,
    max: 20,
    reverse: true,
    zones: [
      { t: 10, c: C.severe, l: '매우 부족' },
      { t: 15, c: C.mild, l: '부족' },
      { t: 20, c: C.good, l: '정상' },
    ],
    ticks: [20, 15, 10, 5],
  },
  {
    id: 'rempct',
    name: 'REM 수면',
    sub: '두뇌 회복',
    unit: '%',
    min: 5,
    max: 30,
    reverse: true,
    zones: [
      { t: 15, c: C.severe, l: '부족' },
      { t: 25, c: C.good, l: '정상' },
      { t: 30, c: C.mild, l: '과다' },
    ],
    ticks: [30, 25, 15, 5],
  },
  {
    id: 'snorepct',
    name: '코골이 시간',
    sub: 'Snore Time (수면 대비 %)',
    unit: '%',
    min: 5,
    max: 55,
    zones: [
      { t: 15, c: C.good, l: '정상' },
      { t: 30, c: C.mild, l: '경증' },
      { t: 45, c: C.moderate, l: '중등도' },
      { t: 55, c: C.severe, l: '중증' },
    ],
    ticks: [5, 15, 30, 45, 55],
  },
  {
    id: 'lowestspo2',
    name: '최저 산소포화도',
    sub: 'Lowest SpO₂',
    unit: '%',
    min: 75,
    max: 95,
    reverse: true,
    zones: [
      { t: 82, c: C.severe, l: '중증 저하' },
      { t: 88, c: C.moderate, l: '중등도 저하' },
      { t: 92, c: C.mild, l: '경증 저하' },
      { t: 95, c: C.good, l: '정상' },
    ],
    ticks: [95, 92, 88, 82, 75],
  },
  {
    id: 'fli',
    name: '호흡 병목 지수',
    sub: 'Flow Limitation Index',
    unit: '%',
    min: 10,
    max: 40,
    zones: [
      { t: 20, c: C.good, l: '정상' },
      { t: 30, c: C.mild, l: '경증' },
      { t: 40, c: C.severe, l: '중증' },
    ],
    ticks: [10, 20, 30, 40],
  },
];

export const metricById = (id: keyof PsgValues): MetricDef | undefined => METRICS.find((m) => m.id === id);

export function getSeverity(metric: MetricDef, val: number | null): Zone | null {
  if (val == null) return null;
  for (const z of metric.zones) {
    if (val <= z.t) return z;
  }
  return metric.zones[metric.zones.length - 1];
}

/** 구간 색상 그라디언트 (CSS linear-gradient) */
export function buildGrad(metric: MetricDef): string {
  const range = metric.max - metric.min;
  const stops: string[] = [];

  if (metric.reverse) {
    let prev = metric.max;
    for (let i = metric.zones.length - 1; i >= 0; i--) {
      const z = metric.zones[i];
      const lowerBound = i > 0 ? metric.zones[i - 1].t : metric.min;
      const posA = (((metric.max - prev) / range) * 100).toFixed(1);
      const posB = (((metric.max - lowerBound) / range) * 100).toFixed(1);
      stops.push(`${z.c} ${posA}%`, `${z.c} ${posB}%`);
      prev = lowerBound;
    }
    return `linear-gradient(to right,${stops.join(',')})`;
  }

  let prev = metric.min;
  for (const z of metric.zones) {
    const a = (((prev - metric.min) / range) * 100).toFixed(1);
    const b = (((z.t - metric.min) / range) * 100).toFixed(1);
    stops.push(`${z.c} ${a}%`, `${z.c} ${b}%`);
    prev = z.t;
  }
  return `linear-gradient(to right,${stops.join(',')})`;
}

/** 마커 위치(%) — reverse 시 값이 클수록 왼쪽 */
export function markerPct(metric: MetricDef, val: number | null): number | null {
  if (val == null) return null;
  const c = Math.max(metric.min, Math.min(metric.max, val));
  const p = ((c - metric.min) / (metric.max - metric.min)) * 100;
  return metric.reverse ? 100 - p : p;
}

export function tickPct(metric: MetricDef, tv: number | { v: number }): number {
  const v = typeof tv === 'object' ? tv.v : tv;
  if (metric.reverse) return ((metric.max - v) / (metric.max - metric.min)) * 100;
  return ((v - metric.min) / (metric.max - metric.min)) * 100;
}

export const RMI_MAX = 60;
export function rmiColor(v: number | null): string {
  if (v == null) return '#ccc';
  return v < 20 ? C.good : v < 35 ? C.mild : C.severe;
}
export function rmiLabel(v: number | null): string {
  if (v == null) return '';
  return v < 20 ? '낮음' : v < 35 ? '주의' : '높음';
}

export type FaceExpr = 'great' | 'ok' | 'bad' | 'terrible';
export function faceExpr(color: string | undefined): FaceExpr {
  const map: Record<string, FaceExpr> = {
    [C.good]: 'great',
    [C.mild]: 'ok',
    [C.moderate]: 'bad',
    [C.severe]: 'terrible',
  };
  return (color && map[color]) || 'ok';
}
