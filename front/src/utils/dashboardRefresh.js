/** Notify the home dashboard to refetch role-specific overview data. */
export function dispatchDashboardRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('am:dashboard:refresh'))
  }
}
