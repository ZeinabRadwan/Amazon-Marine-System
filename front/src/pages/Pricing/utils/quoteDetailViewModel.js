import { mergeCurrencyAmountMaps } from '../../../utils/dateUtils'

const OCEAN_CODES = new Set(['OF', 'THC', 'BL', 'TELEX', 'ISPS', 'PTI', 'POWER'])

export function parseNum(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function sumLineSellingByCurrency(lines) {
  const m = {}
  if (!Array.isArray(lines)) return m
  for (const line of lines) {
    if (line.included === false) continue
    const cur = line.currency || 'USD'
    const n = parseNum(line.selling_amount)
    if (n === 0) continue
    m[cur] = (m[cur] || 0) + n
  }
  return m
}

export function sumLineCostByCurrency(lines) {
  const m = {}
  if (!Array.isArray(lines)) return m
  for (const line of lines) {
    if (line.included === false) continue
    const cur = line.currency || 'USD'
    const n = parseNum(line.cost_amount)
    if (n === 0) continue
    m[cur] = (m[cur] || 0) + n
  }
  return m
}

export function sumProfitsByCurrency(lines) {
  const map = {}
  if (!Array.isArray(lines)) return map
  for (const line of lines) {
    if (line.included === false) continue
    const cur = line.currency || 'USD'
    const p = parseNum(line.selling_amount) - parseNum(line.cost_amount)
    map[cur] = (map[cur] || 0) + p
  }
  return map
}

export function sumCustomsCostByCurrency(clearanceFee, extraItems, enabled) {
  if (!enabled) return {}
  const m = {}
  const baseAmt = Number(clearanceFee?.amount) || 0
  const baseCur = String(clearanceFee?.currency || 'EGP').toUpperCase()
  if (baseAmt > 0) m[baseCur] = (m[baseCur] || 0) + baseAmt
  for (const row of extraItems || []) {
    const amt = parseNum(row.amount)
    if (amt <= 0) continue
    const cur = String(row.currency || 'EGP').toUpperCase()
    m[cur] = (m[cur] || 0) + amt
  }
  return m
}

export function sumHandlingByCurrency(lines) {
  const m = {}
  for (const row of lines || []) {
    const n = parseNum(row.amount)
    if (n <= 0) continue
    const c = String(row.currency || 'USD').toUpperCase()
    m[c] = (m[c] || 0) + n
  }
  return m
}

function isCustomsOtherItem(item, quote) {
  if (!quote?.official_receipts_note) return false
  const code = String(item.code || '').toUpperCase()
  if (code !== 'OTHER') return false
  const cost = item.cost_amount != null ? Number(item.cost_amount) : null
  const amt = Number(item.amount)
  if (cost == null || !Number.isFinite(cost) || !Number.isFinite(amt)) return false
  return Math.abs(cost - amt) < 1e-9
}

function mapOceanLine(item) {
  return {
    id: item.id,
    code: String(item.code || '').toUpperCase(),
    name: item.name,
    description: item.description,
    cost_amount: item.cost_amount,
    selling_amount: item.amount,
    currency: item.currency || 'USD',
    included: item.visible_to_client !== false,
  }
}

function parseQuickInlandMeta(description) {
  const meta = {}
  String(description || '')
    .split('|')
    .forEach((seg) => {
      const eq = seg.indexOf('=')
      if (eq === -1) return
      meta[seg.slice(0, eq)] = seg.slice(eq + 1)
    })
  return meta
}

export function containerLabelFromQuote(quote) {
  if (quote?.container_type) return quote.container_type
  const spec = quote?.container_spec
  if (!spec || typeof spec !== 'object') return '—'
  const size = spec.size || '40'
  const type = spec.type === 'reefer' ? 'Reefer' : 'Dry'
  const height = spec.height === 'hq' ? 'HQ ' : ''
  return `${size}${height}${type}`.trim()
}

export function buildSailingScheduleFromQuote(quote) {
  if (!quote) return null
  const dates = (quote.sailing_dates || []).map((d) => String(d || '').trim().slice(0, 10)).filter(Boolean)
  const weekdays = Array.isArray(quote.sailing_weekdays) ? quote.sailing_weekdays.filter(Boolean) : []
  const mode = quote.schedule_type === 'weekly' || (weekdays.length && !dates.length) ? 'weekly' : dates.length ? 'fixed' : null
  if (mode === 'weekly' && weekdays.length) {
    return {
      mode: 'weekly',
      fixedDates: [],
      weeklyWeekdays: weekdays,
      validFrom: quote.valid_from ? String(quote.valid_from).slice(0, 10) : null,
      validTo: quote.valid_to ? String(quote.valid_to).slice(0, 10) : null,
    }
  }
  if (dates.length) {
    return {
      mode: 'fixed',
      fixedDates: dates,
      weeklyWeekdays: [],
      validFrom: quote.valid_from ? String(quote.valid_from).slice(0, 10) : null,
      validTo: quote.valid_to ? String(quote.valid_to).slice(0, 10) : null,
    }
  }
  return null
}

/**
 * Partition API quote items into the same shapes used by Create Quotation sections.
 */
export function buildQuoteDetailViewModel(quote) {
  const isQuick = Boolean(quote?.quick_mode ?? quote?.is_quick_quotation)
  const items = Array.isArray(quote?.items) ? quote.items : []

  const oceanLines = []
  const inlandLineRows = []
  const handlingLines = []
  const customsCandidates = []
  let inlandOfferId = ''

  const quickInlandRows = []

  for (const it of items) {
    const code = String(it.code || '').toUpperCase()
    const desc = String(it.description || '')

    if (code === 'HANDLING') {
      handlingLines.push({
        id: it.id ?? `handling-${handlingLines.length}`,
        name: it.name,
        amount: it.amount,
        currency: it.currency || 'USD',
        isDefault: handlingLines.length === 0,
      })
      continue
    }

    if (code === 'INLAND' || desc.includes('inland_offer_id=') || desc.startsWith('quick_inland_manual')) {
      const offerMatch = desc.match(/inland_offer_id=(\d+)/)
      if (offerMatch) inlandOfferId = offerMatch[1]

      if (desc.startsWith('quick_inland_manual')) {
        quickInlandRows.push(it)
        continue
      }

      const keyMatch = desc.match(/key=([^;]+)/)
      inlandLineRows.push({
        sourceKey: keyMatch ? keyMatch[1] : it.name,
        name: it.name,
        cost_amount: it.cost_amount,
        selling_amount: it.amount,
        currency: it.currency || 'EGP',
        included: it.visible_to_client !== false,
        code: 'INLAND',
      })
      continue
    }

    if (OCEAN_CODES.has(code)) {
      oceanLines.push(mapOceanLine(it))
      continue
    }

    if (code === 'OTHER') {
      if (isCustomsOtherItem(it, quote)) {
        customsCandidates.push(it)
      } else {
        oceanLines.push(mapOceanLine(it))
      }
    }
  }

  const customsEnabled = Boolean(quote?.official_receipts_note) || customsCandidates.length > 0
  let customsClearanceFee = { amount: 0, currency: 'EGP' }
  let customsExtraItems = []
  if (customsCandidates.length) {
    const [base, ...extras] = customsCandidates
    customsClearanceFee = {
      amount: base.amount,
      currency: base.currency || 'EGP',
    }
    customsExtraItems = extras.map((row, idx) => ({
      id: row.id ?? `customs-extra-${idx}`,
      name: row.name,
      amount: row.amount,
      currency: row.currency || 'EGP',
    }))
  }

  let quickInland = null
  if (isQuick && quickInlandRows.length) {
    const main =
      quickInlandRows.find((r) => !String(r.description || '').includes('generator')) || quickInlandRows[0]
    const gen = quickInlandRows.find((r) => String(r.description || '').includes('generator'))
    const meta = parseQuickInlandMeta(main?.description)
    quickInland = {
      port: meta.port || '',
      gov: meta.gov || '',
      zone: meta.zone || '',
      vehicle: meta.vehicle || '',
      cost: main?.cost_amount ?? '',
      selling: main?.amount ?? '',
      currency: main?.currency || 'EGP',
      genCost: gen?.cost_amount ?? '',
      genSelling: gen?.amount ?? '',
      genCurrency: gen?.currency || main?.currency || 'EGP',
      showGenerator: Boolean(gen),
    }
  }

  const oceanSellingByCurrency = sumLineSellingByCurrency(oceanLines)
  const oceanCostByCurrency = sumLineCostByCurrency(oceanLines)
  const pricingLinesProfitByCurrency = sumProfitsByCurrency(oceanLines)

  const customsSellingByCurrency = sumCustomsCostByCurrency(customsClearanceFee, customsExtraItems, customsEnabled)
  const handlingSellingByCurrency = sumHandlingByCurrency(handlingLines)

  let inlandSectionCostByCurrency = {}
  let inlandSectionProfitByCurrency = {}
  let inlandSectionSellingByCurrency = {}

  if (isQuick && quickInland) {
    const cost = parseNum(quickInland.cost)
    const sell = parseNum(quickInland.selling)
    const cur = quickInland.currency || 'EGP'
    if (cost > 0) inlandSectionCostByCurrency[cur] = (inlandSectionCostByCurrency[cur] || 0) + cost
    if (sell > 0) inlandSectionSellingByCurrency[cur] = (inlandSectionSellingByCurrency[cur] || 0) + sell
    if (sell > 0 || cost > 0) inlandSectionProfitByCurrency[cur] = (inlandSectionProfitByCurrency[cur] || 0) + (sell - cost)
    const genCost = parseNum(quickInland.genCost)
    const genSell = parseNum(quickInland.genSelling)
    const genCur = quickInland.genCurrency || cur
    if (genCost > 0) inlandSectionCostByCurrency[genCur] = (inlandSectionCostByCurrency[genCur] || 0) + genCost
    if (genSell > 0) inlandSectionSellingByCurrency[genCur] = (inlandSectionSellingByCurrency[genCur] || 0) + genSell
    if (genSell > 0 || genCost > 0) {
      inlandSectionProfitByCurrency[genCur] = (inlandSectionProfitByCurrency[genCur] || 0) + (genSell - genCost)
    }
  } else {
    inlandSectionCostByCurrency = sumLineCostByCurrency(inlandLineRows)
    inlandSectionProfitByCurrency = sumProfitsByCurrency(inlandLineRows)
    inlandSectionSellingByCurrency = sumLineSellingByCurrency(inlandLineRows)
  }

  const quoteProfitByCurrency = { ...pricingLinesProfitByCurrency }
  Object.entries(inlandSectionProfitByCurrency).forEach(([c, v]) => {
    quoteProfitByCurrency[c] = (quoteProfitByCurrency[c] || 0) + v
  })

  const grandSellingByCurrency = mergeCurrencyAmountMaps(
    oceanSellingByCurrency,
    customsSellingByCurrency,
    inlandSectionSellingByCurrency,
    handlingSellingByCurrency
  )

  const hasInlandQuoteData = isQuick
    ? parseNum(quickInland?.selling) > 0 || parseNum(quickInland?.genSelling) > 0
    : inlandLineRows.some((row) => row.included !== false && parseNum(row.selling_amount) > 0)

  const selectedSailingDate = String(quote?.sailing_dates?.[0] || '').trim().slice(0, 10)
  const sailingSchedule = buildSailingScheduleFromQuote(quote)

  return {
    isQuick,
    oceanLines,
    inlandLineRows,
    inlandOfferId,
    quickInland,
    handlingLines,
    customsEnabled,
    customsClearanceFee,
    customsExtraItems,
    oceanSellingByCurrency,
    oceanCostByCurrency,
    pricingLinesProfitByCurrency,
    customsSellingByCurrency,
    handlingSellingByCurrency,
    inlandSectionCostByCurrency,
    inlandSectionProfitByCurrency,
    inlandSectionSellingByCurrency,
    quoteProfitByCurrency,
    grandSellingByCurrency,
    hasInlandQuoteData,
    selectedSailingDate,
    sailingSchedule,
    containerLabel: containerLabelFromQuote(quote),
  }
}
