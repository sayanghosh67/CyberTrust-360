/** Published only after a new report has been persisted successfully. */
export const REPORTS_CHANGED = 'cybertrust:reports-changed';
export function notifyReportsChanged() { window.dispatchEvent(new Event(REPORTS_CHANGED)); }
