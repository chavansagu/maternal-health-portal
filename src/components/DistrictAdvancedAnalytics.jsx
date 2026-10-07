import React, { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import { Link } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';
import { districtAnalyticsAPI } from '../services/api';
import { formatDate, formatDateTime } from '../utils/dateFormatter';
import AnalyticsFilterBar from './child/AnalyticsFilterBar';

// ─────────────────────────────────────────────────────────────────────────────
// This file used to be a single, self-contained <DistrictAdvancedAnalytics />
// component rendered as one block at the bottom of the District Dashboard.
// The dashboard's final section order now interleaves these charts/tables
// with sections that live on the dashboard page itself (Registration Trends,
// Block-wise Performance, High Risk Timeline, etc.), so this file instead
// exports:
//   - `useDistrictAnalytics()` — all the data fetching + derived chart config
//   - one small presentational component per monitoring section, each take
//     the hook's return value as its `aa` prop and render just their slice
// DashboardDistrictPage.jsx composes these pieces in the required order.
// ─────────────────────────────────────────────────────────────────────────────

const CHART_COLORS = ['#487FFF', '#28a745', '#FFA500', '#DC143C', '#8B5CF6', '#06B6D4', '#EC4899'];

/**
 * Pure helper for rendering EDD (Expected Date of Delivery) countdowns.
 *
 * Backend `days_to_edd` = (edd_date - today).days, so it can be negative
 * once the EDD has passed. This helper converts that raw day count into
 * user-facing wording without ever showing a negative sign:
 *   - days > 0  -> "X days to EDD"
 *   - days < 0  -> "X days overdue" (sign stripped)
 *   - days === 0 -> "Due today"
 *
 * @param {number} days - raw days_to_edd value (can be negative, 0, or positive)
 * @returns {string} human-readable EDD label
 */
const formatEddLabel = (days) => {
  if (days === null || days === undefined || Number.isNaN(days)) return '';
  if (days === 0) return 'Due today';
  if (days > 0) return `${days} day${days === 1 ? '' : 's'} to EDD`;
  const overdueDays = Math.abs(days);
  return `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`;
};

// "Needs Attention" — four actionable maternal-health tables. Every table has the
// same four columns: Name, Block, the date that matters for that list, and the
// action status (what has been done about it). `date` returns the main line and
// an optional sub line + tone for the second line under it.
const WATCHLIST_ROW_LIMIT = 5;

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const WATCHLIST_CARD_CONFIG = {
  hr_no_anc: {
    icon: 'material-symbols:personal-injury',
    tone: '#dc2626',
    dateHeader: 'Last ANC',
    date: (it) => it.last_anc
      ? { main: formatDate(it.last_anc), sub: `${plural(it.days_since, 'day')} ago`, subTone: 'danger' }
      : { main: 'Never', sub: 'No ANC recorded', subTone: 'danger' },
  },
  overdue_usg: {
    icon: 'material-symbols:ultrasound',
    tone: '#d97706',
    dateHeader: 'USG scheduled',
    date: (it) => ({ main: formatDate(it.scheduled_date), sub: `${plural(it.days_overdue, 'day')} overdue`, subTone: 'danger' }),
  },
  due_no_referral: {
    icon: 'material-symbols:calendar-clock-outline',
    tone: '#7c3aed',
    dateHeader: 'EDD',
    date: (it) => ({ main: formatDate(it.edd), sub: formatEddLabel(it.days_to_edd), subTone: it.days_to_edd < 0 ? 'danger' : 'warning' }),
  },
  pending_referrals: {
    icon: 'material-symbols:pending-actions',
    tone: '#0284c7',
    dateHeader: 'Referred on',
    date: (it) => ({
      main: formatDate(it.referred_at),
      sub: it.hours_pending >= 48 ? `${Math.floor(it.hours_pending / 24)} days pending` : `${it.hours_pending}h pending`,
      subTone: it.hours_pending >= 48 ? 'danger' : 'warning',
    }),
  },
};

// Order the four tables are shown in.
const WATCHLIST_ORDER = ['hr_no_anc', 'overdue_usg', 'due_no_referral', 'pending_referrals'];

// Action status -> label + colour. Comes from the backend as { key, detail }.
const ACTION_STATUS = {
  none:        { label: 'No action yet',   tone: 'danger' },
  pending:     { label: 'Follow-up pending', tone: 'warning' },
  mobilised:   { label: 'Mobilised',       tone: 'success' },
  escalated:   { label: 'Escalated',       tone: 'danger' },
  closed:      { label: 'Closed',          tone: 'neutral' },
  awaiting_dp: { label: 'Awaiting hospital', tone: 'warning' },
};

const NA_CSS = `
.na-card { background: var(--white, #fff); border: 1px solid var(--neutral-200, #e5e7eb); border-radius: 14px; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
.na-head { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--neutral-200, #e5e7eb); }
.na-icon { width: 38px; height: 38px; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: var(--na-soft); color: var(--na-tone); }
.na-title { font-size: 15px; font-weight: 600; line-height: 1.3; margin: 0; flex: 1; min-width: 0; }
.na-count { font-size: 22px; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; color: var(--na-tone); }
.na-table { width: 100%; border-collapse: collapse; table-layout: fixed; min-width: 560px; }
.na-table th:nth-child(1) { width: 30%; } .na-table th:nth-child(2) { width: 19%; } .na-table th:nth-child(3) { width: 24%; } .na-table th:nth-child(4) { width: 27%; }
.na-table th { font-size: 12.5px; font-weight: 600; color: var(--text-secondary-light, #64748b); text-align: left; padding: 10px 20px; background: rgba(100,116,139,.06); white-space: nowrap; }
.na-table td { padding: 12px 20px; font-size: 13.5px; vertical-align: middle; border-top: 1px solid var(--neutral-200, #e5e7eb); }
.na-table tbody tr:first-child td { border-top: 0; }
.na-table tbody tr:hover td { background: rgba(100,116,139,.05); }
.na-name { font-weight: 600; color: var(--text-primary-light, #0f172a); }
.na-sub { font-size: 12px; margin-top: 2px; color: var(--text-secondary-light, #64748b); }
.na-sub.danger { color: #dc2626; } .na-sub.warning { color: #b45309; }
.na-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 500; padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
.na-pill::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.na-pill.danger { background: rgba(220,38,38,.10); color: #b91c1c; }
.na-pill.warning { background: rgba(217,119,6,.12); color: #b45309; }
.na-pill.success { background: rgba(22,163,74,.12); color: #15803d; }
.na-pill.neutral { background: rgba(100,116,139,.14); color: #475569; }
.na-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 36px 20px; color: var(--text-secondary-light, #64748b); font-size: 13.5px; }
.na-foot { margin-top: auto; padding: 12px 20px; border-top: 1px solid var(--neutral-200, #e5e7eb); font-size: 13.5px; }
`;

const KpiCard = ({ k }) => {
  const hasChange = k.change !== null && k.change !== undefined;
  const isImprovement = hasChange ? (k.good === 'down' ? k.change <= 0 : k.change >= 0) : null;
  const suffix = k.unit === 'percent' ? '%' : '';
  return (
    <div className="col">
      <div className="card shadow-none border h-100">
        <div className="card-body p-16">
          <p className="fw-medium text-secondary-light text-sm mb-1">{k.label}</p>
          <h5 className="mb-0">{k.value}{suffix}</h5>
          {hasChange ? (
            <p className={`text-xs mt-4 mb-0 d-flex align-items-center gap-1 ${isImprovement ? 'text-success-main' : 'text-danger-main'}`}>
              <Icon icon={k.change >= 0 ? 'bxs:up-arrow' : 'bxs:down-arrow'} />
              {k.change >= 0 ? '+' : ''}{k.change}{k.change_type === 'pts' ? ' pts' : '%'} vs previous period
            </p>
          ) : k.hint ? <p className="text-xs text-secondary-light mt-4 mb-0">{k.hint}</p> : null}
        </div>
      </div>
    </div>
  );
};

const emptyOpts = { noData: { text: 'No data available', align: 'center', verticalAlign: 'middle' } };

const pctOf = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);

// Green >=70%, amber 40-69%, red <40% — mirrors the badge/pill styling already used
// for counts elsewhere in this file (`badge bg-danger`, `badge bg-success`).
const completionBadgeClass = (pct) => {
  if (pct >= 70) return 'badge bg-success';
  if (pct >= 40) return 'badge bg-warning text-dark';
  return 'badge bg-danger';
};

/**
 * Small colored bar-in-cell: a green (or custom) fill proportional to `pct`,
 * with the numeric count + percentage as text alongside it.
 */
const ProgressCell = ({ count, pct, color, label }) => (
  <div className="d-flex align-items-center gap-2" style={{ minWidth: 140 }}>
    <div className="flex-grow-1 bg-neutral-200 rounded-pill overflow-hidden" style={{ height: 8 }}>
      <div
        className="h-100 rounded-pill"
        style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, backgroundColor: color }}
      />
    </div>
    <span className="text-sm text-nowrap">{count} {label ? `${label} ` : ''}({pct}%)</span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Data-fetching hook. Everything below used to live directly inside the old
// <DistrictAdvancedAnalytics /> component body; it's unchanged in behaviour
// (same endpoints, same derived chart configs), just returned instead of
// rendered so multiple sibling sections can share one fetch.
//
// NOTE: the old component also fetched `districtAnalyticsAPI.getSummary(f)`
// and rendered its "period" + "as of today" KPI grids at the very top of the
// old single block. Every one of those KPIs (registrations, USG total/
// completion, referrals, deliveries, maternal/infant deaths, active
// pregnancies, active high-risk, pending referrals, ...) duplicated a Primary
// KPI card already shown higher up the page, and the required final section
// order has no slot for a standalone "summary" block — so that fetch and its
// rendering have been removed entirely rather than kept as a duplicate.
// ─────────────────────────────────────────────────────────────────────────────
export function useDistrictAnalytics(onOverdueClick) {
  const [options, setOptions] = useState(null);
  const [filters, setFilters] = useState({});
  const [trends, setTrends] = useState(null);
  const [demo, setDemo] = useState(null);
  const [care, setCare] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [geo, setGeo] = useState(null);
  const [watch, setWatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    districtAnalyticsAPI.getFilterOptions().then(setOptions).catch(() => setOptions({}));
  }, []);

  const load = useCallback(async (f) => {
    setLoading(true);
    setErr(null);
    try {
      const [t, d, c, dl, g, w] = await Promise.all([
        districtAnalyticsAPI.getTrends(f),
        districtAnalyticsAPI.getDemographics(f),
        districtAnalyticsAPI.getCare(f),
        districtAnalyticsAPI.getDelivery(f),
        districtAnalyticsAPI.getGeography(f),
        districtAnalyticsAPI.getWatchlist(f, { limit: 6 }),
      ]);
      setTrends(t); setDemo(d); setCare(c); setDelivery(dl); setGeo(g); setWatch(w);
    } catch (e) {
      console.error('Advanced analytics load error:', e);
      setErr(e.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(filters); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilters = (f) => { setFilters(f); load(f); };

  // TODO: no navigation handler has been wired up by the parent yet — pass an
  // `onOverdueClick(centreId)` argument to `useDistrictAnalytics` to navigate
  // to (e.g.) the filtered list of overdue USG appointments for that centre.
  const handleOverdueClick = useCallback((centreId) => {
    if (onOverdueClick) {
      onOverdueClick(centreId);
    } else {
      console.warn('useDistrictAnalytics: onOverdueClick not provided, ignoring click for centre', centreId);
    }
  }, [onOverdueClick]);

  const trendChart = trends ? {
    series: [
      { name: 'Registrations', data: trends.series.map(b => b.registrations) },
      { name: 'ANC visits', data: trends.series.map(b => b.anc_visits) },
      { name: 'USG scheduled', data: trends.series.map(b => b.usg_scheduled) },
    ],
    options: {
      ...emptyOpts,
      chart: { type: 'line', height: 300, toolbar: { show: false } },
      stroke: { curve: 'smooth', width: 2 },
      xaxis: { categories: trends.series.map(b => b.label) },
      colors: CHART_COLORS,
      legend: { position: 'top' },
      grid: { borderColor: '#E5E7EB', strokeDashArray: 3 },
    },
  } : null;

  const ageChart = demo?.age_bands?.length ? {
    series: [{ name: 'Women', data: demo.age_bands.map(a => a.total) }],
    options: {
      ...emptyOpts,
      chart: { type: 'bar', height: 260, toolbar: { show: false } },
      plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
      xaxis: { categories: demo.age_bands.map(a => a.label) },
      colors: ['#487FFF'],
      dataLabels: { enabled: false },
    },
  } : null;

  // "Blood Group" is a filter/detail field, never a risk-factor bar — the backend already
  // excludes it, but guard here too in case older cached data still carries it through.
  const riskFactorRows = (demo?.risk_factors || []).filter(r => r.name?.trim().toLowerCase() !== 'blood group');

  const riskFactorChart = riskFactorRows.length ? {
    series: [{ name: 'Cases', data: riskFactorRows.map(r => r.count) }],
    options: {
      ...emptyOpts,
      chart: { type: 'bar', height: Math.max(260, riskFactorRows.length * 28), toolbar: { show: false } },
      plotOptions: { bar: { borderRadius: 4, horizontal: true } },
      xaxis: { categories: riskFactorRows.map(r => r.name) },
      colors: ['#DC143C'],
      dataLabels: { enabled: false },
      tooltip: {
        custom: ({ dataPointIndex }) => {
          const row = riskFactorRows[dataPointIndex];
          if (!row) return '';
          const examples = (row.raw_examples || []).join('; ');
          return `<div class="apexcharts-tooltip-custom p-2">
            <div class="fw-semibold">${row.name}: ${row.count}</div>
            ${examples ? `<div class="text-secondary-light text-xs mt-1" title="${examples}">${examples}</div>` : ''}
          </div>`;
        },
      },
    },
  } : null;

  const anaemiaChart = care?.anc?.anaemia ? {
    series: care.anc.anaemia.categories.map(c => c.count),
    options: {
      ...emptyOpts,
      chart: { type: 'donut', height: 280 },
      labels: care.anc.anaemia.categories.map(c => c.label),
      colors: ['#28a745', '#FFA500', '#FF6B6B', '#8B0000', '#9CA3AF'],
      legend: { position: 'bottom' },
      dataLabels: { enabled: true, formatter: v => Math.round(v) + '%' },
    },
  } : null;

  const funnelChart = care?.anc?.funnel ? {
    series: [{ name: 'Women', data: care.anc.funnel.map(f => f.count) }],
    options: {
      ...emptyOpts,
      chart: { type: 'bar', height: 260, toolbar: { show: false } },
      plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
      xaxis: { categories: care.anc.funnel.map(f => f.label) },
      colors: ['#06B6D4'],
      dataLabels: { enabled: true },
    },
  } : null;

  const usgStatusChart = care?.usg?.status?.length ? {
    series: care.usg.status.map(s => s.count),
    options: {
      ...emptyOpts,
      chart: { type: 'donut', height: 280 },
      labels: care.usg.status.map(s => s.label),
      colors: CHART_COLORS,
      legend: { position: 'bottom' },
    },
  } : null;

  // PMSMA Session Status donut — derived client-side from the per-centre rows
  // the /care endpoint already returns (no new API call): "Attended"/"Missed"/
  // "Cancelled" come straight from those rows, "Upcoming" is whatever's left
  // of `scheduled` once those three are accounted for.
  const pmsmaStatusChart = care?.pmsma?.centres?.length ? (() => {
    const totals = care.pmsma.centres.reduce((acc, c) => {
      acc.attended += c.attended || 0;
      acc.missed += c.missed || 0;
      acc.cancelled += c.cancelled || 0;
      acc.scheduled += c.scheduled || 0;
      return acc;
    }, { attended: 0, missed: 0, cancelled: 0, scheduled: 0 });
    const upcoming = Math.max(totals.scheduled - totals.attended - totals.missed - totals.cancelled, 0);
    return {
      series: [totals.attended, upcoming, totals.missed, totals.cancelled],
      options: {
        ...emptyOpts,
        chart: { type: 'donut', height: 280 },
        labels: ['Attended', 'Upcoming', 'Missed', 'Cancelled'],
        colors: ['#28a745', '#487FFF', '#FFA500', '#DC143C'],
        legend: { position: 'bottom' },
        dataLabels: { enabled: true, formatter: v => Math.round(v) + '%' },
      },
    };
  })() : null;

  const deliveryTypeChart = delivery?.outcomes?.delivery_types?.length ? {
    series: delivery.outcomes.delivery_types.map(d => d.count),
    options: {
      ...emptyOpts,
      chart: { type: 'donut', height: 280 },
      labels: delivery.outcomes.delivery_types.map(d => d.label),
      colors: CHART_COLORS,
      legend: { position: 'bottom' },
      dataLabels: {
        enabled: true,
        // Show count + percentage on each slice, not just the percentage.
        formatter: (val, opts) => {
          const count = opts.w.globals.series[opts.seriesIndex];
          return `${count} (${Math.round(val)}%)`;
        },
      },
    },
  } : null;

  const geoChart = geo?.rows?.length ? {
    series: [
      { name: 'Registrations', data: geo.rows.map(r => r.registrations) },
      { name: 'High-risk', data: geo.rows.map(r => r.high_risk) },
    ],
    options: {
      ...emptyOpts,
      chart: { type: 'bar', height: 300, toolbar: { show: false }, fontFamily: 'inherit' },
      plotOptions: {
        bar: {
          borderRadius: 6,
          borderRadiusApplication: 'end',
          columnWidth: '38%',
          dataLabels: { position: 'top' }
        }
      },
      fill: {
        type: 'gradient',
        gradient: { shade: 'light', type: 'vertical', shadeIntensity: 0.35, opacityFrom: 1, opacityTo: 0.85, stops: [0, 100] }
      },
      stroke: { show: true, width: 2, colors: ['transparent'] },
      xaxis: {
        categories: geo.rows.map(r => r.name),
        labels: { rotate: -35, trim: false, style: { fontSize: '11px' }, hideOverlappingLabels: false },
      },
      grid: { padding: { bottom: 8 }, strokeDashArray: 4 },
      colors: ['#487FFF', '#DC143C'],
      legend: { position: 'top' },
      dataLabels: { enabled: true, offsetY: -18, style: { fontSize: '10px', colors: ['#344054'] }, background: { enabled: false } },
    },
  } : null;

  // How much horizontal room the bar-group chart needs so blocks/sub-centres/
  // wards don't get squeezed together — the card scrolls instead of cramming.
  const geoChartMinWidth = geo?.rows?.length ? Math.max(640, geo.rows.length * 110) : undefined;

  return {
    options, filters, applyFilters, loading, err,
    trends, demo, care, delivery, geo, watch,
    handleOverdueClick,
    trendChart, ageChart, riskFactorChart, riskFactorRows, anaemiaChart, funnelChart,
    usgStatusChart, pmsmaStatusChart, deliveryTypeChart, geoChart, geoChartMinWidth,
  };
}

/** Filter bar + loading/error state for the hook's data — render once, above the first section that depends on it. */
export const AnalyticsControls = ({ aa }) => (
  <>
    <AnalyticsFilterBar options={aa.options} onApply={aa.applyFilters} />
    {aa.err && <div className="alert alert-danger mt-3">{aa.err}</div>}
    {aa.loading && (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 160 }}>
        <div className="spinner-border text-primary" role="status" />
      </div>
    )}
  </>
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. ANC Monitoring — ANC Visit Funnel + Anaemia donut + On-Track ANC table
// ─────────────────────────────────────────────────────────────────────────────
export const AncMonitoringSection = ({ aa }) => {
  const { care, funnelChart, anaemiaChart } = aa;
  if (!funnelChart && !anaemiaChart && !(care?.anc?.on_track?.length > 0)) return null;
  return (
    <>
      <div className="d-flex align-items-center gap-2 mt-24 mb-16">
        <Icon icon="mdi:clipboard-pulse-outline" className="text-primary text-2xl" />
        <h6 className="text-lg fw-semibold mb-0">ANC Monitoring</h6>
      </div>
      <div className="row gy-4 mb-1">
        {funnelChart && (
          <div className="col-xxl-6">
            <div className="card h-100">
              <div className="card-header border-bottom bg-base py-16 px-24"><h6 className="text-lg fw-semibold mb-0">ANC Visit Funnel</h6></div>
              <div className="card-body p-24">
                <ReactApexChart {...funnelChart} type="bar" height={260} />
                <p className="text-sm text-secondary-light mt-2 mb-0">Average visits so far: <b>{care.anc.avg_visits}</b></p>
              </div>
            </div>
          </div>
        )}
        {anaemiaChart && (
          <div className="col-xxl-6">
            <div className="card h-100">
              <div className="card-header border-bottom bg-base py-16 px-24"><h6 className="text-lg fw-semibold mb-0">Anaemia (latest Hb, active cases)</h6></div>
              <div className="card-body p-24"><ReactApexChart {...anaemiaChart} type="donut" height={280} /></div>
            </div>
          </div>
        )}
      </div>

      {care?.anc?.on_track?.length > 0 && (
        <div className="card mb-4">
          <div className="card-header border-bottom bg-base py-16 px-24"><h6 className="text-lg fw-semibold mb-0">On-Track ANC by Trimester (Active Pregnancies)</h6></div>
          <div className="card-body p-24">
            <div className="table-responsive">
              <table className="table table-sm">
                <thead><tr><th>Trimester</th><th>Women</th><th>Expected visits</th><th>Avg visits</th><th>On track</th><th>Behind</th></tr></thead>
                <tbody>
                  {care.anc.on_track.map(t => (
                    <tr key={t.trimester}>
                      <td>{t.label}</td><td>{t.women}</td><td>{t.expected_visits}</td><td>{t.avg_visits}</td>
                      <td><ProgressCell count={t.on_track} pct={t.on_track_pct} color="#28a745" /></td>
                      <td><ProgressCell count={t.behind} pct={pctOf(t.behind, t.women)} color="#DC143C" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. USG Monitoring — USG Status donut + USG Centre Performance table
// ─────────────────────────────────────────────────────────────────────────────
export const UsgMonitoringSection = ({ aa }) => {
  const { care, usgStatusChart, handleOverdueClick } = aa;
  if (!usgStatusChart && !(care?.usg?.centres?.length > 0)) return null;
  return (
    <>
      <div className="d-flex align-items-center gap-2 mt-24 mb-16">
        <Icon icon="material-symbols:calendar-month" className="text-primary text-2xl" />
        <h6 className="text-lg fw-semibold mb-0">USG Monitoring</h6>
      </div>
      <div className="row gy-4 mb-1">
        {usgStatusChart && (
          <div className="col-xxl-4">
            <div className="card h-100">
              <div className="card-header border-bottom bg-base py-16 px-24"><h6 className="text-lg fw-semibold mb-0">USG Status</h6></div>
              <div className="card-body p-24"><ReactApexChart {...usgStatusChart} type="donut" height={280} /></div>
            </div>
          </div>
        )}
        {care?.usg?.centres?.length > 0 && (
          <div className="col-xxl-8">
            <div className="card h-100">
              <div className="card-header border-bottom bg-base py-16 px-24"><h6 className="text-lg fw-semibold mb-0">USG Centre Performance</h6></div>
              <div className="card-body p-24">
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead><tr><th>Centre</th><th>Total</th><th>Completed</th><th>Completion</th><th>Overdue now</th><th>Avg delay (days)</th></tr></thead>
                    <tbody>
                      {care.usg.centres.map(c => (
                        <tr key={c.usg_centre_id}>
                          <td>{c.name}</td><td>{c.total}</td><td>{c.completed}</td>
                          <td>{c.completion_pct}%</td>
                          <td>
                            {c.overdue_now > 0 ? (
                              <button
                                type="button"
                                className="badge bg-danger border-0"
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleOverdueClick(c.usg_centre_id)}
                                title={`View ${c.overdue_now} overdue scan(s) at ${c.name}`}
                              >
                                {c.overdue_now}
                              </button>
                            ) : 0}
                          </td>
                          <td>{c.avg_delay_days ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. PMSMA Monitoring — PMSMA Session Status donut (new) + PMSMA Centre Performance table
// ─────────────────────────────────────────────────────────────────────────────
export const PmsmaMonitoringSection = ({ aa }) => {
  const { care, pmsmaStatusChart } = aa;
  if (!pmsmaStatusChart && !(care?.pmsma?.centres?.length > 0)) return null;
  return (
    <>
      <div className="d-flex align-items-center gap-2 mt-24 mb-16">
        <Icon icon="material-symbols:event-available" className="text-primary text-2xl" />
        <h6 className="text-lg fw-semibold mb-0">PMSMA Monitoring</h6>
      </div>
      <div className="row gy-4 mb-1">
        {pmsmaStatusChart && (
          <div className="col-xxl-4">
            <div className="card h-100">
              <div className="card-header border-bottom bg-base py-16 px-24"><h6 className="text-lg fw-semibold mb-0">PMSMA Session Status</h6></div>
              <div className="card-body p-24"><ReactApexChart {...pmsmaStatusChart} type="donut" height={280} /></div>
            </div>
          </div>
        )}
        {care?.pmsma?.centres?.length > 0 && (
          <div className="col-xxl-8">
            <div className="card h-100">
              <div className="card-header border-bottom bg-base py-16 px-24"><h6 className="text-lg fw-semibold mb-0">PMSMA Centre Performance</h6></div>
              <div className="card-body p-24">
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Centre</th><th>Scheduled</th><th>Attended</th><th>Attendance %</th>
                        <th>Missed</th><th>Cancelled</th><th>Next Session</th>
                      </tr>
                    </thead>
                    <tbody>
                      {care.pmsma.centres.map(c => (
                        <tr key={c.pmsma_centre_id}>
                          <td>{c.name}</td>
                          <td>{c.scheduled}</td>
                          <td>{c.attended}</td>
                          <td>{c.attendance_pct}%</td>
                          <td>{c.missed > 0 ? <span className="badge bg-danger">{c.missed}</span> : 0}</td>
                          <td>{c.cancelled}</td>
                          <td>{c.next_session ? formatDateTime(c.next_session) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. Delivery Monitoring — Delivery Types donut + Delivery Point Performance
// ─────────────────────────────────────────────────────────────────────────────
export const DeliveryMonitoringSection = ({ aa }) => {
  const { delivery, deliveryTypeChart } = aa;
  if (!deliveryTypeChart && !(delivery?.delivery_points?.length > 0)) return null;
  const completedReferrals = delivery?.referrals?.status?.find(st => st.key === 'completed')?.count || 0;
  return (
    <>
      <div className="d-flex align-items-center gap-2 mt-24 mb-16">
        <Icon icon="material-symbols:local-shipping" className="text-primary text-2xl" />
        <h6 className="text-lg fw-semibold mb-0">Delivery Monitoring</h6>
      </div>
      <div className="card mb-4">
        <div className="card-header border-bottom bg-base py-16 px-24"><h6 className="text-lg fw-semibold mb-0">Delivery Overview</h6></div>
        <div className="card-body p-24">
          <div className="row gy-4">
            {deliveryTypeChart && (
              <div className="col-xxl-4">
                <p className="fw-medium text-sm text-secondary-light mb-2">Delivery Types</p>
                <ReactApexChart {...deliveryTypeChart} type="donut" height={280} />
              </div>
            )}
            <div className="col-xxl-8">
              <p className="fw-medium text-sm text-secondary-light mb-2">Delivery Point Performance</p>
              <div className="row row-cols-xxxl-4 row-cols-sm-2 row-cols-1 gy-3 mb-3">
                <KpiCard k={{ key: 'total_referrals', label: 'Total Referrals', value: delivery?.referrals?.total || 0 }} />
                <KpiCard k={{
                  key: 'completed', label: 'Completed',
                  value: completedReferrals,
                  hint: `${pctOf(completedReferrals, delivery?.referrals?.total || 0)}% of total`,
                }} />
                <KpiCard k={{ key: 'deliveries', label: 'Deliveries', value: delivery?.outcomes?.total || 0 }} />
                {/* "Maternal Deaths" is already a Primary KPI card higher up the page (see
                    DashboardDistrictPage) — not repeated here as its own KpiCard so the same
                    count isn't shown twice; this slot keeps the 4-column grid intact and
                    points back to where the number lives. */}
                <div className="col">
                  <div className="card shadow-none border h-100">
                    <div className="card-body p-16 d-flex flex-column justify-content-center h-100">
                      <p className="fw-medium text-secondary-light text-sm mb-1">Maternal Deaths</p>
                      <p className="text-xs text-secondary-light mb-0">See KPI cards above</p>
                    </div>
                  </div>
                </div>
              </div>
              {delivery?.delivery_points?.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead><tr><th>DP</th><th>Referrals</th><th>Completed</th><th>Completion</th><th>Deliveries</th><th>Maternal deaths</th></tr></thead>
                    <tbody>
                      {delivery.delivery_points.map(d => (
                        <tr key={d.dp_id}>
                          <td>{d.name}</td><td>{d.referrals}</td><td>{d.completed}</td>
                          <td><span className={completionBadgeClass(d.completion_pct)}>{d.completion_pct}%</span></td>
                          <td>{d.deliveries}</td>
                          <td>{d.maternal_deaths > 0 ? <span className="badge bg-danger">{d.maternal_deaths}</span> : 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. Geography — Blocks bar chart + table (paired on the page with the
// dashboard's own "Block-wise Performance" chart, which supplies the monthly
// trend + block picker half of the Geography section).
// ─────────────────────────────────────────────────────────────────────────────
export const GeographyBlocksSection = ({ aa }) => {
  const { geo, geoChart, geoChartMinWidth } = aa;
  if (!geoChart) return null;
  return (
    <div className="card mb-4 shadow-sm border-0" style={{ borderLeft: '4px solid #DC143C' }}>
      <div className="card-header border-bottom bg-base py-16 px-24">
        <h6 className="text-lg fw-semibold mb-0">Geography — {geo.level === 'block' ? 'Blocks' : geo.level === 'sub_centre' ? 'Sub-Centres' : 'Wards'}</h6>
      </div>
      <div className="card-body p-24">
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: geoChartMinWidth }}>
            <ReactApexChart {...geoChart} type="bar" height={300} />
          </div>
        </div>
        <div className="table-responsive mt-3">
          <table className="table table-sm table-striped">
            <thead>
              <tr><th>{geo.level === 'block' ? 'Block' : geo.level === 'sub_centre' ? 'Sub-Centre' : 'Ward'}</th>
                <th>Women (Registrations)</th><th>High-risk (%)</th><th>Active Pregnancies</th>
                <th>ANC 1+ (%)</th><th>ANC 4+ (%)</th><th>USG Completion (%)</th></tr>
            </thead>
            <tbody>
              {geo.rows.map(r => (
                <tr key={r.id ?? 'unassigned'}>
                  <td>{r.name}</td><td>{r.women}</td>
                  <td>{r.high_risk} ({r.hr_pct}%)</td><td>{r.active}</td>
                  <td>{r.anc1_pct}%</td><td>{r.anc4_pct}%</td><td>{r.usg_completion_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 8a. Advanced Analytics — Age Distribution & Risk Factors
// ─────────────────────────────────────────────────────────────────────────────
export const AgeRiskSection = ({ aa }) => {
  const { ageChart, riskFactorChart, riskFactorRows } = aa;
  if (!ageChart && !riskFactorChart) return null;
  return (
    <div className="row gy-4 mb-1">
      {ageChart && (
        <div className="col-xxl-6">
          <div className="card h-100">
            <div className="card-header border-bottom bg-base py-16 px-24"><h6 className="text-lg fw-semibold mb-0">Age Distribution</h6></div>
            <div className="card-body p-24"><ReactApexChart {...ageChart} type="bar" height={260} /></div>
          </div>
        </div>
      )}
      {riskFactorChart && (
        <div className="col-xxl-6">
          <div className="card h-100">
            <div className="card-header border-bottom bg-base py-16 px-24"><h6 className="text-lg fw-semibold mb-0">Top Risk Factors</h6></div>
            <div className="card-body p-24"><ReactApexChart {...riskFactorChart} type="bar" height={Math.max(260, riskFactorRows.length * 28)} /></div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 8d. Advanced Analytics — Weekly Trends (bucketed registrations/ANC/USG line chart)
// ─────────────────────────────────────────────────────────────────────────────
export const WeeklyTrendsSection = ({ aa }) => {
  const { trends, trendChart } = aa;
  if (!trendChart) return null;
  return (
    <div className="card mb-4 shadow-sm border-0" style={{ borderLeft: '4px solid #28a745' }}>
      <div className="card-header border-bottom bg-base py-16 px-24">
        <h6 className="text-lg fw-semibold mb-0">Weekly Trends</h6>
        <p className="text-xs text-secondary-light mb-0 mt-4">Bucketed by {trends.granularity} over the selected period</p>
      </div>
      <div className="card-body p-24">
        <ReactApexChart {...trendChart} type="line" height={300} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 9. Needs Attention — always the last section on the page
// ─────────────────────────────────────────────────────────────────────────────
export const NeedsAttentionSection = ({ aa }) => {
  const { watch } = aa;
  if (!watch) return null;
  const lists = WATCHLIST_ORDER
    .map((key) => watch.lists.find((l) => l.key === key))
    .filter(Boolean);
  const grandTotal = lists.reduce((n, l) => n + (l.total || 0), 0);
  return (
    <div className="mb-4">
      <style>{NA_CSS}</style>
      <div className="d-flex align-items-center justify-content-between mb-16 mt-24">
        <div className="d-flex align-items-center gap-2">
          <Icon icon="material-symbols:notification-important-outline" className="text-danger-main text-2xl" />
          <h6 className="text-lg fw-semibold mb-0">Needs Attention</h6>
        </div>
        <span className="text-sm text-secondary-light">
          {grandTotal === 0 ? 'Nothing pending' : `${grandTotal} case${grandTotal === 1 ? '' : 's'} need follow-up`}
        </span>
      </div>
      <div className="row gy-4">
        {lists.map((list) => {
          const cfg = WATCHLIST_CARD_CONFIG[list.key];
          const visibleItems = list.items.slice(0, WATCHLIST_ROW_LIMIT);
          const hasMore = list.total > WATCHLIST_ROW_LIMIT;
          return (
            <div className="col-xxl-6" key={list.key}>
              <div className="na-card" style={{ '--na-tone': cfg.tone, '--na-soft': `${cfg.tone}1f` }}>
                <div className="na-head">
                  <span className="na-icon"><Icon icon={cfg.icon} style={{ fontSize: 21 }} /></span>
                  <h6 className="na-title">{list.title}</h6>
                  <span className="na-count">{list.total}</span>
                </div>
                {list.items.length === 0 ? (
                  <div className="na-empty">
                    <Icon icon="material-symbols:check-circle-outline" style={{ fontSize: 30, color: '#16a34a' }} />
                    All clear — nothing to follow up here.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="na-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Block</th>
                          <th>{cfg.dateHeader}</th>
                          <th>Action status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleItems.map((it) => {
                          const d = cfg.date(it);
                          const st = ACTION_STATUS[it.action_status?.key];
                          return (
                            <tr key={it.id}>
                              <td>
                                <div className="na-name">{it.name}</div>
                                {it.sub_centre && <div className="na-sub">{it.sub_centre}</div>}
                              </td>
                              <td>{it.block || '—'}</td>
                              <td>
                                <div>{d.main}</div>
                                {d.sub && <div className={`na-sub ${d.subTone || ''}`}>{d.sub}</div>}
                              </td>
                              <td>
                                {st ? (
                                  <>
                                    <span className={`na-pill ${st.tone}`}>{st.label}</span>
                                    {it.action_status.detail && (
                                      <div className="na-sub">
                                        {it.action_status.key === 'escalated' ? `to ${it.action_status.detail}` : `at ${it.action_status.detail}`}
                                      </div>
                                    )}
                                  </>
                                ) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {hasMore && (
                  <div className="na-foot">
                    <Link to={list.link || '#'} className="text-primary-600 fw-medium">
                      View all {list.total} cases
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};