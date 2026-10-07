/**
 * Centralized Date Formatting Utility
 * 
 * Standard Format: DD/MM/YYYY (Indian/British format)
 * 
 * Purpose: Ensure consistent date formatting across the entire application
 * Bug Fix: SL No. 50 - Inconsistent date formats in Reports & Analytics
 * 
 * All date displays should use these functions instead of inline formatting
 */

// ==================== CONFIGURATION ====================

const DATE_CONFIG = {
    locale: 'en-GB', // British English (DD/MM/YYYY format)
    dateFormat: {
        day: '2-digit',
        month: '2-digit',    // NUMERIC month (02 not Feb)
        year: 'numeric'
    },
    dateTimeFormat: {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false        // 24-hour format
    },
    timeOnlyFormat: {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }
};

// ==================== MAIN FUNCTIONS ====================

/**
 * Format date for display in DD/MM/YYYY format
 * 
 * @param {string|Date} dateString - ISO date string or Date object
 * @returns {string} Formatted date (e.g., "19/03/2026") or "N/A" if invalid
 * 
 * @example
 * formatDate("2026-03-19") // Returns: "19/03/2026"
 * formatDate("2026-03-19T10:30:00") // Returns: "19/03/2026"
 * formatDate(null) // Returns: "N/A"
 */
export const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'N/A';
        }
        
        return date.toLocaleDateString(DATE_CONFIG.locale, DATE_CONFIG.dateFormat);
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'N/A';
    }
};

/**
 * Format date with time in DD/MM/YYYY HH:MM format
 * 
 * @param {string|Date} dateString - ISO date string or Date object
 * @returns {string} Formatted date with time (e.g., "19/03/2026 10:30") or "N/A" if invalid
 * 
 * @example
 * formatDateTime("2026-03-19T10:30:00") // Returns: "19/03/2026 10:30"
 * formatDateTime("2026-03-19") // Returns: "19/03/2026 00:00"
 */
export const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'N/A';
        }
        
        return date.toLocaleString(DATE_CONFIG.locale, DATE_CONFIG.dateTimeFormat);
    } catch (error) {
        console.error('Error formatting datetime:', error);
        return 'N/A';
    }
};

/**
 * Format time only in HH:MM format (24-hour)
 * 
 * @param {string|Date} dateString - ISO date string or Date object
 * @returns {string} Formatted time (e.g., "10:30") or "N/A" if invalid
 * 
 * @example
 * formatTimeOnly("2026-03-19T10:30:00") // Returns: "10:30"
 */
export const formatTimeOnly = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'N/A';
        }
        
        return date.toLocaleTimeString(DATE_CONFIG.locale, DATE_CONFIG.timeOnlyFormat);
    } catch (error) {
        console.error('Error formatting time:', error);
        return 'N/A';
    }
};

/**
 * Format date for HTML input fields (ensures YYYY-MM-DD format)
 * 
 * HTML <input type="date"> ONLY accepts YYYY-MM-DD format.
 * This function handles various input formats and normalizes them.
 * 
 * @param {string|Date} dateValue - Date in any format from backend
 * @returns {string} Date in YYYY-MM-DD format or empty string
 * 
 * @example
 * formatDateForInput("2026-03-19") // Returns: "2026-03-19"
 * formatDateForInput("2026-03-19T10:30:00") // Returns: "2026-03-19"
 * formatDateForInput(null) // Returns: ""
 */
export const formatDateForInput = (dateValue) => {
    if (!dateValue) return '';
    
    try {
        // If already in YYYY-MM-DD format, return as-is
        if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
            return dateValue;
        }
        
        // If DateTime string (ISO format with time), extract date part
        if (typeof dateValue === 'string' && dateValue.includes('T')) {
            return dateValue.split('T')[0];
        }
        
        // If Date object, convert to YYYY-MM-DD
        if (dateValue instanceof Date) {
            return formatDateForAPI(dateValue);
        }
        
        // If other string format, try to parse
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
            return formatDateForAPI(date);
        }
    } catch (error) {
        console.error('Error formatting date for input:', dateValue, error);
    }
    
    return '';
};

/**
 * Format date for API submission (ISO format YYYY-MM-DD)
 * 
 * @param {Date} date - Date object
 * @returns {string} ISO formatted date (e.g., "2026-03-19")
 * 
 * @example
 * formatDateForAPI(new Date()) // Returns: "2026-03-19"
 */
export const formatDateForAPI = (date) => {
    if (!date) return '';
    
    try {
        const dateObj = date instanceof Date ? date : new Date(date);
        
        // Check if date is valid
        if (isNaN(dateObj.getTime())) {
            return '';
        }
        
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    } catch (error) {
        console.error('Error formatting date for API:', error);
        return '';
    }
};

/**
 * Format relative time (Today, Yesterday, or date)
 * Used for notifications and activity logs
 * 
 * @param {string|Date} dateString - ISO date string or Date object
 * @returns {string} Relative time string
 * 
 * @example
 * formatRelativeTime("2026-03-19T10:30:00") // If today: "Today at 10:30"
 * formatRelativeTime("2026-03-18T10:30:00") // If yesterday: "Yesterday at 10:30"
 * formatRelativeTime("2026-03-15T10:30:00") // "15/03/2026"
 */
export const formatRelativeTime = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'N/A';
        }
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        if (itemDate.getTime() === today.getTime()) {
            // Today - show "Today at HH:MM"
            const time = formatTimeOnly(dateString);
            return `Today at ${time}`;
        } else if (itemDate.getTime() === yesterday.getTime()) {
            // Yesterday - show "Yesterday at HH:MM"
            const time = formatTimeOnly(dateString);
            return `Yesterday at ${time}`;
        } else {
            // Older - show date in DD/MM/YYYY format
            return formatDate(dateString);
        }
    } catch (error) {
        console.error('Error formatting relative time:', error);
        return 'N/A';
    }
};

/**
 * Get current date in YYYY-MM-DD format (for date input fields)
 * 
 * @returns {string} Today's date in ISO format
 * 
 * @example
 * getTodayISO() // Returns: "2026-03-19"
 */
export const getTodayISO = () => {
    return formatDateForAPI(new Date());
};

/**
 * Validate if a date string is valid
 * 
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid date, false otherwise
 * 
 * @example
 * isValidDate("2026-03-19") // Returns: true
 * isValidDate("invalid") // Returns: false
 */
export const isValidDate = (dateString) => {
    if (!dateString) return false;
    
    try {
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    } catch (error) {
        return false;
    }
};

/**
 * Compare two dates (ignoring time)
 * 
 * @param {string|Date} date1 - First date
 * @param {string|Date} date2 - Second date
 * @returns {number} -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 * 
 * @example
 * compareDates("2026-03-19", "2026-03-20") // Returns: -1
 * compareDates("2026-03-19", "2026-03-19") // Returns: 0
 */
export const compareDates = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    
    if (d1 < d2) return -1;
    if (d1 > d2) return 1;
    return 0;
};

// ==================== EXPORT DEFAULT ====================

export default {
    formatDate,
    formatDateTime,
    formatTimeOnly,
    formatDateForAPI,
    formatDateForInput,
    formatRelativeTime,
    getTodayISO,
    isValidDate,
    compareDates
};
