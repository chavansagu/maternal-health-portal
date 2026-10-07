import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react/dist/iconify.js';
import '../../styles/list-controls.css';

/**
 * Shared controls for every list / management screen.
 *
 * Layout convention (same on every screen):
 *
 *   [ Tabs ........................................................ ]   <- <ListTabs>
 *   [ Show [10] entries ] [ Search ] [ filters ]     [ Refresh ] [ Bulk ] [ + Add ]
 *   ------------------------------- table -------------------------------------
 *   Showing 1 to 10 of 42 entries                       « ‹ 1 2 3 › »       <- <TableFooter>
 */

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/* ---- Tabs ---------------------------------------------------------------- */
export const ListTabs = ({ children }) => (
  <div className="lc-tabs">
    <ul className="nav border-gradient-tab nav-pills" role="tablist">
      {children}
    </ul>
  </div>
);

export const ListTab = ({ active, onClick, children }) => (
  <li className="nav-item" role="presentation">
    <button
      type="button"
      role="tab"
      aria-selected={!!active}
      className={`nav-link ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  </li>
);

/* ---- Toolbar layout ------------------------------------------------------ */
/** `asHeader` renders it as a card-header (border + base background). */
export const ListToolbar = ({ children, asHeader = false }) => (
  <div className={`lc-toolbar ${asHeader ? 'card-header border-bottom bg-base' : ''}`}>
    {children}
  </div>
);

export const ToolbarLeft = ({ children }) => <div className="lc-toolbar__left">{children}</div>;
export const ToolbarRight = ({ children }) => <div className="lc-toolbar__right">{children}</div>;

/* ---- Entries dropdown ---------------------------------------------------- */
export const EntriesSelect = ({ value, onChange, options = PAGE_SIZE_OPTIONS }) => (
  <label className="lc-entries mb-0">
    <span>Show</span>
    <select
      className="form-select bg-base"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label="Entries per page"
    >
      {options.map((n) => (
        <option key={n} value={n}>{n}</option>
      ))}
    </select>
    <span>entries</span>
  </label>
);

/* ---- Search -------------------------------------------------------------- */
export const SearchBox = ({ value, onChange, placeholder = 'Search...', title }) => (
  <div className="lc-search">
    <Icon icon="ion:search-outline" className="lc-search__icon" />
    <input
      type="text"
      className="form-control bg-base"
      placeholder={placeholder}
      title={title}
      aria-label={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    {value ? (
      <button
        type="button"
        className="lc-search__clear"
        onClick={() => onChange('')}
        title="Clear search"
        aria-label="Clear search"
      >
        <Icon icon="material-symbols:close" />
      </button>
    ) : null}
  </div>
);

/* ---- Filter dropdown ----------------------------------------------------- */
export const FilterSelect = ({ value, onChange, ariaLabel, children }) => (
  <select
    className="form-select lc-select bg-base"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    aria-label={ariaLabel}
  >
    {children}
  </select>
);

/* ---- Buttons ------------------------------------------------------------- */
const VARIANT_CLASS = {
  primary: 'btn-primary',
  outline: 'btn-outline-primary',
  secondary: 'btn-outline-secondary',
};

/** Pass `to` to render a router link instead of a button. */
export const ToolbarButton = ({
  icon,
  variant = 'primary',
  onClick,
  to,
  disabled,
  title,
  children,
}) => {
  const cls = `btn ${VARIANT_CLASS[variant] || VARIANT_CLASS.primary} lc-btn`;
  const content = (
    <>
      {icon ? <Icon icon={icon} className="lc-btn__icon" /> : null}
      {children}
    </>
  );
  if (to) {
    return <Link to={to} className={cls} title={title}>{content}</Link>;
  }
  return (
    <button type="button" className={cls} onClick={onClick} disabled={disabled} title={title}>
      {content}
    </button>
  );
};

export const AddButton = (props) => (
  <ToolbarButton icon="ic:baseline-plus" variant="primary" {...props} />
);
export const BulkUploadButton = (props) => (
  <ToolbarButton icon="material-symbols:upload" variant="outline" {...props}>
    {props.children || 'Bulk Upload'}
  </ToolbarButton>
);
export const RefreshButton = (props) => (
  <ToolbarButton icon="mdi:refresh" variant="outline" {...props}>
    {props.children || 'Refresh'}
  </ToolbarButton>
);

/* ---- Pagination ---------------------------------------------------------- */
export const getVisiblePages = (currentPage, totalPages, delta = 2) => {
  const range = [];
  for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
    range.push(i);
  }
  const out = [];
  if (currentPage - delta > 2) out.push(1, '...');
  else out.push(1);
  out.push(...range);
  if (currentPage + delta < totalPages - 1) out.push('...', totalPages);
  else if (totalPages > 1) out.push(totalPages);
  return out.filter((item, idx, arr) => item === '...' || arr.indexOf(item) === idx);
};

const PAGE_BTN_IDLE = 'bg-neutral-200 text-secondary-light';
const PAGE_BTN_ACTIVE = 'bg-primary-600 text-white';

export const Pager = ({ page, totalPages, onPageChange }) => {
  const pages = Math.max(totalPages, 1);
  const go = (p) => onPageChange(Math.min(Math.max(p, 1), pages));
  return (
    <ul className="pagination lc-pager">
      <li className="page-item">
        <button type="button" className={`page-link ${PAGE_BTN_IDLE}`} onClick={() => go(1)} disabled={page <= 1} title="First page" aria-label="First page">
          <Icon icon="ep:d-arrow-left" />
        </button>
      </li>
      <li className="page-item">
        <button type="button" className={`page-link ${PAGE_BTN_IDLE}`} onClick={() => go(page - 1)} disabled={page <= 1} title="Previous page" aria-label="Previous page">
          <Icon icon="ep:arrow-left" />
        </button>
      </li>
      {getVisiblePages(page, pages).map((p, i) =>
        p === '...' ? (
          <li key={`e-${i}`} className="page-item">
            <span className="page-link lc-pager__ellipsis text-secondary-light">...</span>
          </li>
        ) : (
          <li key={p} className="page-item">
            <button
              type="button"
              className={`page-link ${p === page ? PAGE_BTN_ACTIVE : PAGE_BTN_IDLE}`}
              onClick={() => go(p)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          </li>
        )
      )}
      <li className="page-item">
        <button type="button" className={`page-link ${PAGE_BTN_IDLE}`} onClick={() => go(page + 1)} disabled={page >= pages} title="Next page" aria-label="Next page">
          <Icon icon="ep:arrow-right" />
        </button>
      </li>
      <li className="page-item">
        <button type="button" className={`page-link ${PAGE_BTN_IDLE}`} onClick={() => go(pages)} disabled={page >= pages} title="Last page" aria-label="Last page">
          <Icon icon="ep:d-arrow-right" />
        </button>
      </li>
    </ul>
  );
};

/**
 * Footer used under every table: "Showing x to y of z entries" + pager.
 * `total` is the count after search/filters; `unfilteredTotal` (optional)
 * adds "(filtered from N total entries)".
 */
export const TableFooter = ({ total, page, pageSize, onPageChange, unfilteredTotal }) => {
  if (!total) return null;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const filtered = unfilteredTotal !== undefined && unfilteredTotal !== total;
  return (
    <div className="lc-footer">
      <span className="lc-footer__summary">
        Showing {start} to {end} of {total} entries
        {filtered ? ` (filtered from ${unfilteredTotal} total entries)` : ''}
      </span>
      <Pager page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
};
