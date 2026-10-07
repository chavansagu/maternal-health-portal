import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import '../../styles/analytics-filters.css';

/**
 * Shared filter bar for the District "Advanced Analytics" dashboard section.
 *
 * Prop/callback contract is unchanged from the previous version so no parent
 * needed to be touched:
 *   - `options`  : the /filter-options payload (blocks, sub_centres, wards,
 *                  delivery_points, blood_groups, risk_factors, age_bands).
 *   - `onApply`  : fires with the full filters object when the user clicks
 *                  "Apply filters" (or removes a chip / clicks Reset).
 *   - `initial`  : optional starting filter values.
 *   - `compact`  : when true, the whole panel starts collapsed.
 *
 * The filter *keys* on the object passed to onApply are unchanged too
 * (startDate, endDate, blockId, subCentreId, wardId, risk, ageBand,
 * trimester, parity, bloodGroup, registrationSource, caseStatus, riskFactor,
 * anaemic, hasAnc, approval) — see `buildFilterParams` in services/api.js,
 * which is what actually turns these into the /demographics /care /delivery
 * /geography /summary /trends /watchlist query strings.
 *
 * New UI-only keys added for this redesign — periodPreset, facilityId,
 * programType, usgStatus, pmsmaStatus — are included in the object passed to
 * onApply for forward-compatibility, but `buildFilterParams` doesn't know
 * about them yet, so they currently have no effect on what's fetched. They're
 * safe to leave in: unknown keys are silently ignored by buildFilterParams.
 * Wiring them up is a backend change (new /filter-options query params and
 * new PWFilters fields), out of scope here.
 */
const DEFAULTS = {
  // Time period
  startDate: '', endDate: '', periodPreset: '',
  // Location (cascading)
  blockId: '', subCentreId: '', wardId: '', facilityId: '',
  // Mother details
  ageBand: [], parity: [], trimester: [],
  // Programme & status
  risk: 'all', programType: '', caseStatus: 'all', usgStatus: '', pmsmaStatus: '',
  // Risk & health details (More Filters)
  anaemic: '', riskFactor: [], bloodGroup: '',
  registrationSource: '', approval: '', hasAnc: '',
};

const PARITY_OPTS = [
  { value: 'primi', label: 'First pregnancy' },
  { value: 'multi', label: '2nd–3rd pregnancy' },
  { value: 'grand', label: '4th or more' },
  { value: 'unknown', label: 'Not recorded' },
];
const TRIMESTER_OPTS = [
  { value: '1', label: '1st trimester' },
  { value: '2', label: '2nd trimester' },
  { value: '3', label: '3rd trimester' },
  { value: 'unknown', label: 'Not recorded' },
];
const RISK_OPTS = [
  { value: 'all', label: 'All' },
  { value: 'high', label: 'High Risk' },
  { value: 'normal', label: 'Normal Risk' },
];
const PROGRAM_TYPE_OPTS = [
  { value: '', label: 'All Programs' },
  { value: 'anc', label: 'ANC' },
  { value: 'usg', label: 'USG' },
  { value: 'pmsma', label: 'PMSMA' },
  { value: 'delivery', label: 'Delivery' },
];
// Backend `case_status` currently only recognizes all/active/delivered/inactive
// (see VALID_CASE_STATUS in analytics_filters.py) — mapped here to the plain
// names the task asked for. "Pending" is included per spec for forward
// compatibility; until the backend adds it, it's silently normalized to "all".
const CASE_STATUS_OPTS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'delivered', label: 'Completed' },
  { value: 'inactive', label: 'Closed' },
  { value: 'pending', label: 'Pending' },
];
const USG_STATUS_OPTS = [
  { value: '', label: 'Any' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'completed', label: 'Completed' },
  { value: 'rescheduled', label: 'Rescheduled' },
  { value: 'overdue', label: 'Overdue' },
];
const PMSMA_STATUS_OPTS = [
  { value: '', label: 'Any' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'rescheduled', label: 'Rescheduled' },
];
const QUICK_PERIODS = [
  { key: '7d', label: 'Last 7 Days', days: 7 },
  { key: '30d', label: 'Last 30 Days', days: 30 },
  { key: '3m', label: 'Last 3 Months', months: 3 },
  { key: '6m', label: 'Last 6 Months', months: 6 },
  { key: 'ytd', label: 'This Year', special: 'ytd' },
  { key: 'custom', label: 'Custom Range', special: 'custom' },
];

const toISO = (d) => d.toISOString().slice(0, 10);

const optionLabel = (list, id) => (list || []).find(o => String(o.id) === String(id))?.name;
const staticLabel = (opts, v) => opts.find(o => o.value === v)?.label || v;

// ── Presentational building blocks (UI only — no filter logic lives here) ──

// One tinted row: icon badge + title/hint on the left, fields on the right.
const Row = ({ tone, icon, title, hint, children }) => (
  <div className={`af-row af-${tone}`}>
    <div className="af-row-head">
      <span className="af-badge"><Icon icon={icon} /></span>
      <div>
        <div className="af-row-title">{title}</div>
        <div className="af-row-hint">{hint}</div>
      </div>
    </div>
    <div className="af-row-body">{children}</div>
  </div>
);

// Single-select: native <select> (keeps keyboard/mobile behaviour) dressed up with icons.
const SelectField = ({ label, icon, value, onChange, disabled, children }) => (
  <div>
    <span className="af-label">{label}</span>
    <div className="af-select">
      <Icon icon={icon} className="af-select-icon" />
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}>{children}</select>
      <Icon icon="mdi:chevron-down" className="af-select-caret" />
    </div>
  </div>
);

// Multi-select dropdown with checkboxes — used for Age Group / Parity / Trimester.
const MultiSelectField = ({ label, icon, allLabel, options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const toggle = (v) => onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  const picked = options.filter(o => value.includes(o.value));
  const text = picked.length === 0 ? allLabel : picked.length === 1 ? picked[0].label : `${picked.length} selected`;

  return (
    <div className="af-multi" ref={ref}>
      <span className="af-label">{label}</span>
      <div style={{ position: 'relative' }}>
        <button type="button" className={`af-trigger ${open ? 'is-open' : ''}`} onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open}>
          <Icon icon={icon} className="af-trigger-icon" />
          <span className="af-trigger-text">{text}</span>
          <Icon icon="mdi:chevron-down" className="af-select-caret" />
        </button>
        {open && (
          <div className="af-menu" role="listbox">
            {options.length === 0 && <div className="af-option" style={{ cursor: 'default' }}>No options</div>}
            {options.map(o => (
              <label className="af-option" key={o.value}>
                <input type="checkbox" checked={value.includes(o.value)} onChange={() => toggle(o.value)} />
                {o.label}
              </label>
            ))}
            {value.length > 0 && <button type="button" className="af-menu-clear" onClick={() => onChange([])}>Clear selection</button>}
          </div>
        )}
      </div>
    </div>
  );
};

// Checkbox pills — used for Risk Factors and Blood Group.
const PillGroup = ({ options, value, onChange, idPrefix, limit }) => {
  const [showAll, setShowAll] = useState(false);
  const toggle = (v) => onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  if (options.length === 0) return <span className="af-empty">No data yet</span>;
  const visible = limit && !showAll ? options.slice(0, limit) : options;
  return (
    <div className="af-pills">
      {visible.map(o => {
        const on = value.includes(o.value);
        return (
          <label className={`af-pill ${on ? 'is-on' : ''}`} key={o.value} htmlFor={`${idPrefix}-${o.value}`}>
            <input type="checkbox" id={`${idPrefix}-${o.value}`} checked={on} onChange={() => toggle(o.value)} />
            {o.label}{o.count != null && <small>({o.count})</small>}
          </label>
        );
      })}
      {limit && options.length > limit && (
        <button type="button" className="af-more-link" onClick={() => setShowAll(s => !s)}>
          {showAll ? 'Show less' : `+${options.length - limit} more`}
        </button>
      )}
    </div>
  );
};

const AnalyticsFilterBar = ({ options, onApply, initial = {}, compact = false }) => {
  const merged = { ...DEFAULTS, ...initial };
  const [f, setF] = useState(merged);       // draft filters (being edited)
  const [applied, setApplied] = useState(merged); // last filters actually sent via onApply — drives the chip row
  const [panelOpen, setPanelOpen] = useState(!compact);
  const [moreOpen, setMoreOpen] = useState(false); // "More Filters" — collapsed by default

  const blocks = options?.blocks || [];
  const subCentres = (options?.sub_centres || []).filter(s => !f.blockId || String(s.block_id) === String(f.blockId));
  const wards = (options?.wards || []).filter(w => !f.blockId || String(w.block_id) === String(f.blockId));
  // Facilities (CHC/UPHC): /filter-options doesn't currently return a
  // block/sub-centre link for delivery points, so this level of the cascade
  // can't be narrowed client-side yet — it lists every facility in the
  // district. Once the backend includes block_id on delivery_points this can
  // filter the same way subCentres/wards do above.
  const facilities = options?.delivery_points || [];
  const ageBands = options?.age_bands || [];
  const bloodGroups = options?.blood_groups || [];
  const riskFactors = options?.risk_factors || [];
  const bloodGroupValue = Array.isArray(f.bloodGroup) ? f.bloodGroup : [];

  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  const setBlock = (v) => setF(prev => ({ ...prev, blockId: v, subCentreId: '', wardId: '', facilityId: '' }));
  const setSubCentre = (v) => setF(prev => ({ ...prev, subCentreId: v, wardId: '', facilityId: '' }));
  const setWard = (v) => setF(prev => ({ ...prev, wardId: v, facilityId: '' }));
  // Typing/picking a date by hand means the range is now custom.
  const setDate = (k, v) => setF(prev => ({ ...prev, [k]: v, periodPreset: 'custom' }));

  const applyPreset = (preset) => {
    if (preset.special === 'custom') {
      setF(prev => ({ ...prev, periodPreset: 'custom' }));
      return;
    }
    const today = new Date();
    let start;
    if (preset.days) {
      start = new Date(today);
      start.setDate(start.getDate() - (preset.days - 1));
    } else if (preset.months) {
      start = new Date(today);
      start.setMonth(start.getMonth() - preset.months);
    } else if (preset.special === 'ytd') {
      start = new Date(today.getFullYear(), 0, 1);
    }
    setF(prev => ({ ...prev, periodPreset: preset.key, startDate: toISO(start), endDate: toISO(today) }));
  };

  const apply = () => { setApplied(f); onApply(f); };
  const reset = () => { setF(DEFAULTS); setApplied(DEFAULTS); onApply(DEFAULTS); };

  // Chips reflect the filters that were actually applied (not the in-progress draft).
  const chips = [];
  const push = (key, label) => chips.push({ key, label });
  if (applied.startDate || applied.endDate) push('__period', `Period: ${applied.startDate || '…'} → ${applied.endDate || '…'}`);
  if (applied.blockId) push('blockId', `Block: ${optionLabel(blocks, applied.blockId) || applied.blockId}`);
  if (applied.subCentreId) push('subCentreId', `Sub-centre: ${optionLabel(subCentres, applied.subCentreId) || applied.subCentreId}`);
  if (applied.wardId) push('wardId', `Ward: ${optionLabel(wards, applied.wardId) || applied.wardId}`);
  if (applied.facilityId) push('facilityId', `Facility: ${optionLabel(facilities, applied.facilityId) || applied.facilityId}`);
  if (applied.ageBand?.length) push('ageBand', `Age group: ${applied.ageBand.map(v => (ageBands.find(a => a.key === v)?.label || v)).join(', ')}`);
  if (applied.parity?.length) push('parity', `Parity: ${applied.parity.map(v => staticLabel(PARITY_OPTS, v)).join(', ')}`);
  if (applied.trimester?.length) push('trimester', `Trimester: ${applied.trimester.map(v => staticLabel(TRIMESTER_OPTS, v)).join(', ')}`);
  if (applied.risk && applied.risk !== 'all') push('risk', `Risk: ${staticLabel(RISK_OPTS, applied.risk)}`);
  if (applied.programType) push('programType', `Program: ${staticLabel(PROGRAM_TYPE_OPTS, applied.programType)}`);
  if (applied.caseStatus && applied.caseStatus !== 'all') push('caseStatus', `Status: ${staticLabel(CASE_STATUS_OPTS, applied.caseStatus)}`);
  if (applied.usgStatus) push('usgStatus', `USG: ${staticLabel(USG_STATUS_OPTS, applied.usgStatus)}`);
  if (applied.pmsmaStatus) push('pmsmaStatus', `PMSMA: ${staticLabel(PMSMA_STATUS_OPTS, applied.pmsmaStatus)}`);
  if (applied.anaemic) push('anaemic', `Anaemia: ${applied.anaemic === 'true' ? 'Anaemic (Hb < 11)' : 'Normal Hb'}`);
  if (applied.riskFactor?.length) push('riskFactor', `Risk factors: ${applied.riskFactor.length} selected`);
  if (applied.bloodGroup?.length) push('bloodGroup', `Blood group: ${applied.bloodGroup.join(', ')}`);
  if (applied.registrationSource) push('registrationSource', `Source: ${applied.registrationSource === 'self' ? 'Self-registered' : 'By staff'}`);
  if (applied.approval) push('approval', `Approval: ${applied.approval === 'approved' ? 'Approved' : 'Pending'}`);
  if (applied.hasAnc) push('hasAnc', `ANC contact: ${applied.hasAnc === 'true' ? 'Has ANC visit' : 'No ANC visit'}`);

  // Removing a chip clears just that filter and re-applies immediately.
  const removeFilter = (key) => {
    let next;
    if (key === '__period') {
      next = { ...applied, startDate: '', endDate: '', periodPreset: '' };
    } else {
      const current = applied[key];
      const cleared = Array.isArray(current) ? [] : (key === 'risk' || key === 'caseStatus') ? 'all' : '';
      next = { ...applied, [key]: cleared };
    }
    setApplied(next);
    setF(next);
    onApply(next);
  };

  return (
    <div className="af-card">
      {/* ── Header: title on the left, Reset / Apply on the right ── */}
      <div className="af-header">
        <div className="af-title-wrap">
          <span className="af-title-icon"><Icon icon="mdi:chart-box-outline" /></span>
          <div>
            <h5 className="af-title">
              Advanced Analytics
              {chips.length > 0 && <span className="af-count">{chips.length} filter{chips.length > 1 ? 's' : ''} applied</span>}
            </h5>
            <p className="af-subtitle">View detailed reports and insights with simple filters</p>
          </div>
        </div>
        <div className="af-actions">
          <button type="button" className="af-btn af-btn-ghost" onClick={reset}>
            <Icon icon="mdi:refresh" className="text-lg" />Reset
          </button>
          <button type="button" className="af-btn af-btn-primary" onClick={apply}>
            <Icon icon="mdi:magnify" className="text-lg" />Apply Filters
          </button>
          <button
            type="button"
            className="af-btn af-btn-ghost af-btn-icon"
            onClick={() => setPanelOpen(o => !o)}
            aria-label={panelOpen ? 'Collapse filters' : 'Expand filters'}
            title={panelOpen ? 'Collapse filters' : 'Expand filters'}
          >
            <Icon icon={panelOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'} className="text-xl" />
          </button>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="af-chips">
          {chips.map(c => (
            <span key={c.key} className="af-chip">
              {c.label}
              <button type="button" aria-label={`Remove ${c.label}`} onClick={() => removeFilter(c.key)}>
                <Icon icon="mdi:close" />
              </button>
            </span>
          ))}
        </div>
      )}

      {panelOpen && (
        <div className="af-rows">

          {/* ── Time period ── */}
          <Row tone="blue" icon="mdi:calendar-month-outline" title="Time Period" hint="Select the date range for your report">
            <div className="af-time">
              <div className="af-presets">
                {QUICK_PERIODS.map(p => (
                  <button
                    key={p.key}
                    type="button"
                    className={`af-preset ${f.periodPreset === p.key ? 'is-active' : ''}`}
                    onClick={() => applyPreset(p)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="af-date">
                <Icon icon="mdi:calendar-blank-outline" className="af-date-icon" />
                <input type="date" aria-label="Start date" value={f.startDate} max={f.endDate || undefined} onChange={e => setDate('startDate', e.target.value)} />
                <span className="af-dash">–</span>
                <input type="date" aria-label="End date" value={f.endDate} min={f.startDate || undefined} onChange={e => setDate('endDate', e.target.value)} />
              </div>
            </div>
          </Row>

          {/* ── Location ── */}
          <Row tone="green" icon="mdi:map-marker-outline" title="Location" hint="Select the area to view data">
            <div className="af-grid af-cols-4">
              <SelectField label="Block" icon="mdi:view-grid-outline" value={f.blockId} onChange={setBlock}>
                <option value="">All Blocks</option>
                {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </SelectField>
              <SelectField label="Sub-centre" icon="mdi:home-outline" value={f.subCentreId} onChange={setSubCentre} disabled={subCentres.length === 0}>
                <option value="">All Sub-centres</option>
                {subCentres.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </SelectField>
              <SelectField label="Village / Ward" icon="mdi:map-marker-radius-outline" value={f.wardId} onChange={setWard} disabled={wards.length === 0}>
                <option value="">All Villages / Wards</option>
                {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </SelectField>
              <SelectField label="CHC / UPHC" icon="mdi:hospital-box-outline" value={f.facilityId} onChange={v => set('facilityId', v)} disabled={facilities.length === 0}>
                <option value="">All CHC / UPHC</option>
                {facilities.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </SelectField>
            </div>
          </Row>

          {/* ── Mother details ── */}
          <Row tone="purple" icon="mdi:human-pregnant" title="Mother Details" hint="Select mother details (optional)">
            <div className="af-grid af-cols-4">
              <MultiSelectField
                label="Age Group" icon="mdi:human-female" allLabel="All Ages"
                options={ageBands.map(a => ({ value: a.key ?? a.value, label: a.label ?? a.name }))}
                value={f.ageBand} onChange={v => set('ageBand', v)}
              />
              <MultiSelectField label="Parity" icon="mdi:account-multiple-outline" allLabel="All" options={PARITY_OPTS} value={f.parity} onChange={v => set('parity', v)} />
              <MultiSelectField label="Trimester" icon="mdi:calendar-heart-outline" allLabel="All" options={TRIMESTER_OPTS} value={f.trimester} onChange={v => set('trimester', v)} />
            </div>
          </Row>

          {/* ── Programme & status ── */}
          <Row tone="teal" icon="mdi:file-document-outline" title="Program & Status" hint="Select program, service type and status">
            <div className="af-grid af-cols-4">
              <SelectField label="Program / Service Type" icon="mdi:cog-outline" value={f.programType} onChange={v => set('programType', v)}>
                {PROGRAM_TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.value === '' ? 'All Programs' : o.label}</option>)}
              </SelectField>
              <SelectField label="Case Status" icon="mdi:clipboard-text-outline" value={f.caseStatus} onChange={v => set('caseStatus', v)}>
                {CASE_STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.value === 'all' ? 'All Status' : o.label}</option>)}
              </SelectField>
              <SelectField label="USG Status" icon="mdi:image-outline" value={f.usgStatus} onChange={v => set('usgStatus', v)}>
                {USG_STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.value === '' ? 'All Status' : o.label}</option>)}
              </SelectField>
              <SelectField label="PMSMA Status" icon="mdi:calendar-check-outline" value={f.pmsmaStatus} onChange={v => set('pmsmaStatus', v)}>
                {PMSMA_STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.value === '' ? 'All Status' : o.label}</option>)}
              </SelectField>
            </div>
          </Row>

          {/* ── Risk & health ── */}
          <Row tone="red" icon="mdi:alert-outline" title="Risk & Health Details" hint="Filter by risk factors (optional)">
            <div className="af-grid af-cols-risk">
              <SelectField label="Risk Category" icon="mdi:alert-outline" value={f.risk} onChange={v => set('risk', v)}>
                {RISK_OPTS.map(o => <option key={o.value} value={o.value}>{o.value === 'all' ? 'All Risk Categories' : o.label}</option>)}
              </SelectField>
              <SelectField label="Anaemia (Latest Hb)" icon="mdi:water-outline" value={f.anaemic} onChange={v => set('anaemic', v)}>
                <option value="">All</option>
                <option value="true">Anaemic (Hb &lt; 11)</option>
                <option value="false">Normal Hb</option>
              </SelectField>
              <div>
                <span className="af-label">Risk Factors</span>
                <PillGroup
                  idPrefix="rf" limit={6}
                  options={riskFactors.slice(0, 20).map(r => ({ value: r.name, label: r.name, count: r.count }))}
                  value={f.riskFactor} onChange={v => set('riskFactor', v)}
                />
              </div>
            </div>
          </Row>

          {/* ── More filters (collapsed by default) ── */}
          <div className="af-toggle-row">
            <button type="button" className="af-toggle" onClick={() => setMoreOpen(o => !o)}>
              <Icon icon={moreOpen ? 'mdi:chevron-up' : 'mdi:tune-variant'} />
              {moreOpen ? 'Hide more filters' : 'More filters'}
            </button>
          </div>

          {moreOpen && (
            <Row tone="slate" icon="mdi:tune-variant" title="More Filters" hint="Blood group, source, approval & ANC contact">
              <div className="af-grid af-cols-4">
                <SelectField label="Registration Source" icon="mdi:account-plus-outline" value={f.registrationSource} onChange={v => set('registrationSource', v)}>
                  <option value="">Any</option>
                  <option value="self">Self-registered</option>
                  <option value="staff">Registered by staff</option>
                </SelectField>
                <SelectField label="Approval" icon="mdi:check-decagram-outline" value={f.approval} onChange={v => set('approval', v)}>
                  <option value="">Any</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending approval</option>
                </SelectField>
                <SelectField label="ANC Contact" icon="mdi:stethoscope" value={f.hasAnc} onChange={v => set('hasAnc', v)}>
                  <option value="">Any</option>
                  <option value="true">Has had an ANC visit</option>
                  <option value="false">No ANC visit yet</option>
                </SelectField>
                <div>
                  <span className="af-label">Blood Group</span>
                  <PillGroup
                    idPrefix="bg"
                    options={bloodGroups.map(g => ({ value: g, label: g }))}
                    value={bloodGroupValue} onChange={v => set('bloodGroup', v)}
                  />
                </div>
              </div>
            </Row>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalyticsFilterBar;