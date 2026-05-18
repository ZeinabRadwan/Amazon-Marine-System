/**
 * Sidebar activity badges: unread notifications + pending actions per module.
 */

export const SIDEBAR_ACTIVITY_REFRESH_EVENT = 'am:sidebar-activity:refresh'

/** Sidebar badge id (Sidebar.jsx) → API module key */
export const SIDEBAR_BADGE_TO_MODULE = {
  crm: 'clients',
  sdForms: 'sd_forms',
  shipments: 'shipments',
}

/** First path segment → module to acknowledge when user opens the page */
export function moduleKeyForPathname(pathname) {
  const path = String(pathname || '').split('?')[0]
  if (path === '/' || path === '') return 'dashboard'
  if (path.startsWith('/clients')) return 'clients'
  if (path.startsWith('/sd-forms')) return 'sd_forms'
  if (path.startsWith('/shipments')) return 'shipments'
  if (path.startsWith('/customer-services')) return 'customer_service'
  if (path.startsWith('/attendance')) return 'attendance'
  if (path.startsWith('/pricing')) return 'pricing'
  if (path.startsWith('/notifications')) return null
  return null
}

export function dispatchSidebarActivityRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SIDEBAR_ACTIVITY_REFRESH_EVENT))
  }
}

/**
 * @param {Record<string, number>|null|undefined} apiData
 * @returns {{ crmCount: number, sdFormsCount: number, shipmentsCount: number, ticketsCount: number }}
 */
export function mapSidebarActivityToCounts(apiData) {
  const badges = apiData?.badges && typeof apiData.badges === 'object' ? apiData.badges : null
  if (badges) {
    return {
      crmCount: Number(badges.clients) || 0,
      sdFormsCount: Number(badges.sd_forms) || 0,
      shipmentsCount: Number(badges.shipments) || 0,
      ticketsCount: Number(badges.customer_service) || 0,
    }
  }
  return {
    crmCount: Number(apiData?.crmCount) || 0,
    sdFormsCount: Number(apiData?.sdFormsCount) || 0,
    shipmentsCount: Number(apiData?.shipmentsCount) || 0,
    ticketsCount: Number(apiData?.ticketsCount) || 0,
  }
}
