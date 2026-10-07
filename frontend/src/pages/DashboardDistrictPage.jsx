import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import { dashboardAPI, pmsmaSessionAPI, mobilisationAPI } from "../services/api";
import ReactApexChart from 'react-apexcharts';
import { Icon } from '@iconify/react/dist/iconify.js';
import {
  useDistrictAnalytics,
  AnalyticsControls,
  AncMonitoringSection,
  UsgMonitoringSection,
  PmsmaMonitoringSection,
  DeliveryMonitoringSection,
  GeographyBlocksSection,
  AgeRiskSection,
  WeeklyTrendsSection,
  NeedsAttentionSection,
} from '../components/DistrictAdvancedAnalytics';

// Small inline summary-stat card, reused for the Block-wise Performance,
// High Risk Timeline and Registration Trends sections below. Defined at module
// scope (not inside the page component) so it isn't re-created / remounted on
// every render of the page.
const MiniStat = ({ label, value, delta, deltaSuffix = '%', deltaGood = 'up', deltaLabel = 'vs previous month', hint }) => {
  const hasDelta = delta !== null && delta !== undefined;
  const isGood = hasDelta ? (deltaGood === 'down' ? delta <= 0 : delta >= 0) : null;
  return (
    <div className="col">
      <div className="border rounded-8 p-12 h-100 bg-base">
        <p className="text-xs text-secondary-light mb-1">{label}</p>
        <h6 className="mb-0">{value}</h6>
        {hasDelta ? (
          <p className={`text-xs mt-4 mb-0 d-flex align-items-center gap-1 ${isGood ? 'text-success-main' : 'text-danger-main'}`}>
            <Icon icon={delta >= 0 ? 'bxs:up-arrow' : 'bxs:down-arrow'} className="text-xs" />
            {delta >= 0 ? '+' : ''}{delta}{deltaSuffix} {deltaLabel}
          </p>
        ) : hint ? (
          <p className="text-xs text-secondary-light mt-4 mb-0">{hint}</p>
        ) : null}
      </div>
    </div>
  );
};

// KPI card used for every headline number on this page.
// Layout: label (+ info tooltip) and a tinted icon tile on top, the number large
// underneath, and a slim accent bar on the left edge that carries the meaning
// (blue = volume, green = healthy, amber/purple = needs follow-up, red = risk).
// The call sites still pass `iconBg`; it is mapped to a tone here so the JSX
// below did not need to change.
const KPI_TONES = {
  'bg-cyan': '#0284c7',
  'bg-info': '#0284c7',
  'bg-success-main': '#16a34a',
  'bg-purple': '#7c3aed',
  'bg-warning-main': '#d97706',
  'bg-red': '#dc2626',
  'bg-danger': '#dc2626',
};

const KPI_CSS = `
.kpi2 {
  position: relative; height: 100%; box-sizing: border-box;
  background: var(--white, #fff);
  border: 1px solid var(--neutral-200, #e5e7eb);
  border-radius: 14px;
  padding: 16px 18px 16px 22px;
  cursor: pointer; outline: none;
  transition: box-shadow .18s ease, border-color .18s ease;
}
.kpi2::before {
  content: ''; position: absolute; left: 0; top: 16px; bottom: 16px; width: 4px;
  border-radius: 0 4px 4px 0; background: var(--kpi-tone);
}
.kpi2:hover { box-shadow: 0 8px 22px rgba(15, 23, 42, .09); border-color: var(--kpi-tone); }
.kpi2:focus-visible { box-shadow: 0 0 0 3px var(--kpi-soft); border-color: var(--kpi-tone); }
.kpi2-label { font-size: 13.5px; font-weight: 500; line-height: 1.3; color: var(--text-secondary-light, #64748b); }
.kpi2-value { font-size: 32px; line-height: 1.1; font-weight: 700; letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums; color: var(--text-primary-light, #0f172a); margin: 14px 0 0; }
.kpi2-tile { width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; background: var(--kpi-soft); color: var(--kpi-tone); }
.kpi2-subs { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.kpi2-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; line-height: 1; padding: 5px 9px;
  border-radius: 999px; background: var(--neutral-100, #f1f5f9); color: var(--text-secondary-light, #475569); border: 0;
  font-variant-numeric: tabular-nums; }
.kpi2-chip b { font-weight: 700; color: var(--text-primary-light, #0f172a); }
.kpi2-chip .dot { width: 7px; height: 7px; border-radius: 50%; background: #94a3b8; }
.kpi2-chip.success .dot { background: #16a34a; } .kpi2-chip.warning .dot { background: #d97706; }
.kpi2-chip.danger .dot { background: #dc2626; } .kpi2-chip.info .dot { background: #0284c7; }
button.kpi2-chip { cursor: pointer; } button.kpi2-chip:hover { background: var(--kpi-soft); }
.kpi2-bar { height: 6px; border-radius: 999px; background: var(--neutral-200, #e5e7eb); margin-top: 12px; overflow: hidden; }
.kpi2-bar > span { display: block; height: 100%; border-radius: 999px; background: var(--kpi-tone); }
.kpi2-note { font-size: 12px; color: var(--text-secondary-light, #64748b); margin: 8px 0 0; line-height: 1.35; }
.dash-section { display: flex; align-items: center; gap: 10px; margin: 0 0 14px; }
.dash-section-icon { width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center;
  justify-content: center; background: rgba(2, 132, 199, .12); color: #0284c7; }
.dash-section h6 { margin: 0; font-size: 17px; font-weight: 600; }
.dash-section::after { content: ''; flex: 1; height: 1px; background: var(--neutral-200, #e5e7eb); margin-left: 6px; }
`;

const SectionHeading = ({ icon, title }) => (
  <div className="dash-section">
    <span className="dash-section-icon"><Icon icon={icon} style={{ fontSize: 18 }} /></span>
    <h6>{title}</h6>
  </div>
);

const KpiCard = ({ label, value, hint, icon, iconBg, onClick, subs, progress, note }) => {
  const [showHint, setShowHint] = useState(false);
  const tone = KPI_TONES[iconBg] || '#0284c7';
  const shown = typeof value === 'number' ? value.toLocaleString('en-IN') : value;
  return (
    <div className="col">
      <div
        className="kpi2"
        role="button"
        tabIndex={0}
        style={{ '--kpi-tone': tone, '--kpi-soft': `${tone}1f` }}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick && onClick(); } }}
      >
        <div className="d-flex align-items-start justify-content-between gap-12">
          <div className="d-flex align-items-start gap-6 position-relative" style={{ minWidth: 0 }}>
            <span className="kpi2-label" title={label}>{label}</span>
            {hint && (
              <span
                tabIndex={0}
                role="img"
                aria-label={hint}
                className="d-inline-flex flex-shrink-0 text-secondary-light"
                style={{ cursor: 'help', outline: 'none', marginTop: 1 }}
                onMouseEnter={() => setShowHint(true)}
                onMouseLeave={() => setShowHint(false)}
                onFocus={() => setShowHint(true)}
                onBlur={() => setShowHint(false)}
                onClick={(e) => { e.stopPropagation(); setShowHint((v) => !v); }}
              >
                <Icon icon="mdi:information-outline" style={{ fontSize: 15 }} />
              </span>
            )}
            {hint && showHint && (
              <div
                className="position-absolute bg-neutral-900 text-white text-xs radius-8 px-12 py-8 shadow"
                style={{ top: '100%', left: 0, marginTop: 6, zIndex: 20, width: 240, maxWidth: '80vw', lineHeight: 1.4, pointerEvents: 'none' }}
              >
                {hint}
              </div>
            )}
          </div>
          <div className="kpi2-tile"><Icon icon={icon} style={{ fontSize: 22 }} /></div>
        </div>
        <p className="kpi2-value">{shown}</p>
        {typeof progress === 'number' && (
          <div className="kpi2-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
        )}
        {subs && subs.length > 0 && (
          <div className="kpi2-subs">
            {subs.map((sub) => {
              const inner = (<><span className="dot" /><b>{sub.value}</b> {sub.label}</>);
              return sub.onClick ? (
                <button key={sub.label} type="button" className={`kpi2-chip ${sub.tone || ''}`}
                  onClick={(e) => { e.stopPropagation(); sub.onClick(); }}>{inner}</button>
              ) : (
                <span key={sub.label} className={`kpi2-chip ${sub.tone || ''}`}>{inner}</span>
              );
            })}
          </div>
        )}
        {note && <p className="kpi2-note">{note}</p>}
      </div>
    </div>
  );
};

// Unit wording for the Registration Trends summary cards, driven by the selected view.
const TREND_UNITS = {
  Yearly: { avg: 'Average per Month', high: 'Highest in a Month', low: 'Lowest in a Month' },
  Monthly: { avg: 'Average per Day', high: 'Highest in a Day', low: 'Lowest in a Day' },
  Weekly: { avg: 'Average per Week', high: 'Highest in a Week', low: 'Lowest in a Week' },
  Today: { avg: 'Registrations Today', high: 'Highest', low: 'Lowest' },
};

const DashboardDistrictPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [monthlyTrends, setMonthlyTrends] = useState(null);
  const [blockWiseTrends, setBlockWiseTrends] = useState(null);
  const [highRiskAnalysis, setHighRiskAnalysis] = useState(null);
  const [districtHighRiskTimeline, setDistrictHighRiskTimeline] = useState(null);
  const [pmsmaSummary, setPmsmaSummary] = useState(null);
  const [mobilisationCount, setMobilisationCount] = useState(null);
  const [nearEddCases, setNearEddCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ancViewFilter, setAncViewFilter] = useState('Yearly');
  const [selectedBlock, setSelectedBlock] = useState('all');
  const currentYear = new Date().getFullYear();

  // Advanced-analytics data (ANC/USG/PMSMA/Delivery/Geography monitoring charts
  // + tables, Age/Risk breakdown, Weekly Trends and Needs Attention) is fetched
  // and derived by this hook. The overdue-USG click handler navigates to the
  // USG appointments screen's "Overdue" tab. (That screen supports ?tab=overdue
  // but has no per-centre filter yet, so centreId is not forwarded.)
  const aa = useDistrictAnalytics(() => navigate('/usg-appointment-management?tab=overdue'));

  useEffect(() => {
    const fetchData = async () => {
      try {
        // allSettled: one failing endpoint (e.g. a role restriction on the
        // mobilisation or PMSMA call) must only blank its own card, not the
        // whole dashboard.
        const results = await Promise.allSettled([
          dashboardAPI.getStats(),
          dashboardAPI.getMonthlyTrends(currentYear),
          dashboardAPI.getBlockWiseTrends(currentYear),
          dashboardAPI.getHighRiskAnalysis(),
          dashboardAPI.getDistrictHighRiskTimeline(6),
          pmsmaSessionAPI.getDashboardSummary(),
          mobilisationAPI.getCount(),
          mobilisationAPI.getCases({ triggerType: 'near_edd' }),
        ]);
        const names = ['stats', 'monthlyTrends', 'blockWiseTrends', 'highRiskAnalysis',
                       'districtHighRiskTimeline', 'pmsmaSummary', 'mobilisationCount', 'nearEddCases'];
        results.forEach((r, i) => {
          if (r.status === 'rejected') console.error(`Dashboard: failed to load ${names[i]}:`, r.reason);
        });
        const val = (i) => (results[i].status === 'fulfilled' ? results[i].value : null);

        setStats(val(0));
        setMonthlyTrends(val(1));
        setBlockWiseTrends(val(2));
        setHighRiskAnalysis(val(3));
        setDistrictHighRiskTimeline(val(4));
        setPmsmaSummary(val(5));
        setMobilisationCount(val(6));
        const nearEdd = val(7);
        setNearEddCases(Array.isArray(nearEdd) ? nearEdd : []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentYear]);

  useEffect(() => {
    const fetchANCTrends = async () => {
      try {
        let trendsData;
        if (ancViewFilter === 'Yearly') {
          trendsData = await dashboardAPI.getMonthlyTrends(currentYear);
        } else if (ancViewFilter === 'Monthly') {
          const currentMonth = new Date().getMonth() + 1;
          trendsData = await dashboardAPI.getDailyTrends(currentMonth, currentYear);
        } else if (ancViewFilter === 'Weekly') {
          trendsData = await dashboardAPI.getWeeklyTrends(currentYear);
        } else if (ancViewFilter === 'Today') {
          trendsData = await dashboardAPI.getTodayStats();
        }
        setMonthlyTrends(trendsData);
      } catch (error) {
        console.error('Error fetching ANC trends:', error);
      }
    };
    fetchANCTrends();
  }, [ancViewFilter, currentYear]);

  const getANCChartCategories = () => {
    if (ancViewFilter === 'Yearly') {
      return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    } else if (ancViewFilter === 'Monthly') {
      return monthlyTrends?.daily_data?.map(day => `Day ${day.day}`) || [];
    } else if (ancViewFilter === 'Weekly') {
      return monthlyTrends?.weekly_data?.map(week => `Week ${week.week}`) || [];
    } else if (ancViewFilter === 'Today') {
      return ['Today'];
    }
    return [];
  };

  const getANCChartData = () => {
    if (ancViewFilter === 'Yearly') {
      return monthlyTrends?.monthly_data?.map(month => month.registrations) || [];
    } else if (ancViewFilter === 'Monthly') {
      return monthlyTrends?.daily_data?.map(day => day.registrations) || [];
    } else if (ancViewFilter === 'Weekly') {
      return monthlyTrends?.weekly_data?.map(week => week.registrations) || [];
    } else if (ancViewFilter === 'Today') {
      return [monthlyTrends?.registrations_today || 0];
    }
    return [];
  };

  const monthlyTrendsChart = {
    series: [{ name: 'Registrations', data: getANCChartData() }],
    options: {
      chart: { type: 'line', height: 300, toolbar: { show: false } },
      stroke: { curve: 'smooth', width: 3, colors: ['#487FFF'] },
      xaxis: { categories: getANCChartCategories() },
      grid: { borderColor: '#D1D5DB', strokeDashArray: 3 },
      markers: { size: 0, hover: { size: 8 } },
      yaxis: { labels: { formatter: function (value) { return Math.round(value); } } },
      noData: { text: 'No data available', align: 'center', verticalAlign: 'middle' }
    }
  };

  const riskDistributionChart = {
    series: [
      highRiskAnalysis?.total_high_risk || 0,
      (stats?.total_pregnant_women || 0) - (highRiskAnalysis?.total_high_risk || 0)
    ],
    options: {
      chart: { type: 'donut', height: 300 },
      labels: ['High Risk', 'Normal Risk'],
      colors: ['#FF6B6B', '#4ECDC4'],
      legend: {
        position: 'bottom',
        // Show explicit count + percentage per legend item (not just percentage on the slice).
        formatter: function (seriesName, opts) {
          const count = opts.w.globals.series[opts.seriesIndex];
          const pct = opts.w.globals.seriesPercent?.[opts.seriesIndex]?.[0];
          return `${seriesName}: ${count}${pct !== undefined ? ` (${Math.round(pct)}%)` : ''}`;
        }
      },
      dataLabels: { enabled: true, formatter: function (val) { return Math.round(val) + '%'; } },
      noData: { text: 'No data available', align: 'center', verticalAlign: 'middle' }
    }
  };

  const selectedBlockData = selectedBlock === 'all'
    ? null
    : blockWiseTrends?.blocks?.find(b => b.block_id === parseInt(selectedBlock));

  const blockWisePerformanceChart = blockWiseTrends ? (
    selectedBlockData ? {
      series: [
        { name: 'Registrations', data: selectedBlockData.monthly_data.map(m => m.registrations) },
        { name: 'USG Appointments', data: selectedBlockData.monthly_data.map(m => m.appointments) },
      ],
      options: {
        chart: { type: 'line', height: 300, toolbar: { show: false } },
        stroke: { curve: 'smooth', width: 2 },
        xaxis: { categories: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] },
        colors: ['#487FFF', '#28a745'],
        legend: { position: 'top' },
        dataLabels: { enabled: true, style: { fontSize: '10px' } },
        noData: { text: 'No data available', align: 'center', verticalAlign: 'middle' }
      }
    } : {
      series: [
        { name: 'Registrations', data: blockWiseTrends.blocks?.map(b => b.monthly_data.reduce((sum, m) => sum + m.registrations, 0)) || [] },
        { name: 'USG Appointments', data: blockWiseTrends.blocks?.map(b => b.monthly_data.reduce((sum, m) => sum + m.appointments, 0)) || [] }
      ],
      options: {
        chart: { type: 'bar', height: 300, toolbar: { show: false }, fontFamily: 'inherit' },
        plotOptions: {
          bar: {
            borderRadius: 6,
            borderRadiusApplication: 'end',
            columnWidth: '38%',
            distributed: false,
            dataLabels: { position: 'top' }
          }
        },
        fill: {
          type: 'gradient',
          gradient: { shade: 'light', type: 'vertical', shadeIntensity: 0.35, opacityFrom: 1, opacityTo: 0.85, stops: [0, 100] }
        },
        stroke: { show: true, width: 2, colors: ['transparent'] },
        xaxis: {
          categories: blockWiseTrends.blocks?.map(b => b.block_name) || [],
          labels: { rotate: -35, trim: false, style: { fontSize: '11px' }, hideOverlappingLabels: false },
        },
        grid: { padding: { bottom: 8 }, strokeDashArray: 4 },
        colors: ['#487FFF', '#28a745'],
        legend: { position: 'top' },
        // Every bar shows its numeric value directly.
        dataLabels: { enabled: true, offsetY: -18, style: { fontSize: '10px', colors: ['#344054'] }, background: { enabled: false } },
        noData: { text: 'No data available', align: 'center', verticalAlign: 'middle' }
      }
    }
  ) : null;

  // Give each block group real horizontal breathing room instead of squeezing
  // every block into a fixed-width chart — width grows with the number of
  // blocks and the container scrolls instead of cramming bars together.
  const blockWiseChartMinWidth = selectedBlock === 'all'
    ? Math.max(640, (blockWiseTrends?.blocks?.length || 0) * 110)
    : undefined;

  // Block-wise Performance summary cards — aggregated client-side from the
  // already-fetched blockWiseTrends response (no new API calls). They follow the
  // block picker: all blocks when "All Blocks" is selected, otherwise only the
  // chosen block.
  const blockTotals = (blockWiseTrends?.blocks || []).map(b => ({
    block_id: b.block_id,
    block_name: b.block_name,
    registrations: (b.monthly_data || []).reduce((sum, m) => sum + (m.registrations || 0), 0),
    appointments: (b.monthly_data || []).reduce((sum, m) => sum + (m.appointments || 0), 0),
  }));
  const scopedBlockTotals = selectedBlock === 'all'
    ? blockTotals
    : blockTotals.filter(b => b.block_id === parseInt(selectedBlock));
  const blockWiseTotalRegistrations = scopedBlockTotals.reduce((sum, b) => sum + b.registrations, 0);
  const blockWiseTotalUSG = scopedBlockTotals.reduce((sum, b) => sum + b.appointments, 0);
  const blocksCovered = scopedBlockTotals.filter(b => b.registrations > 0 || b.appointments > 0).length;

  const highRiskTimelineChart = districtHighRiskTimeline ? {
    series: districtHighRiskTimeline.datasets?.map(ds => ({ name: ds.label, data: ds.data })) || [],
    options: {
      chart: { type: 'area', height: 300, toolbar: { show: false } },
      stroke: { curve: 'smooth', width: 2 },
      // x-axis categories already come as "Mon YYYY" labels from the backend (visible month labels).
      xaxis: { categories: districtHighRiskTimeline.labels || [] },
      colors: ['#487FFF', '#DC143C'],
      fill: { type: 'gradient', gradient: { opacityFrom: 0.6, opacityTo: 0.1 } },
      legend: { position: 'top' },
      // Values shown directly on the chart, not only on hover.
      markers: { size: 4, hover: { size: 7 } },
      dataLabels: { enabled: true, style: { fontSize: '10px' } },
      noData: { text: 'No data available', align: 'center', verticalAlign: 'middle' }
    }
  } : null;

  // High Risk Timeline summary cards — aggregated client-side from the
  // already-fetched districtHighRiskTimeline response (no new API calls).
  const hrTimelineTotalCases = districtHighRiskTimeline?.datasets?.find(d => d.label === 'Total Cases')?.data || [];
  const hrTimelineHighRisk = districtHighRiskTimeline?.datasets?.find(d => d.label === 'High Risk')?.data || [];
  const hrTimelineTotalCasesSum = hrTimelineTotalCases.reduce((s, v) => s + (v || 0), 0);
  const hrTimelineHighRiskSum = hrTimelineHighRisk.reduce((s, v) => s + (v || 0), 0);
  const hrTimelineAvgPct = hrTimelineTotalCasesSum > 0
    ? Math.round((hrTimelineHighRiskSum / hrTimelineTotalCasesSum) * 100)
    : 0;

  const pctChange = (curVal, prevVal) => {
    if (prevVal === undefined || prevVal === null || prevVal === 0) return null;
    return Math.round(((curVal - prevVal) / prevVal) * 100);
  };
  const hrLen = hrTimelineTotalCases.length;
  // Period-over-period delta = latest month vs the month before it, within the already-fetched 6-month window.
  const hrTimelineTotalCasesDelta = hrLen >= 2 ? pctChange(hrTimelineTotalCases[hrLen - 1], hrTimelineTotalCases[hrLen - 2]) : null;
  const hrTimelineHighRiskDelta = hrLen >= 2 ? pctChange(hrTimelineHighRisk[hrLen - 1], hrTimelineHighRisk[hrLen - 2]) : null;
  const hrTimelinePctSeries = hrTimelineTotalCases.map((t, i) => (t > 0 ? (hrTimelineHighRisk[i] / t) * 100 : 0));
  const hrTimelineAvgPctDelta = hrLen >= 2
    ? Math.round(hrTimelinePctSeries[hrLen - 1] - hrTimelinePctSeries[hrLen - 2])
    : null; // percentage-point delta, not percent-of-percent change
  // NOTE: "Active High Risk Cases" below is a current point-in-time count from /dashboard/stats.
  // None of the currently-fetched endpoints return a historical time series for this specific field,
  // so no period-over-period delta is shown for it.
  const activeHighRiskCases = stats?.active_high_risk_cases || 0;

  // Registration Trends summary — aggregated client-side from the already-fetched
  // monthlyTrends data via the existing getANCChartData()/getANCChartCategories()
  // helpers (no new API calls).
  const ancChartData = getANCChartData();
  const ancChartCategories = getANCChartCategories();
  const ancNonZeroCount = ancChartData.filter(v => v > 0).length;
  // Only render the trend chart when there's more than one non-zero data point;
  // otherwise a line/area chart with a single spike is misleading/empty-looking.
  const hasMeaningfulRegistrationTrend = ancNonZeroCount > 1;
  const ancTotal = ancChartData.reduce((s, v) => s + (v || 0), 0);
  const ancAverage = ancChartData.length > 0 ? Math.round(ancTotal / ancChartData.length) : 0;
  let ancMaxIdx = -1, ancMinIdx = -1;
  ancChartData.forEach((v, i) => {
    if (ancMaxIdx === -1 || v > ancChartData[ancMaxIdx]) ancMaxIdx = i;
    if (ancMinIdx === -1 || v < ancChartData[ancMinIdx]) ancMinIdx = i;
  });
  const ancMaxLabel = ancMaxIdx >= 0 ? (ancChartCategories[ancMaxIdx] || '—') : '—';
  const ancMinLabel = ancMinIdx >= 0 ? (ancChartCategories[ancMinIdx] || '—') : '—';
  const ancMaxVal = ancMaxIdx >= 0 ? ancChartData[ancMaxIdx] : 0;
  const ancMinVal = ancMinIdx >= 0 ? ancChartData[ancMinIdx] : 0;
  const trendUnits = TREND_UNITS[ancViewFilter] || TREND_UNITS.Yearly;

  if (loading) {
    return (
      <MasterLayout>
        <div className="d-flex justify-content-center align-items-center" style={{minHeight: '400px'}}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </MasterLayout>
    );
  }

  return (
    <MasterLayout>
      <Breadcrumb title="District Dashboard" />
      <style>{KPI_CSS}</style>

      {/* ── KPI cards, grouped by topic. Each card = one headline number; the
          coloured chips underneath break it down (and link to the filtered list). ── */}
      {(() => {
        const totalPW = stats?.total_pregnant_women || 0;
        const activePW = stats?.active_pregnant_women || 0;
        const deliveredPW = Math.max(0, totalPW - activePW);
        const highRisk = stats?.high_risk_cases || 0;
        const activeHighRisk = stats?.active_high_risk_cases || 0;
        const highRiskPct = totalPW > 0 ? Math.round((highRisk / totalPW) * 100) : 0;

        const totalUsg = stats?.total_usg_appointments || 0;
        const completedUsg = stats?.completed_usg_appointments || 0;
        const activeUsg = stats?.active_usg_appointments || 0;
        const scheduledUsg = stats?.pending_usg_appointments || 0;
        const rescheduledUsg = stats?.rescheduled_usg_appointments || 0;
        const acceptedUsg = Math.max(0, activeUsg - scheduledUsg - rescheduledUsg);
        const cancelledUsg = stats?.cancelled_usg_appointments || 0;
        const usgRate = stats?.usg_completion_rate || 0;

        const totalRef = stats?.total_referrals || 0;
        const pendingRef = stats?.pending_referrals || 0;
        const acceptedRef = stats?.accepted_referrals || 0;
        const completedRef = stats?.completed_deliveries || 0;

        const go = (path) => () => navigate(path);

        return (
          <>
            {/* Pregnancies */}
            <SectionHeading icon="gridicons:multiple-users" title="Pregnancies" />
            <div className="row row-cols-xl-4 row-cols-md-2 row-cols-1 gy-3">
              <KpiCard
                label="Registered Pregnant Women"
                hint="All women registered in the district. The chips split them into pregnancies still ongoing (active) and those already delivered / closed."
                value={totalPW}
                icon="gridicons:multiple-users"
                iconBg="bg-cyan"
                onClick={go('/pregnant-women-management?tab=all')}
                subs={[
                  { label: 'active', value: activePW, tone: 'success', onClick: go('/pregnant-women-management?tab=all') },
                  { label: 'delivered', value: deliveredPW, tone: 'info', onClick: go('/pregnant-women-management?tab=delivered') },
                ]}
              />
              <KpiCard
                label="High-Risk Pregnant Women"
                hint="Registered women flagged high risk. 'Active' are those whose pregnancy is still ongoing and need monitoring now."
                value={highRisk}
                icon="material-symbols:warning"
                iconBg="bg-red"
                onClick={go('/pregnant-women-management?tab=high_risk')}
                subs={[
                  { label: 'active', value: activeHighRisk, tone: 'danger', onClick: go('/pregnant-women-management?tab=high_risk') },
                  { label: 'of registered', value: `${highRiskPct}%` },
                ]}
              />
              <KpiCard
                label="Near-EDD"
                hint="Open mobilisation cases flagged because the expected delivery date is approaching"
                value={nearEddCases.length}
                icon="material-symbols:calendar-clock-outline"
                iconBg="bg-info"
                onClick={go('/mobilisation-management')}
                note="Delivery expected soon"
              />
              <KpiCard
                label="Mobilisation Needed"
                hint="Open cases (pending + escalated) needing follow-up to bring the woman to a facility"
                value={mobilisationCount?.count || 0}
                icon="material-symbols:campaign-outline"
                iconBg="bg-purple"
                onClick={go('/mobilisation-management')}
                note="Pending + escalated follow-ups"
              />
            </div>

            {/* USG */}
            <div className="mt-24"><SectionHeading icon="material-symbols:radiology" title="USG Scans" /></div>
            <div className="row row-cols-xl-3 row-cols-md-2 row-cols-1 gy-3">
              <KpiCard
                label="USG Appointments"
                hint="All USG appointments booked in the district, whatever their status"
                value={totalUsg}
                icon="material-symbols:event-note-outline"
                iconBg="bg-cyan"
                onClick={go('/usg-appointment-management?tab=all')}
                subs={[
                  { label: 'completed', value: completedUsg, tone: 'success' },
                  { label: 'cancelled', value: cancelledUsg },
                ]}
              />
              <KpiCard
                label="Active USG Cases"
                hint="Appointments still to be done: scheduled + accepted + rescheduled. Completed and cancelled ones are not included."
                value={activeUsg}
                icon="material-symbols:pending-actions"
                iconBg="bg-warning-main"
                onClick={go('/usg-appointment-management?tab=pending')}
                subs={[
                  { label: 'scheduled', value: scheduledUsg, tone: 'warning' },
                  { label: 'accepted', value: acceptedUsg, tone: 'info' },
                  { label: 'rescheduled', value: rescheduledUsg, tone: 'danger', onClick: go('/usg-appointment-management?tab=rescheduled') },
                ]}
              />
              <KpiCard
                label="USG Completion Rate"
                hint="Completed appointments as a share of all appointments, not counting cancelled ones"
                value={`${usgRate}%`}
                icon="material-symbols:task-alt"
                iconBg="bg-success-main"
                onClick={go('/usg-appointment-management?tab=all')}
                progress={usgRate}
                note={`${completedUsg} completed of ${Math.max(0, totalUsg - cancelledUsg)} (cancelled excluded)`}
              />
            </div>

            {/* Delivery */}
            <div className="mt-24"><SectionHeading icon="material-symbols:local-shipping-outline" title="Delivery & Outcomes" /></div>
            <div className="row row-cols-xl-4 row-cols-md-2 row-cols-1 gy-3">
              <KpiCard
                label="Total Delivery Referrals"
                hint="All referrals to delivery points. The chips show where each referral currently stands."
                value={totalRef}
                icon="material-symbols:local-shipping-outline"
                iconBg="bg-cyan"
                onClick={go('/delivery-referral-management?tab=pending')}
                subs={[
                  { label: 'pending', value: pendingRef, tone: 'warning', onClick: go('/delivery-referral-management?tab=pending') },
                  { label: 'accepted', value: acceptedRef, tone: 'info', onClick: go('/delivery-referral-management?tab=accepted') },
                  { label: 'completed', value: completedRef, tone: 'success', onClick: go('/delivery-referral-management?tab=completed') },
                ]}
              />
              <KpiCard
                label="Recorded Delivery Outcomes"
                hint="Deliveries whose outcome (type, babies, mother's condition) has been recorded"
                value={stats?.total_outcomes || 0}
                icon="material-symbols:child-friendly"
                iconBg="bg-success-main"
                onClick={go('/delivery-referral-management?tab=completed')}
                note="Completed deliveries with an outcome"
              />
              <KpiCard
                label="Maternal Deaths"
                hint="Maternal deaths recorded in delivery outcomes across the district (all time)"
                value={stats?.maternal_deaths || 0}
                icon="material-symbols:emergency"
                iconBg="bg-danger"
                onClick={go('/delivery-referral-management?tab=completed&outcome=maternal_death')}
                note="Click to see the cases"
              />
              <KpiCard
                label="Infant Deaths"
                hint="Infant deaths (babies) recorded in delivery outcomes across the district (all time)"
                value={stats?.infant_deaths || 0}
                icon="material-symbols:child-care"
                iconBg="bg-danger"
                onClick={go('/delivery-referral-management?tab=completed&outcome=infant_death')}
                subs={(stats?.still_births || 0) > 0 ? [{ label: 'still births (separate)', value: stats.still_births }] : undefined}
                note={(stats?.still_births || 0) > 0 ? undefined : 'Click to see the cases'}
              />
            </div>

            {/* PMSMA */}
            <div className="mt-24"><SectionHeading icon="material-symbols:event-available" title="PMSMA" /></div>
            <div className="row row-cols-xl-4 row-cols-md-2 row-cols-1 gy-3">
              <KpiCard
                label="Total PMSMA Appointments"
                hint="Total PMSMA appointments/sessions scheduled"
                value={pmsmaSummary?.total_appointments || 0}
                icon="material-symbols:event-available"
                iconBg="bg-cyan"
                onClick={go('/pmsma-sessions')}
              />
              <KpiCard
                label="Pending PMSMA"
                hint="Scheduled PMSMA sessions still pending completion"
                value={pmsmaSummary?.pending || 0}
                icon="material-symbols:pending-actions"
                iconBg="bg-warning-main"
                onClick={go('/pmsma-sessions?tab=queue')}
              />
              <KpiCard
                label="Completed PMSMA Sessions"
                hint="PMSMA sessions completed"
                value={pmsmaSummary?.completed || 0}
                icon="material-symbols:check-circle"
                iconBg="bg-success-main"
                onClick={go('/pmsma-sessions?tab=completed')}
              />
              <KpiCard
                label="Rescheduled PMSMA"
                hint="PMSMA appointments rescheduled"
                value={pmsmaSummary?.rescheduled || 0}
                icon="material-symbols:event-repeat"
                iconBg="bg-purple"
                onClick={go('/pmsma-sessions?tab=queue')}
              />
            </div>
          </>
        );
      })()}

      {/* ── Detailed analytics filters (Block/Sub-Centre/Ward/period/etc.) —
          apply to every monitoring section below (ANC through Needs Attention). ── */}
      <div className="d-flex align-items-center gap-2 mt-24 mb-16">
        <Icon icon="mdi:filter-variant" className="text-primary text-2xl" />
        <h6 className="text-lg fw-semibold mb-0">Detailed Analytics Filters</h6>
      </div>
      <AnalyticsControls aa={aa} />

      {/* ── 3. ANC Monitoring ─────────────────────────────────────────── */}
      <AncMonitoringSection aa={aa} />

      {/* ── 4. USG Monitoring ─────────────────────────────────────────── */}
      <UsgMonitoringSection aa={aa} />

      {/* ── 5. PMSMA Monitoring ───────────────────────────────────────── */}
      <PmsmaMonitoringSection aa={aa} />

      {/* ── 6. Delivery Monitoring ────────────────────────────────────── */}
      <DeliveryMonitoringSection aa={aa} />

      {/* ── 7. Geography — Block-wise Performance chart (this page's own
          monthly-trend view, with a block picker) + Geography — Blocks
          table (per-block snapshot for the filtered period, from the
          analytics hook). ── */}
      <div className="d-flex align-items-center gap-2 mt-24 mb-16">
        <Icon icon="mdi:map-marker-radius-outline" className="text-primary text-2xl" />
        <h6 className="text-lg fw-semibold mb-0">Geography</h6>
      </div>
      <section className="row gy-4 mt-1">
        <div className="col-12">
          <div className="card shadow-sm border-0" style={{ borderLeft: '4px solid #487FFF' }}>
            <div className="card-header border-bottom bg-base py-16 px-24 d-flex flex-wrap align-items-center justify-content-between">
              <div>
                <h6 className="text-lg fw-semibold mb-0">
                  {selectedBlock === 'all'
                    ? 'Block-wise Performance'
                    : `${blockWiseTrends?.blocks?.find(b => b.block_id === parseInt(selectedBlock))?.block_name || ''} — Monthly Trend`
                  }
                </h6>
                <p className="text-xs text-secondary-light mb-0 mt-4">Total registrations and USG appointments by block</p>
              </div>
              <select
                className="form-select bg-base form-select-sm w-auto"
                value={selectedBlock}
                onChange={(e) => setSelectedBlock(e.target.value)}
              >
                <option value="all">All Blocks</option>
                {blockWiseTrends?.blocks?.map(b => (
                  <option key={b.block_id} value={b.block_id}>{b.block_name}</option>
                ))}
              </select>
            </div>
            <div className="card-body p-24">
              <div className="row gy-3 mb-3">
                <MiniStat label="Total PW Registrations" value={blockWiseTotalRegistrations} />
                <MiniStat label="Total USG Appointments" value={blockWiseTotalUSG} />
                <MiniStat label="Blocks Covered" value={blocksCovered} />
              </div>
              {blockWisePerformanceChart ? (
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: blockWiseChartMinWidth }}>
                    <ReactApexChart
                      {...blockWisePerformanceChart}
                      type={selectedBlock === 'all' ? 'bar' : 'line'}
                      height={300}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-5 text-secondary-light">No data available</div>
              )}
            </div>
          </div>
        </div>
      </section>
      <div className="mt-24">
        <GeographyBlocksSection aa={aa} />
      </div>

      {/* ── 8. Advanced Analytics: Age Distribution & Risk Factors,
          Registration Trends, High-Risk Timeline/Trend, Weekly Trends. ── */}
      <div className="d-flex align-items-center gap-2 mt-24 mb-16">
        <Icon icon="mdi:chart-box-outline" className="text-primary text-2xl" />
        <h6 className="text-lg fw-semibold mb-0">Advanced Analytics</h6>
      </div>

      <AgeRiskSection aa={aa} />

      <section className="row gy-4 mt-1">
        <div className="col-xxl-8">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex flex-wrap align-items-center justify-content-between">
                <h6 className="text-lg mb-0">Registration Trends</h6>
                <select className="form-select bg-base form-select-sm w-auto" value={ancViewFilter} onChange={(e) => setAncViewFilter(e.target.value)}>
                  <option value="Yearly">Yearly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Today">Today</option>
                </select>
              </div>
              <div className="row gy-3 mt-1">
                <MiniStat label="Total Registrations" value={ancTotal} />
                <MiniStat label={trendUnits.avg} value={ancAverage} />
                <MiniStat label={trendUnits.high} value={`${ancMaxVal} (${ancMaxLabel})`} />
                <MiniStat label={trendUnits.low} value={`${ancMinVal} (${ancMinLabel})`} />
              </div>
              {hasMeaningfulRegistrationTrend ? (
                <ReactApexChart {...monthlyTrendsChart} type="area" height={264} />
              ) : (
                <div className="text-center py-5 text-secondary-light">
                  Not enough data points in the selected period to plot a trend — showing summary only.
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-xxl-4">
          <div className="card h-100">
            <div className="card-header border-bottom bg-base py-16 px-24">
              <h6 className="text-lg fw-semibold mb-0">Risk Category Distribution</h6>
            </div>
            <div className="card-body p-24">
              <ReactApexChart {...riskDistributionChart} type="donut" height={300} />
            </div>
          </div>
        </div>
      </section>

      {/* High Risk Timeline */}
      <section className="row gy-4 mt-1">
        <div className="col-12">
          <div className="card h-100 shadow-sm border-0" style={{ borderLeft: '4px solid #F97316' }}>
            <div className="card-header border-bottom bg-base py-16 px-24">
              <h6 className="text-lg fw-semibold mb-0">High Risk Timeline (Last 6 Months)</h6>
            </div>
            <div className="card-body p-24">
              <div className="row gy-3 mb-3">
                <MiniStat
                  label="Total Cases (Last 6 Months)"
                  value={hrTimelineTotalCasesSum}
                  delta={hrTimelineTotalCasesDelta}
                />
                <MiniStat
                  label="High Risk Cases (Last 6 Months)"
                  value={hrTimelineHighRiskSum}
                  delta={hrTimelineHighRiskDelta}
                  deltaGood="down"
                />
                <MiniStat
                  label="Average High Risk %"
                  value={`${hrTimelineAvgPct}%`}
                  delta={hrTimelineAvgPctDelta}
                  deltaSuffix=" pts"
                  deltaGood="down"
                />
                <MiniStat
                  label="Active High Risk Cases"
                  value={activeHighRiskCases}
                  hint="As of today"
                />
              </div>
              {highRiskTimelineChart ? (
                <ReactApexChart {...highRiskTimelineChart} type="area" height={300} />
              ) : (
                <div className="text-center py-5 text-secondary-light">No data available</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-24">
        <WeeklyTrendsSection aa={aa} />
      </div>

      {/* ── 9. Needs Attention — always last. ─────────────────────────── */}
      <NeedsAttentionSection aa={aa} />
    </MasterLayout>
  );
};

export default DashboardDistrictPage;