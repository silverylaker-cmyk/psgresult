import { EMPTY_VALUES, type PsgValues } from './types';

/**
 * REM Logic 형식 PDF 에서 좌표 기반으로 텍스트를 재구성한 뒤 수치를 추출한다.
 * (legacy/psgviewer.html 의 로직을 그대로 옮긴 것 — 정규식은 동일하게 유지)
 */

type PdfJs = typeof import('pdfjs-dist');

let pdfjsPromise: Promise<PdfJs> | null = null;

async function loadPdfJs(): Promise<PdfJs> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import('pdfjs-dist');
      const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

/** PDF 파일 → 줄 단위로 재구성된 전체 텍스트 */
export async function pdfToText(file: File | ArrayBuffer): Promise<string> {
  const pdfjs = await loadPdfJs();
  const buf = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const linesByPage: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const pg = await pdf.getPage(i);
    const vp = pg.getViewport({ scale: 1 });
    const ct = await pg.getTextContent();

    const items = ct.items
      .filter((it): it is import('pdfjs-dist/types/src/display/api').TextItem => 'str' in it && it.str.trim() !== '')
      .map((it) => ({
        str: it.str,
        x: Math.round(it.transform[4]),
        y: Math.round(vp.height - it.transform[5]),
      }));

    items.sort((a, b) => (a.y !== b.y ? a.y - b.y : a.x - b.x));

    const THRESH = 8;
    const lines: { y: number; parts: string[] }[] = [];
    let cur: { y: number; parts: string[] } | null = null;
    for (const it of items) {
      if (!cur || Math.abs(it.y - cur.y) > THRESH) {
        cur = { y: it.y, parts: [] };
        lines.push(cur);
      }
      cur.parts.push(it.str);
    }
    linesByPage.push(lines.map((l) => l.parts.join(' ')).join('\n'));
  }
  return linesByPage.join('\n');
}

function first(text: string, pairs: Array<[RegExp, number]>): number | null {
  for (const [re, gi] of pairs) {
    const m = text.match(re);
    if (m && m[gi] != null && m[gi] !== '') {
      const n = parseFloat(m[gi]);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

/** 재구성된 텍스트에서 지표를 추출한다. */
export function extractValues(text: string): PsgValues {
  const v: PsgValues = { ...EMPTY_VALUES };

  v.ahi = first(text, [
    [/Apnea\s*\+\s*Hypopnea\s*\(A\+H\)[^\d]{0,10}\d+[^\d./]{0,5}([\d.]+)\s*\/\s*h/i, 1],
    [/\(A\s*\+\s*H\)[^\d]{0,10}\d+[^\d./]{0,5}([\d.]+)\s*\/\s*h/i, 1],
    [/A\s*\+\s*H[^\d]{0,10}\d+[^\d./]{0,5}([\d.]+)\s*\/\s*h/i, 1],
    [/Hypopnea[^\d]{0,30}\d{1,3}\s+([\d.]+)\s*\/\s*h/i, 1],
  ]);

  v.rdi = first(text, [[/\bRDI\b\s*:?\s*([\d.]+)/, 1]]);

  {
    const m = text.match(
      /of\s+Sleep\s+Period\s+([\d.]+)\s*%?\s+([\d.]+)\s*%?\s+([\d.]+)\s*%?\s+([\d.]+)\s*%?/i,
    );
    if (m) {
      v.n3pct = parseFloat(m[3]);
      v.rempct = parseFloat(m[4]);
    }
  }

  v.snorepct = first(text, [
    [/Relative\s+Snoring\s+Time\s*:?\s*([\d.]+)/i, 1],
    [/Snore\s+Time\s*:?\s*[\d.]+\s+minutes\s+([\d.]+)/i, 1],
    [/Snore\s+Time\s*:?\s*([\d.]+)\s*%/i, 1],
  ]);

  v.lowestspo2 = first(text, [[/Lowest\s+Oxygen\s+Saturation\s*:?\s*([\d.]+)/i, 1]]);
  v.fli = first(text, [[/Flow\s+Limitation\s+Index\s*[\[%\]]{0,3}\s*([\d.]+)/i, 1]]);

  const rmiStart = text.indexOf('RMI Statistics');
  const posStart = text.indexOf('Position Statistics');
  const rmiEnd = posStart > rmiStart && posStart > 0 ? posStart : rmiStart + 3000;
  const rmiSec = rmiStart >= 0 ? text.substring(rmiStart, rmiEnd) : text;

  const rmiKeys: Array<[string, 'rmiSupine' | 'rmiLeft' | 'rmiRight']> = [
    ['Supine', 'rmiSupine'],
    ['Left', 'rmiLeft'],
    ['Right', 'rmiRight'],
  ];
  for (const [label, key] of rmiKeys) {
    const re = new RegExp(`\\b${label}\\b\\s+(\\d+)(?!\\.\\d)\\s+([\\d.]+)`, 'i');
    const m = rmiSec.match(re);
    if (m) {
      const c = parseFloat(m[2]);
      if (c < 150) v[key] = c;
    }
  }

  v.tst = first(text, [[/Total\s+Sleep\s+Time\s*:?\s*([\d.]+)\s*minutes/i, 1]]);
  v.eff = first(text, [[/Sleep\s+Efficiency\s*:?\s*([\d.]+)/i, 1]]);

  return v;
}

export async function extractFromPdf(file: File): Promise<{ text: string; values: PsgValues }> {
  const text = await pdfToText(file);
  return { text, values: extractValues(text) };
}
