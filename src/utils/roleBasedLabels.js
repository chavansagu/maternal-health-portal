/**
 * Role-Based Label Configuration
 * 
 * Purpose: Provide consistent terminology across the application based on user role
 * 
 * Administrative Hierarchy:
 * - District → manages Blocks
 * - Block → manages Villages (referred to as "Ward" in some contexts)
 * - Sub-Centre → serves Villages/Wards
 * 
 * Terminology Mapping:
 * - District users: See "Block" and "Ward" terminology
 * - Block users: See "Village" terminology (not "Ward")
 * - Sub-Centre users: See "Village" terminology
 * - USG Centre users: See "Village" terminology
 */

const ROLE_LABELS = {
  district: {
    // District users manage blocks and see ward-level data
    administrativeUnit: 'Ward',
    administrativeUnitPlural: 'Wards',
    reportTitle: 'Block-wise Report',
    filterLabel: 'Block',
    summaryLabel: 'Total Blocks',
    tableHeader: 'Block Name'
  },
  block: {
    // Block users manage villages (not wards)
    administrativeUnit: 'Village',
    administrativeUnitPlural: 'Villages',
    reportTitle: 'Village-wise Report',
    filterLabel: 'Village',
    summaryLabel: 'Total Villages',
    tableHeader: 'Village Name'
  },
  sub_centre: {
    // Sub-centre users work with villages
    administrativeUnit: 'Village',
    administrativeUnitPlural: 'Villages',
    reportTitle: 'Village-wise Report',
    filterLabel: 'Village',
    summaryLabel: 'Total Villages',
    tableHeader: 'Village Name'
  },
  usg_centre: {
    // USG centre users work with villages
    administrativeUnit: 'Village',
    administrativeUnitPlural: 'Villages',
    reportTitle: 'Village-wise Report',
    filterLabel: 'Village',
    summaryLabel: 'Total Villages',
    tableHeader: 'Village Name'
  }
};

/**
 * Get role-based labels for the current user
 * 
 * @param {string} userRole - User role (district, block, sub_centre, usg_centre)
 * @returns {object} Label configuration object
 * 
 * @example
 * const labels = getRoleLabels('block');
 * console.log(labels.reportTitle); // "Village-wise Report"
 * console.log(labels.filterLabel); // "Village"
 */
export const getRoleLabels = (userRole) => {
  return ROLE_LABELS[userRole] || ROLE_LABELS.district; // Default to district if role not found
};

/**
 * Get specific label for current user role
 * 
 * @param {string} userRole - User role
 * @param {string} labelKey - Label key (e.g., 'reportTitle', 'filterLabel')
 * @returns {string} Label text
 * 
 * @example
 * const title = getRoleLabel('block', 'reportTitle'); // "Village-wise Report"
 */
export const getRoleLabel = (userRole, labelKey) => {
  const labels = getRoleLabels(userRole);
  return labels[labelKey] || '';
};

/**
 * Check if user role should see "Village" terminology
 * 
 * @param {string} userRole - User role
 * @returns {boolean} True if should use "Village" instead of "Ward"
 */
export const shouldUseVillageTerminology = (userRole) => {
  return ['block', 'sub_centre', 'usg_centre'].includes(userRole);
};

export default {
  getRoleLabels,
  getRoleLabel,
  shouldUseVillageTerminology
};
