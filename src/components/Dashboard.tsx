import React from 'react';
import { METRICS, RMI_MAX, buildGrad, faceExpr, getSeverity, markerPct, rmiColor, rmiLabel, tickPct } from '../psg/metrics';
import type { MetricDef, PsgValues } from '../psg/types';
import { Face } from '../remotion/ui';

/** 기존 psgviewer.html 의 시각화를 그대로 옮긴 대시보드 */
export const Dashboard: React.FC<{ values: PsgValues }> = ({ values }) => {
  const chips: Array<{ lbl: string; val: string }> = [];
  if (values.tst) chips.push({ lbl: '총 수면 시간', val: (values.tst / 60).toFixed(1) + ' 시간' });
  if (values.eff) chips.push({ lbl: '수면 효율', val: values.eff.toFixed(0) + ' %' });
  chips.push({ lbl: 'AHI', val: values.ahi != null ? values.ahi.toFixed(1) + '/h' : '—' });
  chips.push({ lbl: '최저 SpO₂', val: values.lowestspo2 != null ? values.lowestspo2.toFixed(0) + ' %' : '—' });

  return (
    <>
      <div className="info-bar">
        <h3>수면 요약</h3>
        <div className="info-grid">
          {chips.map((c) => (
            <div className="info-chip" key={c.lbl}>
              <div className="lbl">{c.lbl}</div>
              <div className="val">{c.val}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="mlist">
        {METRICS.map((m) => (
          <MetricRow key={m.id} metric={m} val={values[m.id]} />
        ))}
        <RmiSection values={values} />
      </div>
    </>
  );
};

const MetricRow: React.FC<{ metric: MetricDef; val: number | null }> = ({ metric, val }) => {
  const sev = getSeverity(metric, val);
  const pct = markerPct(metric, val);
  return (
    <div className="mrow">
      <div className="mrow-top">
        <div className="mrow-label">
          <div className="mrow-name">{metric.name}</div>
          <div className="mrow-sub">{metric.sub}</div>
        </div>
        <div className="mrow-val">
          {val != null ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span className="mrow-num" style={{ color: sev?.c ?? '#333' }}>
                {val.toFixed(1)}
              </span>
              <span className="mrow-unit">{metric.unit}</span>
            </div>
          ) : (
            <div className="na">인식 불가</div>
          )}
          {sev && (
            <div className="badge" style={{ background: `${sev.c}22`, color: sev.c, border: `1px solid ${sev.c}55` }}>
              {sev.l}
            </div>
          )}
        </div>
      </div>
      <div className="mrow-bar">
        <div className="vas-bar">
          <div className="vas-track" style={{ background: buildGrad(metric) }} />
          {pct != null && (
            <div className="vas-marker" style={{ left: `${pct.toFixed(1)}%` }}>
              <Face color={sev?.c ?? '#9e9e9e'} expr={faceExpr(sev?.c)} size={48} />
            </div>
          )}
        </div>
        <div className="vas-ticks">
          {metric.ticks.map((tv) => {
            const v = typeof tv === 'object' ? tv.v : tv;
            const em = typeof tv === 'object' && tv.em;
            return (
              <span key={v} className={em ? 'em' : undefined} style={{ left: `${tickPct(metric, v).toFixed(1)}%` }}>
                {v}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const RmiSection: React.FC<{ values: PsgValues }> = ({ values }) => {
  const rows = [
    { key: 'rmiSupine', label: '등 자세 (Supine)' },
    { key: 'rmiLeft', label: '왼쪽 자세 (Left)' },
    { key: 'rmiRight', label: '오른쪽 자세 (Right)' },
  ] as const;
  return (
    <div className="rmi-card">
      <div className="rmi-card-title">자세별 호흡 불안정성 (RMI)</div>
      <div className="rmi-card-sub">Respiratory Mechanic Instability Index by Position &nbsp;·&nbsp; 기준: &lt;20 낮음 / 20–35 주의 / &gt;35 높음</div>
      {rows.map((r) => {
        const val = values[r.key];
        const c = rmiColor(val);
        const pct = val != null ? Math.min(100, (val / RMI_MAX) * 100) : 0;
        return (
          <div className="rmi-row" key={r.key}>
            <div className="rmi-label-wrap">
              <div className="rmi-lbl">{r.label}</div>
            </div>
            <div className="rmi-val-wrap">
              {val != null ? (
                <>
                  <div className="rmi-num" style={{ color: c }}>
                    {val.toFixed(1)}
                  </div>
                  <div className="rmi-unit">회/시간</div>
                  <div className="badge" style={{ background: `${c}22`, color: c, border: `1px solid ${c}55`, marginTop: 4 }}>
                    {rmiLabel(val)}
                  </div>
                </>
              ) : (
                <div className="na">인식 불가</div>
              )}
            </div>
            <div className="rmi-bar-wrap">
              <div className="rmi-track">
                <div className="rmi-fill" style={{ width: `${pct.toFixed(1)}%`, background: c }} />
                {val != null && <div className="rmi-pin" style={{ left: `${pct.toFixed(1)}%` }} />}
              </div>
              <div className="rmi-ticks">
                <span>0</span>
                <span>20</span>
                <span>35</span>
                <span>60</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
