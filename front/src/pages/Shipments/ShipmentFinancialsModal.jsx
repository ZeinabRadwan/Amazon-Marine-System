import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ChevronDown, ChevronUp, FileText, DollarSign, History, Ship, Car, ShieldCheck, Shield, Package, Upload, Trash2, Paperclip, Eye, Pencil, FileDown, Bell } from 'lucide-react'
import {
  createExpense,
  updateExpense,
  deleteExpense,
  uploadExpenseReceipt,
  downloadExpenseReceipt,
  renameExpenseReceipt,
  deleteExpenseReceipt,
  listExpenseCategories,
} from '../../api/expenses'
import {
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  issueInvoice,
  recordInvoicePayment,
  downloadInvoicePdf,
  listCurrencies,
} from '../../api/invoices'
import { listActivitiesBySubject } from '../../api/activities'
import {
  notifyShipmentSalesFinancials,
  updateShipmentCostInvoice,
  getShipmentCostInvoice,
  downloadShipmentAttachment,
} from '../../api/shipments'
import { listBankAccounts } from '../../api/accountings'
import { useAuthAccess } from '../../hooks/useAuthAccess'
import { ROLE_ID } from '../../constants/roles'
import { BUCKET_DEFS, expenseBucket, LINE_TEMPLATES, expenseHaystack, partitionBucketRows } from './shipmentFinUtils'
import Tabs from '../../components/Tabs'
import '../SDForms/SDForms.css'

// BUCKET_DEFS moved to shipmentFinUtils.js

// LINE_TEMPLATES, expenseHaystack, and partitionBucketRows moved to shipmentFinUtils.js

const OTHER_DESC_PREFIX = {
  shipping: 'Other Charges',
  inland: 'Other Expenses',
  customs: 'Other Customs Expenses',
  insurance: 'Other Insurance Expenses',
}

/** Matches draft client invoice line used for handling / service fee. */
const HANDLING_FEE_DESCRIPTION = 'Handling Fee'

function otherLineCategoryCode(bucketId) {
  if (bucketId === 'insurance') return 'OTH'
  if (bucketId === 'customs') return 'CUST'
  if (bucketId === 'inland') return 'DOM_TR'
  return 'FRT'
}

// expenseBucket moved to shipmentFinUtils.js

function sumByCurrency(rows) {
  const safeRows = Array.isArray(rows) ? rows : []
  const map = {}
  for (const r of safeRows) {
    const curRaw = String(r.currency_code || '').trim().toUpperCase()
    const amt = Number(r.amount)
    if (!Number.isFinite(amt) || amt <= 0) continue
    if (!curRaw || curRaw === '—') continue
    const cur = curRaw
    map[cur] = (map[cur] || 0) + amt
  }
  return map
}

function formatMoney(amount, locale) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount)
}

/** Mixed-currency totals: EGP → USD → EUR → other codes A–Z (matches section badges). */
const DISPLAY_CURRENCY_ORDER = ['EGP', 'USD', 'EUR']

function orderCurrencyMapEntries(map) {
  const entries = Object.entries(map || {}).filter(([, v]) => Number(v) !== 0)
  const primary = new Set(DISPLAY_CURRENCY_ORDER)
  const out = []
  for (const code of DISPLAY_CURRENCY_ORDER) {
    const hit = entries.find(([c]) => c === code)
    if (hit) out.push(hit)
  }
  entries
    .filter(([c]) => !primary.has(c))
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach((e) => out.push(e))
  return out
}

function formatOrderedCurrencyMap(map, formatMoneyFn, locale) {
  const ordered = orderCurrencyMapEntries(map)
  return ordered.length ? ordered.map(([c, v]) => `${c} ${formatMoneyFn(Number(v), locale)}`).join(' · ') : '—'
}

function currencyBadgeClassForCode(code) {
  const c = String(code || '').toUpperCase()
  if (c === 'EGP') return 'shipment-fin-currency-badge--orange'
  if (c === 'USD') return 'shipment-fin-currency-badge--green'
  if (c === 'EUR') return 'shipment-fin-currency-badge--blue'
  return 'shipment-fin-currency-badge--blue'
}

function currencyCodePill(code) {
  const raw = String(code ?? '').trim().toUpperCase()
  const display = raw || '—'
  let variant = 'alt'
  if (display === 'EGP') variant = 'egp'
  else if (display === 'USD') variant = 'usd'
  else if (display === 'EUR') variant = 'eur'
  else if (display === '—') variant = 'muted'
  return <span className={`shipment-fin-cur-pill shipment-fin-cur-pill--${variant}`}>{display}</span>
}

function formatFileSize(size) {
  const bytes = Number(size) || 0
  if (bytes <= 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function clientLabel(shipment) {
  return shipment?.client?.company_name ?? shipment?.client?.name ?? '—'
}

/** Display date like add_cost_inoice.html ship-bar (e.g. 25 Apr 2025). */
function formatShipBarDate(isoOrStr) {
  if (isoOrStr == null || isoOrStr === '') return '—'
  const d = new Date(isoOrStr)
  if (Number.isNaN(d.getTime())) return String(isoOrStr).slice(0, 10) || '—'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const CURRENCIES = ['EGP', 'USD', 'EUR']

/** English prefixes stored in `description` so template matchers keep working. */
const LINE_DESC_PREFIX = {
  thc: 'THC – Terminal Handling Charges - عوائد الشحن / رسوم تداول الحاويات بالميناء',
  telex: 'Telex Release Fee - رسوم التليكس',
  dhl: 'DHL / Courier Fees - مصاريف DHL أو الشحن السريع للمستندات',
  bl: 'Bill of Lading Fee (B/L Fee) - رسوم البوليصة',
  power: 'Power Charge - رسوم الباور (خاصة بحاويات الريفير)',
  of: 'Ocean Freight (OF) - نولون الشحن البحري',
  genset: 'Genset Cost - تكلفة المولد الكهربائي (للريفير)',
  overnight: 'Overnight Stay Cost (Truck Layover) - تكلفة المبيت (انتظار الشاحنة)',
  receipts: 'Official Receipts Cost - تكلفة الإيصالات الرسمية',
  inlandFreight: 'Inland Transportation Freight Cost - تكلفة نولون النقل البري',
  decl: 'Customs Declaration Opening Fee - رسوم فتح الشهادة الجمركية',
  custReceipts: 'Official Receipts Fees - رسوم الإيصالات الرسمية',
  premium: 'Insurance Premium',
}

function categoryCodeForTemplate(bucketId, tplId) {
  if (bucketId === 'shipping' && tplId === 'thc') return 'THC'
  if (bucketId === 'customs') return 'CUST'
  if (bucketId === 'inland') return 'DOM_TR'
  if (bucketId === 'insurance') return 'OTH'
  return 'FRT'
}

function extractUserDescription(stored, prefix) {
  if (!stored || typeof stored !== 'string') return ''
  const p = `${prefix}:`
  const s = stored.trim()
  if (s.startsWith(p)) return s.slice(p.length).trim()
  return s
}

function normalizeTemplateEditableDescription(stored, bucketId, tplId) {
  const raw = String(stored || '').trim()
  if (!raw) return ''
  const strictPrefix = LINE_DESC_PREFIX[tplId] || tplId
  const strictStripped = extractUserDescription(raw, strictPrefix)
  if (strictStripped !== raw) return strictStripped
  const templates = LINE_TEMPLATES[bucketId] || []
  for (const tpl of templates) {
    const p = LINE_DESC_PREFIX[tpl.id] || tpl.id
    const stripped = extractUserDescription(raw, p)
    if (stripped !== raw) return stripped
  }
  return raw
}

/** Non-template lines (orphans / “Other”) — title same rules as cost-items display fallback. */
function orphanOrCustomFeeTitle(ex, bucket, t) {
  const base = OTHER_DESC_PREFIX[bucket] || 'Other'
  const fromDesc = extractUserDescription(ex.description || '', base)
  const title = String(ex.title || '').trim()
  return (
    title ||
    fromDesc ||
    String(ex.description || '').trim() ||
    t('shipments.fin.customItemFallback', { defaultValue: 'Custom Item' })
  )
}

/**
 * Fee title shown on Selling tab must match Shipment Cost Items:
 * template label keys first, then matchers (same order as partitionBucketRows), then orphan/custom title.
 */
function resolveCostItemStyleFeeNameFromExpense(ex, t, isReefer) {
  const bucket = ex.bucket_id || expenseBucket(ex)
  const tid = String(ex.template_id || '').trim().toLowerCase()
  const templates = LINE_TEMPLATES[bucket] || []

  if (tid && tid !== 'other') {
    const tpl = templates.find((x) => x.id === tid)
    if (tpl) return t(tpl.labelKey)
  }

  const hay = expenseHaystack(ex)
  for (const tpl of templates) {
    if (tpl.reeferOnly && !isReefer) continue
    if (tpl.matchers.some((re) => re.test(hay))) {
      return t(tpl.labelKey)
    }
  }

  if (tid === 'other') {
    return orphanOrCustomFeeTitle(ex, bucket, t)
  }

  return orphanOrCustomFeeTitle(ex, bucket, t)
}

function resolveCostItemStyleFeeNameFromRow(row, t, isReefer) {
  if (String(row.expenseId || '').startsWith('tmp-')) {
    return t('shipments.fin.customItemFallback', { defaultValue: 'Custom Item' })
  }
  const syntheticEx = {
    template_id: row.template_id,
    bucket_id: row.bucket_id,
    title: row.expense_title,
    description:
      row.expense_description != null && row.expense_description !== ''
        ? row.expense_description
        : row.description,
    category_name: row.category_name,
    invoice_number: row.invoice_number,
  }
  return resolveCostItemStyleFeeNameFromExpense(syntheticEx, t, isReefer)
}

function FinSingleExpenseRow({
  tpl,
  bucketId,
  expense,
  showLineLabel,
  shipment,
  token,
  editMode,
  categoriesByCode,
  t,
  numberLocale,
  renderLineLabelCell,
  onSaved,
  saveRegisterKey,
  onRegisterSave,
  sectionVendorId,
}) {
  const safeExp = expense || {}
  const descPrefix = tpl ? (LINE_DESC_PREFIX[tpl.id] || tpl.id) : ''
  const categoryCode = tpl ? categoryCodeForTemplate(bucketId, tpl.id) : otherLineCategoryCode(bucketId)
  const categoryMeta = categoriesByCode[categoryCode]

  const [desc, setDesc] = useState(() => extractUserDescription(safeExp.description, descPrefix))
  const [amount, setAmount] = useState(safeExp.amount != null ? String(safeExp.amount) : '')
  const [currency, setCurrency] = useState(safeExp.currency_code || 'USD')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [rowError, setRowError] = useState(null)

  const handleSaveRef = useRef(async () => {})

  useEffect(() => {
    setDesc(extractUserDescription(safeExp.description, descPrefix))
    setAmount(safeExp.amount != null ? String(safeExp.amount) : '')
    setCurrency(safeExp.currency_code || 'USD')
    setRowError(null)
  }, [safeExp.id, safeExp.description, safeExp.amount, safeExp.currency_code, descPrefix])

  const buildFullDescription = () => (tpl ? `${descPrefix}: ${(desc || '').trim() || tpl.id}` : (desc || '').trim())

  const handleSave = async () => {
    setRowError(null)
    if (!categoryMeta?.id) {
      setRowError(t('shipments.fin.errorNoCategory'))
      return
    }
    const descTrimmed = (desc || '').trim()
    const amountRaw = String(amount ?? '').trim()
    // Skip untouched template rows during section-level save to avoid duplicate blank records.
    if (!safeExp.id && descTrimmed === '' && amountRaw === '') {
      return
    }
    const amt = Number(amount)
    if (Number.isNaN(amt) || amt < 0) {
      setRowError(t('shipments.fin.errorInvalidAmount'))
      return
    }
    const dateStr = new Date().toISOString().slice(0, 10)
    setSaving(true)
    try {
      if (safeExp.id) {
        await updateExpense(token, safeExp.id, {
          description: buildFullDescription(),
          amount: amt,
          currency_code: currency,
          expense_date: safeExp.expense_date || dateStr,
          vendor_id: sectionVendorId || safeExp.vendor_id || undefined,
        })
      } else {
        await createExpense(token, {
          type: 'shipment',
          shipment_id: shipment.id,
          expense_category_id: categoryMeta.id,
          description: buildFullDescription(),
          amount: amt,
          currency_code: currency,
          expense_date: dateStr,
          vendor_id: sectionVendorId || safeExp.vendor_id || undefined,
        })
      }
      onSaved?.()
    } catch (err) {
      setRowError(err.message || t('shipments.fin.errorSaveLine'))
    } finally {
      setSaving(false)
    }
  }

  handleSaveRef.current = handleSave

  useEffect(() => {
    if (!editMode || !saveRegisterKey || !onRegisterSave) return undefined
    return onRegisterSave(saveRegisterKey, async () => {
      await handleSaveRef.current()
    })
  }, [editMode, saveRegisterKey, onRegisterSave])

  const handleDelete = async () => {
    if (!expense?.id) return
    if (!window.confirm(t('shipments.fin.confirmDeleteLine'))) return
    setRowError(null)
    setSaving(true)
    try {
      await deleteExpense(token, expense.id)
      onSaved?.()
    } catch (err) {
      setRowError(err.message || t('shipments.fin.errorDeleteLine'))
    } finally {
      setSaving(false)
    }
  }

  const handleReceipt = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !expense?.id) return
    setRowError(null)
    setUploading(true)
    try {
      await uploadExpenseReceipt(token, expense.id, file)
      onSaved?.()
    } catch (err) {
      setRowError(err.message || t('shipments.fin.errorReceipt'))
    } finally {
      setUploading(false)
    }
  }

  const actionsCell = editMode ? (
    <td className="shipment-fin-actions">
      <div className="shipment-fin-actions__inner">
        <button type="button" className="shipment-fin-btn shipment-fin-btn--primary" disabled={saving || !categoryMeta?.id} onClick={handleSave}>
          {saving ? t('shipments.saving') : t('shipments.save')}
        </button>
        {expense?.id ? (
          <button type="button" className="shipment-fin-btn shipment-fin-btn--danger" disabled={saving} onClick={handleDelete}>
            {t('shipments.delete')}
          </button>
        ) : null}
        {expense?.id ? (
          <label className="shipment-fin-upload" title={t('shipments.fin.uploadReceipt')}>
            <Paperclip className="shipment-fin-upload__icon" aria-hidden />
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="shipment-fin-upload__input" onChange={handleReceipt} disabled={uploading || saving} />
          </label>
        ) : null}
      </div>
      {rowError ? <div className="shipment-fin-row-error">{rowError}</div> : null}
    </td>
  ) : null

  if (!editMode) {
    if (!expense) {
      return (
        <tr key={`${tpl?.id || 'null'}-empty`}>
          <td>{showLineLabel ? renderLineLabelCell(tpl) : null}</td>
          <td>—</td>
          <td className="shipment-fin-num">—</td>
          <td>—</td>
        </tr>
      )
    }
    return (
      <tr key={expense?.id}>
        <td>{showLineLabel ? renderLineLabelCell(tpl) : null}</td>
        <td>{expense?.description?.trim() || '—'}</td>
        <td className="shipment-fin-num">{formatMoney(Number(expense?.amount) || 0, numberLocale)}</td>
        <td className="shipment-fin-cur-cell">{currencyCodePill(expense?.currency_code)}</td>
      </tr>
    )
  }

  return (
    <tr>
      <td>{showLineLabel ? renderLineLabelCell(tpl) : null}</td>
      <td>
        <input
          type="text"
          className="shipment-fin-input"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder={t('shipments.fin.descPlaceholder')}
          disabled={saving}
        />
      </td>
      <td>
        <input
          type="number"
          min="0"
          step="0.01"
          className="shipment-fin-input shipment-fin-input--num"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={saving}
        />
      </td>
      <td>
        <select className="shipment-fin-select" value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={saving}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </td>
      {actionsCell}
    </tr>
  )
}

function FinPendingOtherChargeRow({
  bucketId,
  line,
  token,
  shipment,
  categoriesByCode,
  t,
  editMode,
  onSaved,
  onRemove,
  sectionVendorId,
}) {
  const prefix = OTHER_DESC_PREFIX[bucketId] || 'Other'
  const categoryCode = otherLineCategoryCode(bucketId)
  const categoryMeta = categoriesByCode[categoryCode]
  const [desc, setDesc] = useState(line.desc || '')
  const [amount, setAmount] = useState(line.amount != null ? String(line.amount) : '')
  const [currency, setCurrency] = useState(line.currency || 'USD')
  const [saving, setSaving] = useState(false)
  const [rowError, setRowError] = useState(null)

  useEffect(() => {
    setDesc(line.desc || '')
    setAmount(line.amount != null ? String(line.amount) : '')
    setCurrency(line.currency || 'USD')
    setRowError(null)
  }, [line.tempId, line.desc, line.amount, line.currency])

  const handleSave = async () => {
    setRowError(null)
    if (!categoryMeta?.id) {
      setRowError(t('shipments.fin.errorNoCategory'))
      return
    }
    const amt = Number(amount)
    if (Number.isNaN(amt) || amt < 0) {
      setRowError(t('shipments.fin.errorInvalidAmount'))
      return
    }
    const dateStr = new Date().toISOString().slice(0, 10)
    const fullDesc = (desc || '').trim()
    setSaving(true)
    try {
      await createExpense(token, {
        type: 'shipment',
        shipment_id: shipment.id,
        expense_category_id: categoryMeta.id,
        description: fullDesc,
        amount: amt,
        currency_code: currency,
        expense_date: dateStr,
        vendor_id: sectionVendorId ?? undefined,
      })
      onSaved?.()
      onRemove?.()
    } catch (err) {
      setRowError(err.message || t('shipments.fin.errorSaveLine'))
    } finally {
      setSaving(false)
    }
  }

  if (!editMode) return null

  return (
    <tr className="shipment-fin-other-pending-row">
      <td>
        <span className="shipment-fin-line-label">{t('shipments.fin.otherChargeLine')}</span>
      </td>
      <td>
        <input
          type="text"
          className="shipment-fin-input"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder={t('shipments.fin.descPlaceholder')}
          disabled={saving}
        />
      </td>
      <td>
        <input
          type="number"
          min="0"
          step="0.01"
          className="shipment-fin-input shipment-fin-input--num"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={saving}
        />
      </td>
      <td>
        <select className="shipment-fin-select" value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={saving}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </td>
      <td className="shipment-fin-actions">
        <div className="shipment-fin-actions__inner">
          <button type="button" className="shipment-fin-btn shipment-fin-btn--primary" disabled={saving || !categoryMeta?.id} onClick={handleSave}>
            {saving ? t('shipments.saving') : t('shipments.save')}
          </button>
          <button type="button" className="shipment-fin-btn shipment-fin-btn--secondary" disabled={saving} onClick={onRemove}>
            {t('shipments.cancel')}
          </button>
        </div>
        {rowError ? <div className="shipment-fin-row-error">{rowError}</div> : null}
      </td>
    </tr>
  )
}

/** @param {{ variant: 'expenses' | 'selling' | 'invoice' | 'history' }} props */
function ShipmentFinLoadingSkeleton({ variant }) {
  const { t } = useTranslation()
  const label = t('shipments.loading')

  if (variant === 'expenses') {
    return (
      <div className="shipment-fin-skel" role="status" aria-live="polite" aria-busy="true" aria-label={label}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="shipment-fin-skel-card">
            <div className="shipment-fin-skel-card__row">
              <div className="shipment-fin-skel-circ shipment-fin-shimmer" />
              <div className="shipment-fin-skel-lines">
                <div className="shipment-fin-skel-line shipment-fin-skel-line--lg shipment-fin-shimmer" />
                <div className="shipment-fin-skel-line shipment-fin-skel-line--sm shipment-fin-shimmer" />
              </div>
              <div className="shipment-fin-skel-lines shipment-fin-skel-lines--end">
                <div className="shipment-fin-skel-line shipment-fin-skel-line--md shipment-fin-shimmer" />
              </div>
            </div>
          </div>
        ))}
        <div className="shipment-fin-skel-total-bar">
          <div className="shipment-fin-skel-line shipment-fin-skel-line--stretch shipment-fin-shimmer" />
        </div>
      </div>
    )
  }

  if (variant === 'selling') {
    const cols = 7
    return (
      <div className="shipment-fin-skel" role="status" aria-live="polite" aria-busy="true" aria-label={label}>
        <div className="shipment-fin-skel-table-wrap">
          <table className="shipment-fin-skel-table">
            <tbody>
              {[1, 2, 3, 4, 5, 6].map((row) => (
                <tr key={row}>
                  {Array.from({ length: cols }, (_, c) => (
                    <td key={c}>
                      <span
                        className="shipment-fin-skel-cell shipment-fin-shimmer"
                        style={{ width: c === 0 ? '72%' : c === 1 ? '88%' : '56%' }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (variant === 'invoice') {
    return (
      <div className="shipment-fin-skel" role="status" aria-live="polite" aria-busy="true" aria-label={label}>
        <div className="shipment-fin-skel-invoice-head">
          <div className="shipment-fin-skel-invoice-block shipment-fin-skel-invoice-block--wide">
            <div className="shipment-fin-skel-line shipment-fin-skel-line--lg shipment-fin-shimmer" style={{ maxWidth: '10rem' }} />
            <div className="shipment-fin-skel-line shipment-fin-skel-line--sm shipment-fin-shimmer" style={{ maxWidth: '7rem' }} />
          </div>
          <div className="shipment-fin-skel-invoice-block shipment-fin-skel-invoice-block--end">
            <div className="shipment-fin-skel-line shipment-fin-skel-line--lg shipment-fin-shimmer" style={{ width: '5.5rem' }} />
            <div className="shipment-fin-skel-line shipment-fin-skel-line--md shipment-fin-shimmer" />
            <div className="shipment-fin-skel-line shipment-fin-skel-line--sm shipment-fin-shimmer" style={{ width: '6rem' }} />
          </div>
        </div>
        <div
          className="shipment-fin-shimmer"
          style={{ height: '1px', marginBottom: '1rem', borderRadius: '1px', opacity: 0.85 }}
        />
        <div className="shipment-fin-skel-table-wrap">
          <table className="shipment-fin-skel-table">
            <tbody>
              {[1, 2, 3, 4, 5].map((row) => (
                <tr key={row}>
                  <td style={{ width: '50%' }}>
                    <span className="shipment-fin-skel-cell shipment-fin-shimmer" style={{ width: '80%' }} />
                  </td>
                  <td>
                    <span
                      className="shipment-fin-skel-cell shipment-fin-shimmer"
                      style={{ width: '4rem', display: 'block', marginInlineStart: 'auto' }}
                    />
                  </td>
                  <td>
                    <span className="shipment-fin-skel-cell shipment-fin-shimmer" style={{ width: '2.5rem' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (variant === 'history') {
    return (
      <div className="shipment-fin-skel shipment-fin-skel-audit" role="status" aria-live="polite" aria-busy="true" aria-label={label}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="shipment-fin-skel-audit-item">
            <div className="shipment-fin-skel-dot shipment-fin-shimmer" />
            <div className="shipment-fin-skel-audit-lines">
              <div className="shipment-fin-skel-line shipment-fin-skel-line--sm shipment-fin-shimmer" style={{ maxWidth: '11rem' }} />
              <div className="shipment-fin-skel-line shipment-fin-skel-line--lg shipment-fin-shimmer" style={{ maxWidth: '100%' }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return null
}

/**
 * @param {{
 *   open: boolean,
 *   shipment: object | null,
 *   expenses: Array<object>,
 *   attachmentRefs?: Record<string, Array<{name?: string, uploaded_at?: string}>>,
 *   sectionMeta?: Record<string, { contractor_name?: string, customs_broker_name?: string, insurance_company_name?: string }>,
 *   loading: boolean,
 *   onClose: () => void,
 *   numberLocale: string,
 *   canViewSelling: boolean,
 *   token: string | null,
 *   canManageExpenses: boolean,
 *   onExpensesChanged?: () => void,
 *   vendors?: Array<{ id: number, name?: string }>,
 *   canManageFinancial?: boolean,
 *   onShipmentTotalsRefresh?: () => void,
 *   canNotifySales?: boolean,
 * }} props
 */
export default function ShipmentFinancialsModal({
  open,
  shipment,
  expenses,
  attachmentRefs = {},
  sectionMeta = {},
  loading,
  onClose,
  numberLocale,
  canViewSelling,
  token,
  canManageExpenses = false,
  onExpensesChanged,
  vendors = [],
  canManageFinancial = false,
  onShipmentTotalsRefresh,
  canNotifySales = false,
}) {
  const { t, i18n } = useTranslation()
  const { isAccountant, isAdminRole, isSalesRole, roleId } = useAuthAccess()
  const isAccountingUser = isAdminRole || isAccountant
  const isSalesUser = isAdminRole || isSalesRole || roleId === ROLE_ID.SALES_MANAGER
  const canEditSellingGrid = Boolean(token && isSalesUser)
  
  const [tab, setTab] = useState('selling')
  const [expanded, setExpanded] = useState(() => new Set())
  const [sectionMetaByBucket, setSectionMetaByBucket] = useState({})
  const [customSectionDefs, setCustomSectionDefs] = useState([])
  const [pendingOtherByBucket, setPendingOtherByBucket] = useState({})
  const [addRowDraftByBucket, setAddRowDraftByBucket] = useState({})
  const [batchSavingBucket, setBatchSavingBucket] = useState(null)
  const [finBanner, setFinBanner] = useState(null)
  const [notifySending, setNotifySending] = useState(false)
  const [groupDraftByKey, setGroupDraftByKey] = useState({})
  const [deletedIdsByBucket, setDeletedIdsByBucket] = useState({})
  const [deletedDraftRowKeysByBucket, setDeletedDraftRowKeysByBucket] = useState({})
  const bucketSaveModelsRef = useRef({})

  const [clientInvoice, setClientInvoice] = useState(null)
  const [clientInvoicesList, setClientInvoicesList] = useState([])
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [pricingSaving, setPricingSaving] = useState(false)
  const [tabBRows, setTabBRows] = useState([])
  const [handlingRow, setHandlingRow] = useState({ include: true, number_of_containers: 1, handling_fee_per_container: '', currency: 'USD' })
  const [deletedSellIds, setDeletedSellIds] = useState(() => new Set())
  const [currentInvoiceId, setCurrentInvoiceId] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [bankAccounts, setBankAccounts] = useState([])
  const [paymentSaving, setPaymentSaving] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    currency: 'USD',
    method: 'bank_transfer',
    bank_account_id: '',
    paid_at: new Date().toISOString().slice(0, 10),
    reference: '',
  })

  const [activityRows, setActivityRows] = useState([])
  const [activityLoading, setActivityLoading] = useState(false)

  const [currencies, setCurrencies] = useState([])
  const [renamingReceiptId, setRenamingReceiptId] = useState(null)
  const [renamingReceiptValue, setRenamingReceiptValue] = useState('')
  const [receiptActionId, setReceiptActionId] = useState(null)
  const [sectionAttachmentRefs, setSectionAttachmentRefs] = useState({})
  const pendingRowSeqRef = useRef(0)
  const [savingAllDraft, setSavingAllDraft] = useState(false)
  const [savingSectionId, setSavingSectionId] = useState(null)
  const editMode = Boolean(token && canManageExpenses && shipment?.bl_number?.trim() && shipment?.id)
  const vendorsBySection = useMemo(() => {
    const list = Array.isArray(vendors) ? vendors : []
    const normalize = (v) => String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
    const sectionTypeMap = {
      shipping: ['shipping_line', 'shipping', 'line', 'shippingline'],
      inland: ['inland_transport', 'inland', 'transport', 'contractor', 'trucker'],
      customs: ['customs_clearance', 'customs', 'broker', 'customs_broker'],
      insurance: ['insurance', 'insurer', 'insurance_company'],
    }
    return Object.fromEntries(
      Object.entries(sectionTypeMap).map(([sectionId, aliases]) => {
        const filtered = list.filter((v) => aliases.includes(normalize(v?.type)))
        return [sectionId, filtered]
      })
    )
  }, [vendors])

  useEffect(() => {
    if (open && shipment?.id != null) {
      setTab(isAccountingUser ? 'expenses' : 'selling')
      setExpanded(new Set())
      setSectionMetaByBucket(sectionMeta || {})
      setCustomSectionDefs([])
      setPendingOtherByBucket({})
      setGroupDraftByKey({})
      setDeletedIdsByBucket({})
      setDeletedDraftRowKeysByBucket({})
      setFinBanner(null)
      setClientInvoice(null)
      setClientInvoicesList([])
      setCurrentInvoiceId(null)
      setTabBRows([])
      setHandlingRow({ include: true, number_of_containers: 1, handling_fee_per_container: '', currency: 'USD' })
      setDeletedSellIds(new Set())
      setActivityRows([])
      setRenamingReceiptId(null)
      setRenamingReceiptValue('')
      setReceiptActionId(null)
      const normalizedRefs = {}
      Object.entries(attachmentRefs || {}).forEach(([bucketId, list]) => {
        normalizedRefs[bucketId] = (Array.isArray(list) ? list : []).map((ref, idx) => ({
          id: ref?.id || `att-${bucketId}-${idx}-${Date.now()}`,
          name: ref?.name || 'attachment',
          size: Number(ref?.size || 0),
          type: ref?.type || null,
          uploaded_at: ref?.uploaded_at || new Date().toISOString(),
          object_url: ref?.object_url || null,
        }))
      })
      setSectionAttachmentRefs(normalizedRefs)

      if (token) {
        listCurrencies(token).then(setCurrencies).catch(() => setCurrencies([]))
        listBankAccounts(token).then((res) => setBankAccounts(Array.isArray(res?.data) ? res.data : [])).catch(() => setBankAccounts([]))
      }
    }
  }, [open, shipment?.id, isAccountingUser, token, attachmentRefs, sectionMeta])

  const [categoriesByCode, setCategoriesByCode] = useState({})

  useEffect(() => {
    if (!open || !token || !canManageExpenses) {
      setCategoriesByCode({})
      return
    }
    listExpenseCategories(token)
      .then((res) => {
        const list = res.data ?? []
        const m = {}
        if (Array.isArray(list)) {
          for (const c of list) {
            if (c.code) m[c.code] = c
          }
        }
        setCategoriesByCode(m)
      })
      .catch(() => setCategoriesByCode({}))
  }, [open, token, canManageExpenses, isAccountingUser])

  const toggleCard = useCallback((id) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const byBucket = useMemo(() => {
    const buckets = { shipping: [], inland: [], customs: [], insurance: [], other: [] }
    for (const ex of expenses) {
      const explicitBucket = String(ex?.bucket_id || '').trim()
      const key = explicitBucket !== '' ? explicitBucket : expenseBucket(ex)
      if (!buckets[key]) buckets[key] = []
      buckets[key].push(ex)
    }
    for (const key of Object.keys(buckets)) {
      buckets[key] = buckets[key]
        .slice()
        .sort(
          (a, b) =>
            Number(a?.order_index ?? Number.MAX_SAFE_INTEGER) - Number(b?.order_index ?? Number.MAX_SAFE_INTEGER)
            || Number(a?.id || 0) - Number(b?.id || 0)
        )
    }
    return buckets
  }, [expenses])

  useEffect(() => {
    const dynamicKeys = Object.keys(byBucket).filter((k) => !['shipping', 'inland', 'customs', 'insurance', 'other'].includes(k))
    if (dynamicKeys.length === 0) return
    setCustomSectionDefs((prev) => {
      const known = new Set(prev.map((d) => d.id))
      const add = dynamicKeys
        .filter((k) => !known.has(k))
        .map((k) => ({ id: k, title: String(k).replace(/^custom-/, '').replace(/-/g, ' ') || 'Custom Section' }))
      return add.length ? [...prev, ...add] : prev
    })
  }, [byBucket])

  const totalsByCurrencyAll = useMemo(() => {
    const deletedIds = new Set(Object.values(deletedIdsByBucket).flatMap((s) => Array.from(s || [])))
    const draftByExpenseId = {}
    Object.entries(groupDraftByKey || {}).forEach(([rowKey, draft]) => {
      const marker = '::id::'
      const idx = rowKey.indexOf(marker)
      if (idx < 0) return
      const id = Number(rowKey.slice(idx + marker.length))
      if (!Number.isFinite(id)) return
      draftByExpenseId[id] = draft
    })

    const rows = []
    expenses.forEach((ex) => {
      if (deletedIds.has(ex.id)) return
      const draft = draftByExpenseId[ex.id] || {}
      const amount = Number(draft.amount ?? ex.amount) || 0
      const currency = (draft.currency || ex.currency_code || 'USD').toUpperCase()
      rows.push({ amount, currency_code: currency })
    })
    Object.values(pendingOtherByBucket || {}).forEach((list) => {
      ;(list || []).forEach((line) => {
        const amount = Number(line.amount) || 0
        if (amount <= 0) return
        rows.push({ amount, currency_code: (line.currency || 'USD').toUpperCase() })
      })
    })
    return sumByCurrency(rows)
  }, [expenses, deletedIdsByBucket, groupDraftByKey, pendingOtherByBucket])

  const draftByExpenseId = useMemo(() => {
    const map = {}
    Object.entries(groupDraftByKey || {}).forEach(([rowKey, draft]) => {
      const marker = '::id::'
      const idx = rowKey.indexOf(marker)
      if (idx < 0) return
      const id = Number(rowKey.slice(idx + marker.length))
      if (!Number.isFinite(id)) return
      map[id] = draft
    })
    return map
  }, [groupDraftByKey])

  const netBreakdownStr = useMemo(
    () => formatOrderedCurrencyMap(totalsByCurrencyAll, formatMoney, numberLocale),
    [totalsByCurrencyAll, numberLocale]
  )

  const patchGroupDraft = useCallback((rowKey, patch) => {
    setGroupDraftByKey((prev) => ({ ...prev, [rowKey]: { ...(prev[rowKey] || {}), ...patch } }))
  }, [])

  const saveBucketBatch = useCallback(
    async (bucketId) => {
      const models = bucketSaveModelsRef.current[bucketId] || []
      const deletedIds = Array.from(deletedIdsByBucket[bucketId] || [])
      setBatchSavingBucket(bucketId)
      try {
        for (const id of deletedIds) {
          await deleteExpense(token, id)
        }

        for (const model of models) {
          if (!model.categoryId) {
            throw new Error(t('shipments.fin.errorNoCategory'))
          }
          const draft = {
            desc: model.initialDesc,
            amount: model.initialAmount,
            currency: model.initialCurrency,
            ...(groupDraftByKey[model.rowKey] || {}),
          }
          const descTrimmed = String(draft.desc || '').trim()
          const amountRaw = String(draft.amount ?? '').trim()
          if (!model.expenseId && descTrimmed === '' && amountRaw === '') continue
          const amt = Number(draft.amount)
          if (Number.isNaN(amt) || amt < 0) {
            throw new Error(t('shipments.fin.errorInvalidAmount'))
          }
          const builtDescription = descTrimmed
          if (model.expenseId) {
            await updateExpense(token, model.expenseId, {
              description: builtDescription,
              amount: amt,
              currency_code: draft.currency || 'USD',
              expense_date: model.expenseDate || new Date().toISOString().slice(0, 10),
              vendor_id: model.vendorId || undefined,
            })
          } else {
            await createExpense(token, {
              type: 'shipment',
              shipment_id: shipment.id,
              expense_category_id: model.categoryId,
              description: builtDescription,
              amount: amt,
              currency_code: draft.currency || 'USD',
              expense_date: new Date().toISOString().slice(0, 10),
              vendor_id: undefined,
            })
          }
        }

        const pendingRows = pendingOtherByBucket[bucketId] || []
        for (const line of pendingRows) {
          const desc = String(line.desc || '').trim()
          const amountRaw = String(line.amount || '').trim()
          if (!desc && !amountRaw) continue
          const amountNum = Number(line.amount)
          if (Number.isNaN(amountNum) || amountNum < 0) {
            throw new Error(t('shipments.fin.errorInvalidAmount'))
          }
          const categoryCode = otherLineCategoryCode(bucketId)
          const categoryMeta = categoriesByCode[categoryCode]
          if (!categoryMeta?.id) throw new Error(t('shipments.fin.errorNoCategory'))
          await createExpense(token, {
            type: 'shipment',
            shipment_id: shipment.id,
            expense_category_id: categoryMeta.id,
            description: desc || t('shipments.fin.descPlaceholder'),
            amount: amountNum,
            currency_code: line.currency || 'USD',
            expense_date: new Date().toISOString().slice(0, 10),
            vendor_id: undefined,
          })
        }
        setPendingOtherByBucket((prev) => ({ ...prev, [bucketId]: [] }))

        setDeletedIdsByBucket((prev) => ({ ...prev, [bucketId]: new Set() }))
        setDeletedDraftRowKeysByBucket((prev) => ({ ...prev, [bucketId]: new Set() }))
        onExpensesChanged?.()
        setFinBanner({ type: 'success', message: t('shipments.fin.batchSaved') })
      } catch (e) {
        setFinBanner({ type: 'error', message: e?.message || t('shipments.fin.errorSaveLine') })
      } finally {
        setBatchSavingBucket(null)
      }
    },
    [deletedIdsByBucket, groupDraftByKey, onExpensesChanged, shipment?.id, t, token, pendingOtherByBucket, categoriesByCode]
  )

  const addPendingOtherLine = useCallback((bucketId, initial = {}) => {
    setPendingOtherByBucket((prev) => {
      const list = [...(prev[bucketId] || [])]
      pendingRowSeqRef.current += 1
      list.push({
        tempId: `t-${Date.now()}-${pendingRowSeqRef.current}`,
        desc: initial.desc || '',
        amount: initial.amount || '',
        currency: initial.currency || 'USD',
      })
      return { ...prev, [bucketId]: list }
    })
  }, [])

  const patchAddRowDraft = useCallback((bucketId, patch) => {
    setAddRowDraftByBucket((prev) => ({
      ...prev,
      [bucketId]: { desc: '', currency: 'USD', ...(prev[bucketId] || {}), ...patch },
    }))
  }, [])

  const addPendingFromDraft = useCallback((bucketId) => {
    const draft = addRowDraftByBucket[bucketId] || { desc: '', currency: 'USD' }
    const desc = String(draft.desc || '').trim()
    if (!desc) return
    addPendingOtherLine(bucketId, { desc, currency: draft.currency || 'USD' })
    setAddRowDraftByBucket((prev) => ({
      ...prev,
      [bucketId]: { ...(prev[bucketId] || {}), desc: '' },
    }))
  }, [addPendingOtherLine, addRowDraftByBucket])

  const removePendingOtherLine = useCallback((bucketId, tempId) => {
    setPendingOtherByBucket((prev) => ({
      ...prev,
      [bucketId]: (prev[bucketId] || []).filter((l) => l.tempId !== tempId),
    }))
  }, [])

  const patchPendingOtherLine = useCallback((bucketId, tempId, patch) => {
    setPendingOtherByBucket((prev) => ({
      ...prev,
      [bucketId]: (prev[bucketId] || []).map((l) => (l.tempId === tempId ? { ...l, ...patch } : l)),
    }))
  }, [])

  const handleDownloadReceipt = useCallback(async (expenseId) => {
    if (!token) return
    try {
      const { blob, filename } = await downloadExpenseReceipt(token, expenseId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      setFinBanner({ type: 'error', message: err.message || t('shipments.fin.errorReceipt') })
    }
  }, [token, t])

  const openBlobInNewTab = useCallback((blob) => {
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener,noreferrer')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }, [])

  const handleViewReceipt = useCallback(async (expenseId) => {
    if (!token) return
    try {
      const { blob } = await downloadExpenseReceipt(token, expenseId)
      openBlobInNewTab(blob)
    } catch (err) {
      setFinBanner({ type: 'error', message: err.message || t('shipments.fin.errorReceipt') })
    }
  }, [token, t, openBlobInNewTab])

  const receiptNameFromExpense = useCallback((expense) => {
    if (expense?.receipt_name) return String(expense.receipt_name)
    if (expense?.receipt_path) {
      const p = String(expense.receipt_path)
      const parts = p.split('/')
      return parts[parts.length - 1] || p
    }
    return expense?.description?.trim() || `receipt-${expense?.id || ''}`
  }, [])

  const receiptBaseNameFromExpense = useCallback((expense) => {
    const full = receiptNameFromExpense(expense)
    const dotIdx = full.lastIndexOf('.')
    return dotIdx > 0 ? full.slice(0, dotIdx) : full
  }, [receiptNameFromExpense])

  const startRenameReceipt = useCallback((expense) => {
    setRenamingReceiptId(expense.id)
    setRenamingReceiptValue(receiptBaseNameFromExpense(expense))
  }, [receiptBaseNameFromExpense])

  const cancelRenameReceipt = useCallback(() => {
    setRenamingReceiptId(null)
    setRenamingReceiptValue('')
  }, [])

  const saveRenameReceipt = useCallback(async (expenseId) => {
    if (!token || !expenseId) return
    const clean = (renamingReceiptValue || '').trim()
    if (!clean) return
    setReceiptActionId(expenseId)
    try {
      await renameExpenseReceipt(token, expenseId, clean)
      onExpensesChanged?.()
      setFinBanner({ type: 'success', message: t('shipments.fin.receiptRenamed') || 'Receipt renamed.' })
      cancelRenameReceipt()
    } catch (err) {
      setFinBanner({ type: 'error', message: err.message || t('shipments.fin.errorReceiptRename') })
    } finally {
      setReceiptActionId(null)
    }
  }, [token, renamingReceiptValue, onExpensesChanged, t, cancelRenameReceipt])

  const handleDeleteReceipt = useCallback(async (expenseId) => {
    if (!token || !expenseId) return
    if (!window.confirm(t('shipments.fin.confirmDeleteReceipt') || 'Delete this attachment?')) return
    setReceiptActionId(expenseId)
    try {
      await deleteExpenseReceipt(token, expenseId)
      onExpensesChanged?.()
      setFinBanner({ type: 'success', message: t('shipments.fin.receiptDeleted') || 'Attachment deleted.' })
    } catch (err) {
      setFinBanner({ type: 'error', message: err.message || t('shipments.fin.errorReceiptDelete') })
    } finally {
      setReceiptActionId(null)
    }
  }, [token, onExpensesChanged, t])

  const handleSectionUpload = useCallback(async (bucketId, e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setBatchSavingBucket(bucketId)
    try {
      const objectUrl = URL.createObjectURL(file)
      setSectionAttachmentRefs((prev) => ({
        ...prev,
        [bucketId]: [
          ...(prev[bucketId] || []),
          {
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            size: file.size,
            type: file.type || null,
            uploaded_at: new Date().toISOString(),
            object_url: objectUrl,
          },
        ],
      }))
      setFinBanner({ type: 'success', message: t('shipments.fin.receiptUploaded') })
    } catch (err) {
      setFinBanner({ type: 'error', message: err.message || t('shipments.fin.errorReceipt') })
    } finally {
      setBatchSavingBucket(null)
    }
  }, [t])

  const handleNotifySales = useCallback(async () => {
    if (!token || !shipment?.id) return
    setNotifySending(true)
    try {
      await notifyShipmentSalesFinancials(token, shipment.id, { invoice_action: 'updated' })
      setFinBanner({ type: 'success', message: t('shipments.fin.notifySalesOk') })
    } catch (e) {
      setFinBanner({ type: 'error', message: e?.message || t('shipments.fin.notifySalesFail') })
    } finally {
      setNotifySending(false)
    }
  }, [token, shipment?.id, t])

  const buildCostInvoiceItemsFromForm = useCallback(
    (targetSections /* null = all sections */) => {
      const sections = [...BUCKET_DEFS.map((d) => d.id), 'other', ...customSectionDefs.map((s) => s.id)]
      const items = []
      let orderIndex = 0
      let inlandItemsCount = 0
      let customsItemsCount = 0

      for (const sectionId of sections) {
        if (targetSections && !targetSections.has(sectionId)) continue

        const deletedIds = new Set(Array.from(deletedIdsByBucket[sectionId] || []))
        const models = bucketSaveModelsRef.current[sectionId] || []

        for (const model of models) {
          if (model.expenseId && deletedIds.has(model.expenseId)) continue
          const draft = {
            desc: model.initialDesc,
            amount: model.initialAmount,
            currency: model.initialCurrency,
            ...(groupDraftByKey[model.rowKey] || {}),
          }
          const desc = String(draft.desc || '').trim()
          const amount = Number(draft.amount)
          if (desc === '' && String(draft.amount ?? '').trim() === '') continue
          if (String(model.tplId || '').toLowerCase() === 'other' && desc === '') {
            throw new Error(t('shipments.fin.descPlaceholder'))
          }
          if (Number.isNaN(amount) || amount < 0) {
            throw new Error(t('shipments.fin.errorInvalidAmount'))
          }
          if (amount <= 0) continue
          const rowParts = String(model.rowKey || '').split('::')
          const templateId = rowParts[1] || null
          const rawLine =
            model.lineId != null && model.lineId !== ''
              ? model.lineId
              : model.expenseId
          const lineIdNum = Number(rawLine)
          const lineId =
            Number.isFinite(lineIdNum)
            && lineIdNum > 0
            && !String(rawLine).startsWith('tmp-')
            && !String(rawLine).startsWith('ci-row-')
            && !String(rawLine).startsWith('no-line-')
              ? lineIdNum
              : undefined
          items.push({
            line_id: lineId,
            bucket_id: sectionId,
            template_id: templateId,
            title: desc,
            amount,
            currency_code: (draft.currency || 'USD').toUpperCase(),
            vendor_id:
              model.vendorId
              || (sectionId === 'inland' ? (sectionMetaByBucket.inland?.contractor_vendor_id || undefined) : undefined)
              || (sectionId === 'customs' ? (sectionMetaByBucket.customs?.customs_broker_vendor_id || undefined) : undefined)
              || (sectionId === 'insurance' ? (sectionMetaByBucket.insurance?.insurance_company_vendor_id || undefined) : undefined),
            expense_category_id: model.categoryId || undefined,
            expense_date: model.expenseDate || new Date().toISOString().slice(0, 10),
            order_index: orderIndex++,
          })
          if (sectionId === 'inland') inlandItemsCount += 1
          if (sectionId === 'customs') customsItemsCount += 1
        }

        const pendingRows = pendingOtherByBucket[sectionId] || []
        for (const line of pendingRows) {
          const desc = String(line.desc || '').trim()
          const amount = Number(line.amount)
          if (desc === '' && String(line.amount ?? '').trim() === '') continue
          if (desc === '') {
            throw new Error(t('shipments.fin.descPlaceholder'))
          }
          if (Number.isNaN(amount) || amount < 0) {
            throw new Error(t('shipments.fin.errorInvalidAmount'))
          }
          if (amount <= 0) continue
          items.push({
            bucket_id: sectionId,
            template_id: 'other',
            title: desc,
            amount,
            currency_code: (line.currency || 'USD').toUpperCase(),
            vendor_id:
              (sectionId === 'inland' ? (sectionMetaByBucket.inland?.contractor_vendor_id || undefined) : undefined)
              || (sectionId === 'customs' ? (sectionMetaByBucket.customs?.customs_broker_vendor_id || undefined) : undefined)
              || (sectionId === 'insurance' ? (sectionMetaByBucket.insurance?.insurance_company_vendor_id || undefined) : undefined),
            expense_date: new Date().toISOString().slice(0, 10),
            order_index: orderIndex++,
          })
          if (sectionId === 'inland') inlandItemsCount += 1
          if (sectionId === 'customs') customsItemsCount += 1
        }
      }

      return { items, inlandItemsCount, customsItemsCount }
    },
    [deletedIdsByBucket, groupDraftByKey, pendingOtherByBucket, customSectionDefs, sectionMetaByBucket, t]
  )

  const persistCostInvoicePayload = useCallback(
    async (items, { notifySales }) => {
      await updateShipmentCostInvoice(token, shipment.id, {
        status: 'draft',
        notify_sales_financial: notifySales,
        items,
        attachment_refs: Object.fromEntries(
          Object.entries(sectionAttachmentRefs || {}).map(([bucketId, list]) => [
            bucketId,
            (list || []).map((a) => ({
              id: a.id,
              name: a.name,
              size: a.size,
              type: a.type,
              uploaded_at: a.uploaded_at,
            })),
          ])
        ),
        section_meta: sectionMetaByBucket,
      })
    },
    [token, shipment?.id, sectionAttachmentRefs, sectionMetaByBucket]
  )

  const handleSaveAllDraft = useCallback(async () => {
    if (!editMode || savingAllDraft || !token || !shipment?.id) return
    setSavingAllDraft(true)
    try {
      const { items, inlandItemsCount, customsItemsCount } = buildCostInvoiceItemsFromForm(null)

      const inlandStarted = inlandItemsCount > 0 || Boolean(sectionMetaByBucket.inland?.contractor_vendor_id)
      const customsStarted = customsItemsCount > 0 || Boolean(sectionMetaByBucket.customs?.customs_broker_vendor_id)

      if (inlandStarted && !Number(sectionMetaByBucket.inland?.contractor_vendor_id || 0)) {
        throw new Error(t('shipments.fin.inlandContractorRequired'))
      }
      if (inlandStarted && inlandItemsCount < 1) {
        throw new Error(t('shipments.fin.inlandAtLeastOneItem', { defaultValue: 'Inland Transportation requires at least one line item.' }))
      }
      if (customsStarted && !Number(sectionMetaByBucket.customs?.customs_broker_vendor_id || 0)) {
        throw new Error(t('shipments.fin.customsBrokerRequired', { defaultValue: 'Customs broker name is required for Customs Clearance' }))
      }
      if (customsStarted && customsItemsCount < 1) {
        throw new Error(t('shipments.fin.customsAtLeastOneItem', { defaultValue: 'Customs Clearance requires at least one line item.' }))
      }

      await persistCostInvoicePayload(items, { notifySales: true })

      setPendingOtherByBucket({})
      setDeletedIdsByBucket({})
      setDeletedDraftRowKeysByBucket({})
      setGroupDraftByKey({})
      onExpensesChanged?.()
      onShipmentTotalsRefresh?.()
      setFinBanner({ type: 'success', message: t('shipments.fin.batchSaved') })
    } catch (e) {
      setFinBanner({ type: 'error', message: e?.message || t('shipments.fin.errorSaveLine') })
    } finally {
      setSavingAllDraft(false)
    }
  }, [
    editMode,
    savingAllDraft,
    token,
    shipment?.id,
    sectionMetaByBucket,
    buildCostInvoiceItemsFromForm,
    persistCostInvoicePayload,
    t,
    onExpensesChanged,
    onShipmentTotalsRefresh,
  ])

  const handleSaveSectionDraft = useCallback(
    async (sectionId) => {
      if (!editMode || !token || !shipment?.id || savingAllDraft) return
      setSavingSectionId(sectionId)
      try {
        const { items: sectionItems, inlandItemsCount, customsItemsCount } = buildCostInvoiceItemsFromForm(new Set([sectionId]))

        if (sectionId === 'inland') {
          const inlandStarted = inlandItemsCount > 0 || Boolean(sectionMetaByBucket.inland?.contractor_vendor_id)
          if (inlandStarted && !Number(sectionMetaByBucket.inland?.contractor_vendor_id || 0)) {
            throw new Error(t('shipments.fin.inlandContractorRequired'))
          }
          if (inlandStarted && inlandItemsCount < 1) {
            throw new Error(
              t('shipments.fin.inlandAtLeastOneItem', { defaultValue: 'Inland Transportation requires at least one line item.' })
            )
          }
        }
        if (sectionId === 'customs') {
          const customsStarted = customsItemsCount > 0 || Boolean(sectionMetaByBucket.customs?.customs_broker_vendor_id)
          if (customsStarted && !Number(sectionMetaByBucket.customs?.customs_broker_vendor_id || 0)) {
            throw new Error(t('shipments.fin.customsBrokerRequired', { defaultValue: 'Customs broker name is required for Customs Clearance' }))
          }
          if (customsStarted && customsItemsCount < 1) {
            throw new Error(
              t('shipments.fin.customsAtLeastOneItem', { defaultValue: 'Customs Clearance requires at least one line item.' })
            )
          }
        }

        const invRes = await getShipmentCostInvoice(token, shipment.id)
        const existingItems = Array.isArray(invRes?.data?.items) ? invRes.data.items : []
        const sid = String(sectionId)
        const others = existingItems.filter((it) => String(it.bucket_id || 'other') !== sid)
        const merged = [...others, ...sectionItems].map((it, idx) => ({
          ...it,
          order_index: idx,
        }))

        await persistCostInvoicePayload(merged, { notifySales: false })

        setPendingOtherByBucket((p) => ({ ...p, [sectionId]: [] }))
        setDeletedIdsByBucket((p) => {
          const next = { ...p }
          delete next[sectionId]
          return next
        })
        setDeletedDraftRowKeysByBucket((p) => {
          const next = { ...p }
          delete next[sectionId]
          return next
        })
        setGroupDraftByKey((p) => {
          const next = { ...p }
          const prefix = `${sectionId}::`
          for (const k of Object.keys(next)) {
            if (k.startsWith(prefix)) delete next[k]
          }
          return next
        })

        onExpensesChanged?.()
        onShipmentTotalsRefresh?.()
        setFinBanner({ type: 'success', message: t('shipments.fin.sectionSaved', { defaultValue: 'Section saved.' }) })
      } catch (e) {
        setFinBanner({ type: 'error', message: e?.message || t('shipments.fin.errorSaveLine') })
      } finally {
        setSavingSectionId(null)
      }
    },
    [
      editMode,
      token,
      shipment?.id,
      savingAllDraft,
      buildCostInvoiceItemsFromForm,
      persistCostInvoicePayload,
      sectionMetaByBucket,
      t,
      onExpensesChanged,
      onShipmentTotalsRefresh,
    ]
  )

  const canAccessInvoices = Boolean(token && (canManageFinancial || canViewSelling))

  useEffect(() => {
    if (!open || !shipment?.id || !token || !canAccessInvoices) return undefined
    if (tab !== 'selling' && tab !== 'summary') return undefined
    let cancelled = false
    setInvoiceLoading(true)
    listInvoices(token, { shipment_id: shipment.id, invoice_type: 'client' })
      .then(({ data }) => {
        if (cancelled) return undefined
        const list = Array.isArray(data) ? data : []
        setClientInvoicesList(list)
        const draft = list.find((i) => i.status === 'draft')
        const pick = draft || list[0]
        if (!pick?.id) {
          setClientInvoice(null)
          setCurrentInvoiceId(null)
          return undefined
        }
        return getInvoice(token, pick.id).then((full) => {
          if (!cancelled) {
            setClientInvoice(full)
            setCurrentInvoiceId(full?.id || pick.id || null)
          }
        })
      })
      .catch(() => {
        if (!cancelled) setClientInvoicesList([])
        if (!cancelled) {
          setClientInvoice(null)
          setCurrentInvoiceId(null)
        }
      })
      .finally(() => {
        if (!cancelled) setInvoiceLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, shipment?.id, token, tab, canAccessInvoices])

  useEffect(() => {
    if (!open || !shipment?.id || !token || tab !== 'history') return undefined
    let cancelled = false
    setActivityLoading(true)
    listActivitiesBySubject(token, { subjectType: 'shipment', subjectId: shipment.id })
      .then(({ data }) => {
        if (!cancelled) setActivityRows(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setActivityRows([])
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, shipment?.id, token, tab])

  useEffect(() => {
    if (!expenses.length) {
      setTabBRows([])
      setHandlingRow({ include: true, number_of_containers: 1, handling_fee_per_container: '', currency: 'USD' })
      return
    }
    const items = clientInvoice?.items || []
    const handlingItem =
      items.find((it) => String(it.source_key || '') === 'handling-fee') ||
      items.find((it) => it.description === HANDLING_FEE_DESCRIPTION)
    setHandlingRow({
      include: handlingItem ? Number(handlingItem.quantity) > 0 : true,
      number_of_containers: handlingItem != null ? Number(handlingItem.quantity || 1) : Number(shipment?.container_count || 1),
      handling_fee_per_container: handlingItem != null ? String(handlingItem.unit_price ?? '') : '',
      currency: (handlingItem?.currency_code || clientInvoice?.currency_code || 'USD').toUpperCase(),
    })
    setDeletedSellIds(new Set())
    const isReefer = Boolean(shipment?.is_reefer)
    setTabBRows(
      expenses.map((ex) => {
        const feeName = resolveCostItemStyleFeeNameFromExpense(ex, t, isReefer)
        const sourceKey = `expense:${ex.id}`
        const match =
          items.find((it) => String(it.source_key || '') === sourceKey) ||
          items.find((it) => it.description === feeName)
        const cost = Number(ex.amount) || 0
        const sellVal = match != null ? Number(match.unit_price) : cost
        const qtyVal = (ex.bucket_id || expenseBucket(ex)) === 'insurance'
          ? 1
          : (match != null ? Math.max(1, Number(match.quantity || 1)) : 1)
        const include = match ? Number(match.quantity) > 0 : true
        return {
          expenseId: ex.id,
          source_key: sourceKey,
          bucket_id: ex.bucket_id || expenseBucket(ex),
          template_id: ex.template_id || null,
          expense_title: ex.title || '',
          expense_description: ex.description || '',
          invoice_number: ex.invoice_number,
          label: feeName,
          description: match?.description || feeName,
          category_name: ex.category_name || '—',
          cost,
          currency: (match?.currency_code || ex.currency_code || 'USD').toUpperCase(),
          quantity: qtyVal,
          unit_price: Number.isNaN(sellVal) ? '' : String(sellVal),
          include,
        }
      })
    )
  }, [expenses, clientInvoice, shipment?.container_count, shipment?.is_reefer, t])

  const savePricingInvoice = useCallback(async () => {
    if (!token || !shipment?.id) return
    if (!shipment.client_id) {
      setFinBanner({ type: 'error', message: t('shipments.fin.invoiceNoClient') })
      return
    }
    const curCode = (clientInvoice?.currency_code || expenses[0]?.currency_code || 'USD').toUpperCase()
    const foundCurrency = currencies.find(c => c.code === curCode)
    const currencyId = foundCurrency?.id || 1
    const items = []
    const isReefer = Boolean(shipment?.is_reefer)
    for (const [idx, row] of tabBRows.entries()) {
      if (String(row.expenseId || '').startsWith('tmp-')) continue
      if (deletedSellIds.has(row.expenseId)) continue
      if (!row.include) continue
      const sell = Number(row.unit_price)
      const qty = (row.bucket_id || 'other') === 'insurance' ? 1 : Math.max(1, Number(row.quantity || 1))
      if (Number.isNaN(sell) || sell < 0) continue
      const cost = Number(row.cost) || 0
      const feeName = resolveCostItemStyleFeeNameFromRow(row, t, isReefer)
      items.push({
        description: feeName,
        title: feeName,
        quantity: qty,
        unit_price: sell,
        currency_code: (row.currency || 'USD').toUpperCase(),
        section_key: row.bucket_id || 'other',
        order_index: idx,
        source_key: row.source_key || `expense:${row.expenseId}`,
        cost_unit_price: qty > 0 ? cost / qty : cost,
        cost_line_total: cost,
      })
    }
    if (handlingRow.include) {
      const qty = Math.max(1, Number(handlingRow.number_of_containers) || 1)
      const h = Number(handlingRow.handling_fee_per_container)
      if (!Number.isNaN(h) && h >= 0) {
        items.push({
          description: HANDLING_FEE_DESCRIPTION,
          title: HANDLING_FEE_DESCRIPTION,
          quantity: qty,
          unit_price: h,
          currency_code: (handlingRow.currency || 'USD').toUpperCase(),
          section_key: 'handling',
          order_index: tabBRows.length + 1,
          source_key: 'handling-fee',
          cost_unit_price: 0,
          cost_line_total: 0,
        })
      }
    }
    if (items.length === 0) {
      setFinBanner({ type: 'error', message: t('shipments.fin.pricingNoLines') })
      return
    }
    setPricingSaving(true)
    try {
      let inv = clientInvoice
      const existingInvoice = currentInvoiceId
        ? { id: currentInvoiceId, status: (clientInvoice?.status || 'draft') }
        : (inv?.id
          ? inv
          : (clientInvoicesList.find((i) => i.status === 'draft') || clientInvoicesList[0] || null))

      if (!existingInvoice?.id) {
        inv = await createInvoice(token, {
          invoice_type_id: 0,
          shipment_id: shipment.id,
          client_id: shipment.client_id,
          issue_date: new Date().toISOString().slice(0, 10),
          currency_id: currencyId,
          items,
        })
      } else if (existingInvoice.status === 'draft' || existingInvoice.status === 'issued') {
        inv = await updateInvoice(token, existingInvoice.id, { items })
      } else {
        setFinBanner({ type: 'error', message: t('shipments.fin.pricingNotDraft') })
        return
      }
      const refreshed = await getInvoice(token, inv.id)
      setClientInvoice(refreshed)
      setCurrentInvoiceId(refreshed?.id || inv.id)
      setClientInvoicesList((prev) => {
        const filtered = (Array.isArray(prev) ? prev : []).filter((r) => r.id !== refreshed.id)
        return [refreshed, ...filtered]
      })
      onShipmentTotalsRefresh?.()
      setFinBanner({ type: 'success', message: t('shipments.fin.pricingSaved') })
      return refreshed
    } catch (e) {
      setFinBanner({ type: 'error', message: e?.message || t('shipments.fin.errorSaveLine') })
      return null
    } finally {
      setPricingSaving(false)
    }
  }, [
    token,
    shipment,
    expenses,
    tabBRows,
    handlingRow,
    deletedSellIds,
    clientInvoice,
    clientInvoicesList,
    currentInvoiceId,
    t,
    onShipmentTotalsRefresh,
    currencies,
  ])

  const handleSaveSalesInvoice = useCallback(async () => {
    if (!token || !shipment?.id) return
    const saved = await savePricingInvoice()
    if (!saved?.id) return
    let finalized = saved
    try {
      if (saved.status === 'draft') {
        finalized = await issueInvoice(token, saved.id)
      }
      const refreshed = await getInvoice(token, finalized.id || saved.id)
      setClientInvoice(refreshed)
      setCurrentInvoiceId(refreshed?.id || finalized.id || saved.id)
      setClientInvoicesList((prev) => {
        const filtered = (Array.isArray(prev) ? prev : []).filter((r) => r.id !== refreshed.id)
        return [refreshed, ...filtered]
      })
      setFinBanner({ type: 'success', message: t('shipments.fin.salesInvoiceFinalized', { defaultValue: 'Sales invoice finalized successfully.' }) })
      await handleNotifySales()
    } catch (e) {
      setFinBanner({ type: 'error', message: e?.message || t('shipments.fin.errorSaveLine') })
    }
  }, [token, shipment?.id, savePricingInvoice, handleNotifySales, t])

  const handleDownloadInvoicePdf = useCallback(async () => {
    if (!token || !clientInvoice?.id) return
    try {
      const { blob, filename } = await downloadInvoicePdf(token, clientInvoice.id)
      const a = document.createElement('a')
      const url = window.URL.createObjectURL(blob)
      a.href = url
      a.download = filename || `invoice-${clientInvoice.id}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (e) {
      setFinBanner({ type: 'error', message: e?.message || t('shipments.fin.errorReceipt') })
    }
  }, [token, clientInvoice?.id, t])

  if (!open || !shipment) return null

  const bl = shipment.bl_number?.trim() || `—`
  const hasBl = Boolean(shipment.bl_number?.trim())
  const isReefer = Boolean(shipment?.is_reefer)
  const invCurrency = clientInvoice?.currency_code || 'USD'

  const polName = shipment?.origin_port?.name || shipment?.originPort?.name || ''
  const podName = shipment?.destination_port?.name || shipment?.destinationPort?.name || ''
  const shipBarRoute = [polName, podName].filter(Boolean).join(' → ') || '—'
  const shipBarLine = shipment?.shipping_line?.name || shipment?.shippingLine?.name || '—'
  const shipBarContainer = shipment?.container_type?.trim() || '—'
  const shipBarCutOff = formatShipBarDate(shipment?.cut_off_date ?? shipment?.booking_date)
  const shipBarSales =
    shipment?.sales_rep?.name || shipment?.salesRep?.name || shipment?.sales_rep_name || '—'

  const patchTabBRow = (idx, patch) => {
    setTabBRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  const editableSectionRows = useCallback(
    (sectionId) =>
      tabBRows.filter((r) => {
        if (deletedSellIds.has(r.expenseId)) return false
        if (String(r.expenseId || '').startsWith('tmp-')) return false
        const bid = r.bucket_id || 'other'
        if (sectionId === 'shipping') return bid === 'shipping' || bid === 'other'
        return bid === sectionId
      }),
    [tabBRows, deletedSellIds]
  )

  const addCustomCostSection = useCallback(() => {
    const title = window.prompt('Section name / اسم القسم')
    if (!title || !title.trim()) return
    const id = `custom-${title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`
    setCustomSectionDefs((prev) => [...prev, { id, title: title.trim() }])
    setPendingOtherByBucket((prev) => ({ ...prev, [id]: prev[id] || [] }))
    setSectionAttachmentRefs((prev) => ({ ...prev, [id]: prev[id] || [] }))
    setExpanded((prev) => new Set([...prev, id]))
  }, [])

  const deleteCustomSection = useCallback((bucketId) => {
    setCustomSectionDefs((prev) => prev.filter((s) => s.id !== bucketId))
    setPendingOtherByBucket((prev) => ({ ...prev, [bucketId]: [] }))
    setSectionAttachmentRefs((prev) => ({ ...prev, [bucketId]: [] }))
    setDeletedIdsByBucket((prev) => {
      const next = { ...prev, [bucketId]: new Set(prev[bucketId] || []) }
      ;(byBucket[bucketId] || []).forEach((r) => {
        if (r?.id) next[bucketId].add(r.id)
      })
      return next
    })
  }, [byBucket])

  const renameSectionAttachment = useCallback((bucketId, attachmentId) => {
    const list = sectionAttachmentRefs[bucketId] || []
    const item = list.find((a) => a.id === attachmentId)
    if (!item) return
    const nextName = window.prompt(t('shipments.fin.renameReceipt'), item.name || '')
    if (!nextName || !nextName.trim()) return
    setSectionAttachmentRefs((prev) => ({
      ...prev,
      [bucketId]: (prev[bucketId] || []).map((a) => (a.id === attachmentId ? { ...a, name: nextName.trim() } : a)),
    }))
  }, [sectionAttachmentRefs, t])

  const deleteSectionAttachment = useCallback((bucketId, attachmentId) => {
    setSectionAttachmentRefs((prev) => ({
      ...prev,
      [bucketId]: (prev[bucketId] || []).filter((a) => a.id !== attachmentId),
    }))
  }, [])

  const canOpenShipmentAttachment = useCallback(
    (att) => {
      if (!att) return false
      if (att.url || att.object_url || att.download_url) return true
      const aid = att.id
      if (aid == null || aid === '' || Number(aid) === 0) return false
      return Boolean(token && shipment?.id)
    },
    [token, shipment?.id]
  )

  const openSectionAttachment = useCallback(
    async (attachment) => {
      const direct = attachment?.url || attachment?.object_url || attachment?.download_url || null
      if (direct) {
        window.open(direct, '_blank', 'noopener,noreferrer')
        return
      }
      const attId = attachment?.id
      const sid = shipment?.id
      if (!token || !sid || attId == null || attId === '' || Number(attId) === 0) {
        setFinBanner({ type: 'error', message: t('shipments.fin.errorReceiptNoUrl') })
        return
      }
      try {
        const { blob } = await downloadShipmentAttachment(token, sid, attId)
        const url = window.URL.createObjectURL(blob)
        window.open(url, '_blank', 'noopener,noreferrer')
        window.setTimeout(() => window.URL.revokeObjectURL(url), 60000)
      } catch (err) {
        setFinBanner({
          type: 'error',
          message: err?.message || t('shipments.fin.errorAttachmentOpen'),
        })
      }
    },
    [token, shipment?.id, t]
  )

  const downloadSectionAttachment = useCallback(
    async (attachment) => {
      const direct = attachment?.url || attachment?.object_url || attachment?.download_url || null
      if (direct) {
        const a = document.createElement('a')
        a.href = direct
        a.download = attachment.name || 'attachment'
        a.rel = 'noopener noreferrer'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        return
      }
      const attId = attachment?.id
      const sid = shipment?.id
      if (!token || !sid || attId == null || attId === '' || Number(attId) === 0) {
        setFinBanner({ type: 'error', message: t('shipments.fin.errorReceiptNoUrl') })
        return
      }
      try {
        const { blob, filename } = await downloadShipmentAttachment(token, sid, attId)
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename || attachment.name || 'attachment'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } catch (err) {
        setFinBanner({
          type: 'error',
          message: err?.message || t('shipments.fin.errorDownload'),
        })
      }
    },
    [token, shipment?.id, t]
  )

  const sellingVisibleRows = useMemo(
    () => tabBRows.filter((r) => !deletedSellIds.has(r.expenseId)),
    [tabBRows, deletedSellIds]
  )

  const sellingSections = useMemo(() => {
    const sectionLabels = {
      shipping: t('shipments.fin.sellingSection.shipping', { defaultValue: 'Shipment Line Cost / تكلفة الشحن البحري' }),
      inland: t('shipments.fin.sellingSection.inland', { defaultValue: 'Inland Transport / النقل البري' }),
      customs: t('shipments.fin.sellingSection.customs', { defaultValue: 'Customs Clearance / التخليص الجمركي' }),
      insurance: t('shipments.fin.sellingSection.insurance', { defaultValue: 'Insurance / التأمين' }),
      handling: t('shipments.fin.sellingSection.handling', { defaultValue: 'Handling Fees / رسوم الخدمة والمتابعة' }),
    }
    const fixed = ['shipping', 'inland', 'customs', 'insurance']
    const apiSections = Array.isArray(clientInvoice?.sections) ? clientInvoice.sections : []
    if (apiSections.length > 0) {
      const mapped = apiSections.map((s) => ({
        id: String(s?.key || 'other'),
        label: sectionLabels[String(s?.key || 'other')] || String(s?.key || 'other'),
        rows: Array.isArray(s?.items) ? s.items : [],
        cost: s?.cost_by_currency || {},
        sell: s?.selling_by_currency || {},
        profit: s?.profit_by_currency || {},
        attachments: Array.isArray(s?.attachments) ? s.attachments : [],
      }))
      // Keep handling rendered by the dedicated handling card below; drop "other" — merged into shipping via editableSectionRows
      const mappedWithoutHandling = mapped.filter((s) => s.id !== 'handling' && s.id !== 'other')
      const byId = new Map(mappedWithoutHandling.map((s) => [s.id, s]))
      const dynamicIds = mappedWithoutHandling.map((s) => s.id).filter((id) => !fixed.includes(id))
      return [...fixed, ...dynamicIds].map((id) =>
        byId.get(id) || { id, label: sectionLabels[id] || id, rows: [], cost: {}, sell: {}, profit: {}, attachments: [] }
      )
    }

    const defs = [
      { id: 'shipping', label: t('shipments.fin.sellingSection.shipping', { defaultValue: 'Shipment Line Cost / تكلفة الشحن البحري' }) },
      { id: 'inland', label: t('shipments.fin.sellingSection.inland', { defaultValue: 'Inland Transport / النقل البري' }) },
      { id: 'customs', label: t('shipments.fin.sellingSection.customs', { defaultValue: 'Customs Clearance / التخليص الجمركي' }) },
      { id: 'insurance', label: t('shipments.fin.sellingSection.insurance', { defaultValue: 'Insurance / التأمين' }) },
    ]
    return defs
      .map((d) => ({
        ...d,
        rows: sellingVisibleRows.filter((r) => {
          const bid = r.bucket_id || 'other'
          if (d.id === 'shipping') return bid === 'shipping' || bid === 'other'
          return bid === d.id
        }),
      }))
      .filter((s) => s.rows.length > 0)
  }, [sellingVisibleRows, t, clientInvoice?.sections])

  const handlingTotal = useMemo(() => {
    if (!handlingRow.include) return 0
    const qty = Math.max(1, Number(handlingRow.number_of_containers) || 1)
    const per = Number(handlingRow.handling_fee_per_container) || 0
    return qty * per
  }, [handlingRow])

  const sectionCurrencyTotals = useCallback(
    (rows) => {
      const costRows = []
      const sellRows = []
      ;(rows || []).forEach((r) => {
        const cur = (r.currency || 'USD').toUpperCase()
        const c = Number(r.cost) || 0
        const s = (Number(r.unit_price) || 0) * Math.max(1, Number(r.quantity || 1))
        if (c > 0) costRows.push({ amount: c, currency_code: cur })
        if (s > 0) sellRows.push({ amount: s, currency_code: cur })
      })
      const cost = sumByCurrency(costRows)
      const sell = sumByCurrency(sellRows)
      const profit = {}
      const keys = new Set([...Object.keys(cost), ...Object.keys(sell)])
      keys.forEach((k) => {
        profit[k] = (Number(sell[k]) || 0) - (Number(cost[k]) || 0)
      })
      return { cost, sell, profit }
    },
    []
  )

  const sellingTotalsByCurrency = useMemo(() => {
    const costRows = []
    const sellRows = []
    sellingVisibleRows.forEach((r) => {
      if (!r.include) return
      const cur = (r.currency || 'USD').toUpperCase()
      const c = Number(r.cost) || 0
      const s = (Number(r.unit_price) || 0) * Math.max(1, Number(r.quantity || 1))
      if (c > 0) costRows.push({ amount: c, currency_code: cur })
      if (s > 0) sellRows.push({ amount: s, currency_code: cur })
    })
    if (handlingTotal > 0) {
      sellRows.push({ amount: handlingTotal, currency_code: (handlingRow.currency || 'USD').toUpperCase() })
    }
    const cost = sumByCurrency(costRows)
    const sell = sumByCurrency(sellRows)
    const profit = {}
    const keys = new Set([...Object.keys(cost), ...Object.keys(sell)])
    keys.forEach((k) => {
      profit[k] = (Number(sell[k]) || 0) - (Number(cost[k]) || 0)
    })
    return { cost, sell, profit }
  }, [sellingVisibleRows, handlingTotal, handlingRow.currency])

  const formatCurrencyBreakdown = useCallback(
    (map) => formatOrderedCurrencyMap(map, formatMoney, numberLocale),
    [numberLocale]
  )

  const formatHumanDate = useCallback(
    (value) => {
      if (!value) return '—'
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return String(value)
      return new Intl.DateTimeFormat(i18n.language || 'en', { day: '2-digit', month: 'short', year: 'numeric' }).format(d)
    },
    [i18n.language]
  )

  const clientInvoiceSecTotalLabelKey = useCallback((secId) => {
    const k = String(secId || '')
    if (k === 'shipping') return 'shipments.fin.secTotalShipping'
    if (k === 'inland') return 'shipments.fin.secTotalInland'
    if (k === 'customs') return 'shipments.fin.secTotalCustoms'
    if (k === 'insurance') return 'shipments.fin.secTotalInsurance'
    if (k === 'other') return 'shipments.fin.secTotalOther'
    return 'shipments.fin.secTotalGeneric'
  }, [])

  const renderClientInvoiceSecTotal = useCallback(
    (totals, secId) => {
      const profitNet = Object.values(totals.profit || {}).reduce((s, v) => s + (Number(v) || 0), 0)
      const profitBadgeCls =
        profitNet > 0
          ? 'shipment-fin-currency-badge--green'
          : profitNet < 0
            ? 'shipment-fin-currency-badge--red'
            : 'shipment-fin-currency-badge--blue'
      return (
        <div className="shipment-fin-draft-sec-total shipment-fin-draft-sec-total--client-invoice">
          <span className="shipment-fin-draft-sec-total__label">{t(clientInvoiceSecTotalLabelKey(secId))}</span>
          <span className="shipment-fin-draft-sec-total__tv">
            <span className="shipment-fin-draft-sec-total__badges shipment-fin-draft-sec-total__badges--cli-stack">
              <span className="shipment-fin-currency-badge shipment-fin-currency-badge--blue">
                {t('shipments.fin.cliBadgeCost', { defaultValue: 'تكلفة:' })}{' '}
                {formatCurrencyBreakdown(totals.cost)}
              </span>
              <span className="shipment-fin-currency-badge shipment-fin-currency-badge--orange">
                {t('shipments.fin.cliBadgeSell', { defaultValue: 'سعر:' })}{' '}
                {formatCurrencyBreakdown(totals.sell)}
              </span>
              <span className={`shipment-fin-currency-badge ${profitBadgeCls}`}>
                {t('shipments.fin.cliBadgeProfit', { defaultValue: 'ربح:' })}{' '}
                {formatCurrencyBreakdown(totals.profit)}
              </span>
            </span>
          </span>
        </div>
      )
    },
    [clientInvoiceSecTotalLabelKey, formatCurrencyBreakdown, t]
  )

  const invoiceFinancialOverview = useMemo(() => {
    const fromApi = clientInvoice?.financial_overview
    const apiTotalSell = fromApi?.selling_by_currency || {}
    const apiTotalCost = fromApi?.cost_by_currency || {}
    const apiProfit = fromApi?.profit_by_currency || {}
    if (Object.keys(apiTotalSell).length || Object.keys(apiTotalCost).length || Object.keys(apiProfit).length) {
      const paid = {}
      ;(clientInvoice?.payments || []).forEach((p) => {
        const cur = String(p?.currency_code || clientInvoice?.currency_code || 'USD').toUpperCase()
        const amt = Number(p?.amount) || 0
        if (amt > 0) paid[cur] = (paid[cur] || 0) + amt
      })
      const remaining = {}
      const remKeys = new Set([...Object.keys(apiTotalSell), ...Object.keys(paid)])
      remKeys.forEach((k) => {
        remaining[k] = Math.max(0, (Number(apiTotalSell[k]) || 0) - (Number(paid[k]) || 0))
      })
      const totalSellSum = Object.values(apiTotalSell).reduce((a, b) => a + (Number(b) || 0), 0)
      const paidSum = Object.values(paid).reduce((a, b) => a + (Number(b) || 0), 0)
      let status = 'unpaid'
      if (totalSellSum > 0 && paidSum >= totalSellSum) status = 'paid'
      else if (paidSum > 0) status = 'partial'
      return { totalCost: apiTotalCost, totalSell: apiTotalSell, profit: apiProfit, paid, remaining, status }
    }

    const totalCost = {}
    const totalSell = {}
    sellingVisibleRows.forEach((r) => {
      const cur = (r.currency || 'USD').toUpperCase()
      const c = Number(r.cost) || 0
      const s = (Number(r.unit_price) || 0) * Math.max(1, Number(r.quantity || 1))
      if (c > 0) totalCost[cur] = (totalCost[cur] || 0) + c
      if (s > 0) totalSell[cur] = (totalSell[cur] || 0) + s
    })
    if (handlingRow.include && handlingTotal > 0) {
      const hCur = (handlingRow.currency || 'USD').toUpperCase()
      totalSell[hCur] = (totalSell[hCur] || 0) + handlingTotal
    }
    const profit = {}
    const keys = new Set([...Object.keys(totalCost), ...Object.keys(totalSell)])
    keys.forEach((k) => {
      profit[k] = (Number(totalSell[k]) || 0) - (Number(totalCost[k]) || 0)
    })

    const paid = {}
    ;(clientInvoice?.payments || []).forEach((p) => {
      const cur = String(p?.currency_code || clientInvoice?.currency_code || 'USD').toUpperCase()
      const amt = Number(p?.amount) || 0
      if (amt > 0) paid[cur] = (paid[cur] || 0) + amt
    })

    const remaining = {}
    const remKeys = new Set([...Object.keys(totalSell), ...Object.keys(paid)])
    remKeys.forEach((k) => {
      remaining[k] = Math.max(0, (Number(totalSell[k]) || 0) - (Number(paid[k]) || 0))
    })

    const totalSellSum = Object.values(totalSell).reduce((a, b) => a + (Number(b) || 0), 0)
    const paidSum = Object.values(paid).reduce((a, b) => a + (Number(b) || 0), 0)
    let status = 'unpaid'
    if (totalSellSum > 0 && paidSum >= totalSellSum) status = 'paid'
    else if (paidSum > 0) status = 'partial'

    return { totalCost, totalSell, profit, paid, remaining, status }
  }, [sellingVisibleRows, handlingRow.include, handlingRow.currency, handlingTotal, clientInvoice])

  const invoiceGrandProfitNet = useMemo(
    () => Object.values(invoiceFinancialOverview.profit || {}).reduce((a, b) => a + (Number(b) || 0), 0),
    [invoiceFinancialOverview.profit]
  )

  const grandCardBucketEmoji = useCallback((sectionId) => {
    const k = String(sectionId || '')
    if (k === 'shipping') return '🚢'
    if (k === 'inland') return '🚛'
    if (k === 'customs') return '🏛️'
    if (k === 'insurance') return '🛡️'
    return '📦'
  }, [])

  const grandCardBreakdownLabel = useCallback(
    (sec) => {
      const id = String(sec?.id || '')
      if (id === 'shipping' || id === 'inland' || id === 'customs' || id === 'insurance') {
        return t(`shipments.fin.breakdown.${id}`)
      }
      return sec?.label || id
    },
    [t]
  )

  const financialTimelineRows = useMemo(() => {
    const rows = []
    if (clientInvoice?.issue_date) {
      rows.push({
        id: `invoice-created-${clientInvoice.id}`,
        type: 'invoice_created',
        date: clientInvoice.issue_date,
        title: t('invoices.timeline.invoiceCreated', 'Invoice Created'),
        details: clientInvoice.invoice_number || `INV-${clientInvoice.id}`,
      })
    }
    ;(clientInvoice?.payments || []).forEach((p, idx) => {
      rows.push({
        id: p.id || `payment-${idx}`,
        type: 'payment_added',
        date: p.paid_at || p.created_at,
        title: t('invoices.timeline.paymentAdded', 'Payment Added'),
        details: `${p.method || '—'} • ${p.bank_name || p.bank_account_name || t('payments.bankAccountOptional', 'No bank account')}`,
        amount: `${String(p.currency_code || 'USD').toUpperCase()} ${formatMoney(Number(p.amount) || 0, numberLocale)}`,
      })
    })
    if (invoiceFinancialOverview.status === 'partial') {
      rows.push({
        id: `partial-${clientInvoice?.id || shipment?.id}`,
        type: 'partial',
        date: clientInvoice?.updated_at || clientInvoice?.issue_date,
        title: t('invoices.timeline.partialPayment', 'Partial Payment'),
        details: formatCurrencyBreakdown(invoiceFinancialOverview.remaining),
      })
    }
    if (clientInvoice?.status) {
      rows.push({
        id: `status-${clientInvoice.id}`,
        type: 'status_change',
        date: clientInvoice.updated_at || clientInvoice.issue_date,
        title: t('invoices.timeline.statusChange', 'Status Change'),
        details: t(`shipments.fin.invoiceStatusValue.${clientInvoice.status}`, { defaultValue: String(clientInvoice.status).toUpperCase() }),
      })
    }
    return rows.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())
  }, [clientInvoice, formatCurrencyBreakdown, invoiceFinancialOverview.remaining, invoiceFinancialOverview.status, numberLocale, shipment?.id, t])

  const submitInvoicePayment = useCallback(async () => {
    if (!token || !clientInvoice?.id) return
    const amount = Number(paymentForm.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setFinBanner({ type: 'error', message: t('shipments.fin.paymentInvalidAmount') })
      return
    }
    setPaymentSaving(true)
    try {
      await recordInvoicePayment(token, clientInvoice.id, {
        amount,
        currency_code: paymentForm.currency,
        method: paymentForm.method,
        source_account_id: paymentForm.bank_account_id ? Number(paymentForm.bank_account_id) : null,
        shipment_id: shipment?.id ?? null,
        reference: paymentForm.reference || null,
        paid_at: paymentForm.paid_at,
      })
      const refreshed = await getInvoice(token, clientInvoice.id)
      setClientInvoice(refreshed)
      setClientInvoicesList((prev) => {
        const filtered = (Array.isArray(prev) ? prev : []).filter((r) => r.id !== refreshed.id)
        return [refreshed, ...filtered]
      })
      setShowPaymentModal(false)
      setPaymentForm((p) => ({ ...p, amount: '', reference: '' }))
      setFinBanner({ type: 'success', message: t('shipments.fin.paymentRecorded') })
    } catch (e) {
      setFinBanner({ type: 'error', message: e?.message || t('shipments.fin.paymentFailed') })
    } finally {
      setPaymentSaving(false)
    }
  }, [token, clientInvoice?.id, paymentForm, t])

  const bucketTotalsLive = useCallback((bucketId) => {
    const rows = byBucket[bucketId] || []
    const deletedIds = new Set(Array.from(deletedIdsByBucket[bucketId] || []))
    const normalizedRows = []

    for (const ex of rows) {
      if (deletedIds.has(ex.id)) continue
      const draft = draftByExpenseId[ex.id] || {}
      normalizedRows.push({
        amount: draft.amount ?? ex.amount,
        currency_code: draft.currency || ex.currency_code || 'USD',
      })
    }

    ;(pendingOtherByBucket[bucketId] || []).forEach((line) => {
      normalizedRows.push({
        amount: line.amount,
        currency_code: line.currency || 'USD',
      })
    })

    return sumByCurrency(normalizedRows)
  }, [byBucket, deletedIdsByBucket, draftByExpenseId, pendingOtherByBucket])

  const expenseRowIdentity = (bucketId, tplId, ex, idx) =>
    ex?.id != null
      ? `${bucketId}::${tplId}::id::${ex.id}`
      : `${bucketId}::${tplId}::draft::${idx}::${ex?.description || ''}::${ex?.amount || ''}::${ex?.currency_code || ''}`

  const renderLineLabelCell = (tpl) => (
    <span className="shipment-fin-line-label">
      {t(tpl.labelKey)}
      {tpl.optional ? <span className="shipment-fin-mini-badge">{t('shipments.fin.lines.optionalBadge')}</span> : null}
      {tpl.reeferOnly ? <span className="shipment-fin-mini-badge">{t('shipments.fin.lines.reeferBadge')}</span> : null}
    </span>
  )

  const renderBucketCard = (bucketId, def) => {
    const uploadPdfUtKey =
      bucketId === 'shipping'
        ? 'shipments.fin.uploadPdfShipping'
        : bucketId === 'inland'
          ? 'shipments.fin.uploadPdfInland'
          : bucketId === 'customs'
            ? 'shipments.fin.uploadPdfCustoms'
            : bucketId === 'insurance'
              ? 'shipments.fin.uploadPdfInsurance'
              : 'shipments.fin.uploadPdfOther'
    const secTotalLabelKey =
      bucketId === 'shipping'
        ? 'shipments.fin.secTotalShipping'
        : bucketId === 'inland'
          ? 'shipments.fin.secTotalInland'
          : bucketId === 'customs'
            ? 'shipments.fin.secTotalCustoms'
            : bucketId === 'insurance'
              ? 'shipments.fin.secTotalInsurance'
              : bucketId === 'other'
                ? 'shipments.fin.secTotalOther'
                : 'shipments.fin.secTotalGeneric'
    const bucketEditing = editMode
    const rows = Array.isArray(byBucket[bucketId]) ? byBucket[bucketId] : []
    const Icon = def?.icon ?? Package
    const liveSums = bucketTotalsLive(bucketId)
    const orderedSubtotalEntries = orderCurrencyMapEntries(liveSums).filter(([, v]) => Number(v) > 0)
    const subtotalBadges = orderedSubtotalEntries.length > 0 ? orderedSubtotalEntries.map(([currency, value]) => {
      let colorClass = 'shipment-fin-currency-badge--blue'
      if (currency === 'EGP') colorClass = 'shipment-fin-currency-badge--orange'
      else if (currency === 'USD') colorClass = 'shipment-fin-currency-badge--green'
      return (
        <span key={`${bucketId}-${currency}`} className={`shipment-fin-currency-badge ${colorClass}`}>
          {currency} {formatMoney(Number(value) || 0, numberLocale)}
        </span>
      )
    }) : <span className="shipment-fin-currency-badge shipment-fin-currency-badge--blue">—</span>
    const linesWithAmount = rows.filter((r) => Number(r.amount) > 0)
    const sectionAttachmentsCount = (sectionAttachmentRefs[bucketId] || []).length
    const allReceipt = (linesWithAmount.length > 0 && linesWithAmount.every((r) => r.has_receipt)) || sectionAttachmentsCount > 0
    const partialReceipt = !allReceipt && (linesWithAmount.some((r) => r.has_receipt) || sectionAttachmentsCount > 0)
    const isOpen = expanded.has(bucketId)

    let receiptBadgeClass = 'shipment-fin-badge--draft'
    let receiptBadgeKey = 'shipments.fin.statusDraft'
    if (allReceipt) {
      receiptBadgeClass = 'shipment-fin-badge--ok'
      receiptBadgeKey = 'shipments.fin.statusReceiptComplete'
    } else if (partialReceipt) {
      receiptBadgeClass = 'shipment-fin-badge--partial'
      receiptBadgeKey = 'shipments.fin.statusReceiptPartial'
    }

    const tableHead = (
      <thead>
        <tr>
          <th>{t('shipments.fin.colItem')}</th>
          <th>{t('shipments.expColAmount')}</th>
          <th>{t('shipments.fin.colCurrency')}</th>
          {editMode ? <th>{t('shipments.actions')}</th> : null}
        </tr>
      </thead>
    )

    const attachmentRows = sectionAttachmentRefs[bucketId] || []
    const attachmentTable = attachmentRows.length > 0 ? (
      <div className="shipment-fin-table-wrap shipment-fin-draft-table-wrap mt-2">
        <table className="shipment-fin-line-table">
          <thead>
            <tr>
              <th>{t('shipments.fin.attachmentsLabel')}</th>
              <th>{t('shipments.fin.colCurrency', { defaultValue: 'Type' })}</th>
              <th>{t('shipments.fin.invoiceNet', { defaultValue: 'Size' })}</th>
              <th>{t('shipments.expColDate')}</th>
              <th>{t('shipments.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {attachmentRows.map((att) => (
              <tr key={att.id}>
                <td>
                  {canOpenShipmentAttachment(att) ? (
                    <button
                      type="button"
                      className="shipment-fin-att-name-link"
                      onClick={() => openSectionAttachment(att)}
                      title={t('shipments.fin.viewReceipt')}
                    >
                      {att.name || 'attachment'}
                    </button>
                  ) : (
                    <span className="shipment-fin-att-name-muted">{att.name || 'attachment'}</span>
                  )}
                </td>
                <td>{att.type || '—'}</td>
                <td>{formatFileSize(att.size)}</td>
                <td>{att.uploaded_at ? new Date(att.uploaded_at).toISOString().slice(0, 10) : '—'}</td>
                <td className="shipment-fin-actions">
                  <div className="shipment-fin-actions__inner">
                    <button type="button" className="shipment-fin-btn shipment-fin-btn--secondary shipment-fin-btn--sm" onClick={() => downloadSectionAttachment(att)}><FileDown size={14} /></button>
                    <button type="button" className="shipment-fin-btn shipment-fin-btn--secondary shipment-fin-btn--sm" onClick={() => renameSectionAttachment(bucketId, att.id)}><Pencil size={14} /></button>
                    <button type="button" className="shipment-fin-btn shipment-fin-btn--danger shipment-fin-btn--sm" onClick={() => deleteSectionAttachment(bucketId, att.id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="shipment-fin-empty-inline shipment-fin-empty-inline--centered" role="status">
        <p className="shipment-fin-empty-inline__text">{t('shipments.fin.noAssetsAvailable')}</p>
      </div>
    )

    const renderExpenseCells = (ex) => (
      <>
        <td>{ex?.title?.trim() || ex?.description?.trim() || 'Custom Item'}</td>
        <td className="shipment-fin-num">{formatMoney(Number(ex?.amount) || 0, numberLocale)}</td>
        <td className="shipment-fin-cur-cell">{currencyCodePill(ex?.currency_code)}</td>
      </>
    )

    const otherTableHead = (
      <thead>
        <tr>
          <th>{t('shipments.fin.colItem')}</th>
          <th>{t('shipments.expColAmount')}</th>
          <th>{t('shipments.fin.colCurrency')}</th>
          {editMode ? <th>{t('shipments.actions')}</th> : null}
        </tr>
      </thead>
    )

    let bodyContent
    if (bucketId === 'other') {
      // "Other" bucket — fully editable in editMode, static in view mode
      const pendingOthers = pendingOtherByBucket['other'] || []
      const otherToolbar = null

      bodyContent = (
        <>
          {otherToolbar}
          {rows.length === 0 && pendingOthers.length === 0 ? null : (
            <>
              <div className="shipment-fin-line-items-caption">{t('shipments.fin.lineItemsCaption')}</div>
              <div className="shipment-fin-table-wrap shipment-fin-draft-table-wrap">
              <table className="shipment-fin-line-table">
                {otherTableHead}
                <tbody>
                  {rows.map((ex) => (
                    <tr key={ex.id}>
                      <td>{ex.title?.trim() || ex.description?.trim() || ex.invoice_number || '—'}</td>
                      <td className="shipment-fin-num">{formatMoney(Number(ex.amount) || 0, numberLocale)}</td>
                      <td className="shipment-fin-cur-cell">{currencyCodePill(ex.currency_code)}</td>
                      {bucketEditing ? (
                        <td className="shipment-fin-actions">
                          <div className="shipment-fin-actions__inner">
                            <button
                              type="button"
                              className="shipment-fin-btn shipment-fin-btn--danger shipment-fin-btn--sm"
                              onClick={async () => {
                                setDeletedIdsByBucket((prev) => {
                                  const next = new Set(prev.other || [])
                                  next.add(ex.id)
                                  return { ...prev, other: next }
                                })
                              }}
                              title={t('shipments.delete')}
                              aria-label={t('shipments.delete')}
                            >
                              ✕
                            </button>
                            {ex.has_receipt ? (
                              <>
                                <button
                                  type="button"
                                  className="shipment-fin-btn shipment-fin-btn--secondary shipment-fin-btn--sm"
                                  onClick={() => handleViewReceipt(ex.id)}
                                  title={t('shipments.fin.viewReceipt')}
                                  aria-label={t('shipments.fin.viewReceipt')}
                                  disabled={receiptActionId === ex.id}
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="shipment-fin-btn shipment-fin-btn--secondary shipment-fin-btn--sm"
                                  onClick={() => handleDownloadReceipt(ex.id)}
                                  title={t('shipments.fin.downloadReceipt')}
                                  aria-label={t('shipments.fin.downloadReceipt')}
                                  disabled={receiptActionId === ex.id}
                                >
                                  <FileDown size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="shipment-fin-btn shipment-fin-btn--secondary shipment-fin-btn--sm"
                                  onClick={() => startRenameReceipt(ex)}
                                  title={t('shipments.fin.renameReceipt')}
                                  aria-label={t('shipments.fin.renameReceipt')}
                                  disabled={receiptActionId === ex.id}
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="shipment-fin-btn shipment-fin-btn--danger shipment-fin-btn--sm"
                                  onClick={() => handleDeleteReceipt(ex.id)}
                                  title={t('shipments.fin.deleteReceipt')}
                                  aria-label={t('shipments.fin.deleteReceipt')}
                                  disabled={receiptActionId === ex.id}
                                >
                                  ✕
                                </button>
                              </>
                            ) : null}
                            <label className="shipment-fin-upload" title={t('shipments.fin.uploadReceipt')}>
                              <Paperclip className="shipment-fin-upload__icon" aria-hidden />
                              <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="shipment-fin-upload__input"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0]; e.target.value = ''
                                  if (!file) return
                                  try { await uploadExpenseReceipt(token, ex.id, file); onExpensesChanged?.() }
                                  catch (err) { setFinBanner({ type: 'error', message: err.message }) }
                                }}
                              />
                            </label>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                  {pendingOthers.map((line) => (
                    <tr key={line.tempId}>
                      <td>
                        <input
                          type="text"
                          className="shipment-fin-input"
                          value={line.desc}
                          onChange={(e) => patchPendingOtherLine('other', line.tempId, { desc: e.target.value })}
                          placeholder={t('shipments.fin.descPlaceholder')}
                        />
                      </td>
                      <td><input type="number" min="0" step="0.01" className="shipment-fin-input shipment-fin-input--num" value={line.amount} onChange={(e) => patchPendingOtherLine('other', line.tempId, { amount: e.target.value })} /></td>
                      <td>
                        <select
                          className="shipment-fin-select"
                          value={line.currency || 'USD'}
                          onChange={(e) => patchPendingOtherLine('other', line.tempId, { currency: e.target.value })}
                        >
                          {CURRENCIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                      {editMode ? (
                        <td className="shipment-fin-actions">
                          <div className="shipment-fin-actions__inner">
                            <button
                              type="button"
                              className="shipment-fin-btn shipment-fin-btn--danger shipment-fin-btn--sm"
                              onClick={() => removePendingOtherLine('other', line.tempId)}
                              title={t('shipments.delete')}
                              aria-label={t('shipments.delete')}
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
          {editMode ? (
            <div className="shipment-fin-draft-add-row">
              <input
                type="text"
                className="shipment-fin-draft-add-row__input"
                value={addRowDraftByBucket.other?.desc || ''}
                onChange={(e) => patchAddRowDraft('other', { desc: e.target.value })}
                placeholder="اسم البند الجديد..."
              />
              <select
                className="shipment-fin-draft-add-row__select"
                value={addRowDraftByBucket.other?.currency || 'USD'}
                onChange={(e) => patchAddRowDraft('other', { currency: e.target.value })}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button type="button" className="shipment-fin-btn shipment-fin-btn--secondary shipment-fin-btn--sm shipment-fin-btn--dashed" onClick={() => addPendingFromDraft('other')}>
                + إضافة بند
              </button>
            </div>
          ) : null}
          <div className="shipment-fin-draft-sec-total">
            <span className="shipment-fin-draft-sec-total__label">{t(secTotalLabelKey)}</span>
            <span className="shipment-fin-draft-sec-total__tv">
              <span className="shipment-fin-draft-sec-total__badges">{subtotalBadges}</span>
            </span>
          </div>
          {editMode ? (
            <div
              className="shipment-fin-draft-upload-area"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  document.getElementById(`fin-upload-${bucketId}`)?.click()
                }
              }}
              onClick={() => document.getElementById(`fin-upload-${bucketId}`)?.click()}
            >
              <input
                id={`fin-upload-${bucketId}`}
                type="file"
                className="shipment-fin-draft-upload-input"
                accept=".pdf"
                onChange={(e) => handleSectionUpload(bucketId, e)}
                disabled={batchSavingBucket === bucketId}
              />
              <div className="shipment-fin-draft-upload-icon" aria-hidden>
                📎
              </div>
              <div className="shipment-fin-draft-upload-ut">{t(uploadPdfUtKey)}</div>
            </div>
          ) : null}
          {attachmentTable}
          {editMode ? (
            <div className="shipment-fin-section-save-row">
              <button
                type="button"
                className="shipment-fin-btn shipment-fin-btn--secondary shipment-fin-btn--sm"
                disabled={savingAllDraft || savingSectionId != null}
                onClick={() => handleSaveSectionDraft(bucketId)}
              >
                {savingSectionId === bucketId ? t('shipments.saving') : t('shipments.fin.saveSection')}
              </button>
            </div>
          ) : null}
        </>
      )
    } else {
      const { sections, orphans } = partitionBucketRows(bucketId, rows, isReefer)
      const sectionRows = []
      const saveModels = []
      const deletedSet = deletedIdsByBucket[bucketId] || new Set()
      const deletedDraftRowKeys = deletedDraftRowKeysByBucket[bucketId] || new Set()
      for (const { tpl, matched } of sections) {
        const rowsForTpl = matched.length > 0 ? matched : [null]
        rowsForTpl.forEach((ex, idx) => {
          const rowKey = expenseRowIdentity(bucketId, tpl.id, ex, idx)
          const descPrefix = LINE_DESC_PREFIX[tpl.id] || tpl.id
          const categoryCode = categoryCodeForTemplate(bucketId, tpl.id)
          const categoryMeta = categoriesByCode[categoryCode]
          const initialDesc = String(ex?.title || normalizeTemplateEditableDescription(ex?.description, bucketId, tpl.id) || '')
          const initialAmount = ex?.amount != null ? String(ex.amount) : ''
          const initialCurrency = ex?.currency_code || 'USD'
          const draft = { desc: initialDesc, amount: initialAmount, currency: initialCurrency, ...(groupDraftByKey[rowKey] || {}) }

          if (ex?.id && deletedSet.has(ex.id)) return
          if (!ex?.id && deletedDraftRowKeys.has(rowKey)) return

          const costLineId =
            ex?.line_id != null && ex.line_id !== '' && Number(ex.line_id) > 0 ? Number(ex.line_id) : null
          const rowNumericId = ex?.id != null && ex.id !== '' && Number(ex.id) > 0 ? Number(ex.id) : null
          saveModels.push({
            rowKey,
            tplId: tpl.id,
            expenseId: ex?.id ?? null,
            lineId: costLineId ?? rowNumericId,
            categoryId: categoryMeta?.id,
            descPrefix,
            initialDesc,
            initialAmount,
            initialCurrency,
            expenseDate: ex?.expense_date,
            vendorId: ex?.vendor_id,
          })

          if (!bucketEditing) {
            if (!ex) {
              sectionRows.push(
                <tr key={rowKey}>
                  <td>{ex?.title?.trim() || (idx === 0 ? renderLineLabelCell(tpl) : null)}</td>
                  <td className="shipment-fin-num">—</td>
                  <td>—</td>
                </tr>
              )
            } else {
              sectionRows.push(
                <tr key={rowKey}>
                  <td>{ex?.title?.trim() || (idx === 0 ? renderLineLabelCell(tpl) : null)}</td>
                  <td className="shipment-fin-num">{formatMoney(Number(ex?.amount) || 0, numberLocale)}</td>
                  <td className="shipment-fin-cur-cell">{currencyCodePill(ex?.currency_code)}</td>
                </tr>
              )
            }
            return
          }

          sectionRows.push(
            <tr key={rowKey}>
              <td>{draft.desc?.trim() || (idx === 0 ? renderLineLabelCell(tpl) : null)}</td>
              <td>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="shipment-fin-input shipment-fin-input--num"
                  value={draft.amount}
                  onChange={(e) => patchGroupDraft(rowKey, { amount: e.target.value })}
                  disabled={!bucketEditing || batchSavingBucket === bucketId}
                />
              </td>
              <td>
                <select
                  className="shipment-fin-select"
                  value={draft.currency}
                  onChange={(e) => patchGroupDraft(rowKey, { currency: e.target.value })}
                  disabled={!bucketEditing || batchSavingBucket === bucketId}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </td>
              <td className="shipment-fin-actions">
                <div className="shipment-fin-actions__inner">
                  <button
                    type="button"
                    className="shipment-fin-btn shipment-fin-btn--danger shipment-fin-btn--sm"
                    disabled={!bucketEditing || batchSavingBucket === bucketId}
                    onClick={() => {
                      if (ex?.id) {
                        setDeletedIdsByBucket((prev) => {
                          const next = new Set(prev[bucketId] || [])
                          next.add(ex.id)
                          return { ...prev, [bucketId]: next }
                        })
                        return
                      }
                      setGroupDraftByKey((prev) => {
                        const next = { ...prev }
                        delete next[rowKey]
                        return next
                      })
                      setDeletedDraftRowKeysByBucket((prev) => {
                        const next = new Set(prev[bucketId] || [])
                        next.add(rowKey)
                        return { ...prev, [bucketId]: next }
                      })
                    }}
                    title={t('shipments.delete')}
                    aria-label={t('shipments.delete')}
                  >
                    ✕
                  </button>
                </div>
              </td>
            </tr>
          )
        })
      }
      const pendingOthers = pendingOtherByBucket[bucketId] || []
      for (const line of pendingOthers) {
        sectionRows.push(
          <tr key={line.tempId}>
            <td>
              <input
                type="text"
                className="shipment-fin-input"
                value={line.desc}
                onChange={(e) => patchPendingOtherLine(bucketId, line.tempId, { desc: e.target.value })}
                placeholder={t('shipments.fin.descPlaceholder')}
              />
            </td>
            <td>
              <input
                type="number"
                min="0"
                step="0.01"
                className="shipment-fin-input shipment-fin-input--num"
                value={line.amount}
                onChange={(e) => patchPendingOtherLine(bucketId, line.tempId, { amount: e.target.value })}
              />
            </td>
            <td>
              <select
                className="shipment-fin-select"
                value={line.currency || 'USD'}
                onChange={(e) => patchPendingOtherLine(bucketId, line.tempId, { currency: e.target.value })}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </td>
            {editMode ? (
              <td className="shipment-fin-actions">
                <div className="shipment-fin-actions__inner">
                  <button
                    type="button"
                    className="shipment-fin-btn shipment-fin-btn--danger shipment-fin-btn--sm"
                    onClick={() => removePendingOtherLine(bucketId, line.tempId)}
                    title={t('shipments.delete')}
                    aria-label={t('shipments.delete')}
                  >
                    ✕
                  </button>
                </div>
              </td>
            ) : null}
          </tr>
        )
      }
      if (orphans.length > 0) {
        sectionRows.push(
          <tr key="__orphan-sep" className="shipment-fin-template-sep">
            <td colSpan={bucketEditing ? 4 : 3}>{t('shipments.fin.otherPosted')}</td>
          </tr>
        )
        orphans.forEach((ex) => {
          sectionRows.push(
            <tr key={ex.id}>
              {renderExpenseCells(ex)}
              {bucketEditing ? <td /> : null}
            </tr>
          )
        })
      }
      // Always show receipt download indicators per row (for non-'other' buckets)
      if (rows.filter((r) => r.has_receipt).length > 0) {
        sectionRows.push(
          <tr key="__receipts-header" className="shipment-fin-template-sep">
            <td colSpan={bucketEditing ? 4 : 3}>📎 {t('shipments.fin.attachmentsLabel')}</td>
          </tr>
        )
        rows.filter((r) => r.has_receipt).forEach((ex) => {
          sectionRows.push(
            <tr key={`receipt-${ex.id}`} className="shipment-fin-receipt-row">
              <td>
                {renamingReceiptId === ex.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      className="shipment-fin-input"
                      value={renamingReceiptValue}
                      onChange={(e) => setRenamingReceiptValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRenameReceipt(ex.id)
                        if (e.key === 'Escape') cancelRenameReceipt()
                      }}
                    />
                    <button type="button" className="shipment-fin-btn shipment-fin-btn--secondary shipment-fin-btn--sm" onClick={() => saveRenameReceipt(ex.id)}>
                      <Upload size={12} />
                    </button>
                    <button type="button" className="shipment-fin-btn shipment-fin-btn--secondary shipment-fin-btn--sm" onClick={cancelRenameReceipt}>
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="shipment-fin-att-name-link"
                    onClick={() => handleViewReceipt(ex.id)}
                    title={t('shipments.fin.viewReceipt')}
                    disabled={receiptActionId === ex.id}
                  >
                    {receiptNameFromExpense(ex)}
                  </button>
                )}
              </td>
              <td colSpan={bucketEditing ? 2 : 1}>
                <div className="shipment-fin-actions__inner">
                  <button type="button" className="shipment-fin-btn shipment-fin-btn--secondary shipment-fin-btn--sm" onClick={() => handleDownloadReceipt(ex.id)} title={t('shipments.fin.downloadReceipt')}>
                    <FileDown size={14} />
                  </button>
                  <button type="button" className="shipment-fin-btn shipment-fin-btn--secondary shipment-fin-btn--sm" onClick={() => startRenameReceipt(ex)} title={t('shipments.fin.renameReceipt')}>
                    <Pencil size={14} />
                  </button>
                  <button type="button" className="shipment-fin-btn shipment-fin-btn--danger shipment-fin-btn--sm" onClick={() => handleDeleteReceipt(ex.id)} title={t('shipments.fin.deleteReceipt')}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
              {bucketEditing ? <td /> : null}
            </tr>
          )
        })
      }

      bucketSaveModelsRef.current[bucketId] = saveModels

      const sectionToolbar = editMode ? (
        <div className="shipment-fin-section-toolbar">
          {bucketId === 'inland' ? (
            <>
              <label className="fs-xs fw-600">{t('shipments.fin.inlandContractorLabel')}</label>
              <select
                className="shipment-fin-select"
                value={String(sectionMetaByBucket.inland?.contractor_vendor_id || '')}
                onChange={(e) => setSectionMetaByBucket((s) => ({ ...s, inland: { ...(s.inland || {}), contractor_vendor_id: e.target.value ? Number(e.target.value) : null } }))}
              >
                <option value="">{t('shipments.fin.inlandContractorPlaceholder', { defaultValue: 'Select contractor/partner' })}</option>
                {(vendorsBySection.inland || []).map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </>
          ) : null}
          {bucketId === 'customs' ? (
            <>
              <label className="fs-xs fw-600">{t('shipments.fin.customsBrokerLabel', { defaultValue: 'Customs Broker Name' })}</label>
              <select
                className="shipment-fin-select"
                value={String(sectionMetaByBucket.customs?.customs_broker_vendor_id || '')}
                onChange={(e) => setSectionMetaByBucket((s) => ({ ...s, customs: { ...(s.customs || {}), customs_broker_vendor_id: e.target.value ? Number(e.target.value) : null } }))}
              >
                <option value="">{t('shipments.fin.customsBrokerPlaceholder', { defaultValue: 'Select customs broker' })}</option>
                {(vendorsBySection.customs || []).map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </>
          ) : null}
          {bucketId === 'insurance' ? (
            <>
              <label className="fs-xs fw-600">{t('shipments.fin.insuranceCompanyLabel', { defaultValue: 'Insurance Company' })}</label>
              <select
                className="shipment-fin-select"
                value={String(sectionMetaByBucket.insurance?.insurance_company_vendor_id || '')}
                onChange={(e) => setSectionMetaByBucket((s) => ({ ...s, insurance: { ...(s.insurance || {}), insurance_company_vendor_id: e.target.value ? Number(e.target.value) : null } }))}
              >
                <option value="">{t('shipments.fin.insuranceCompanyPlaceholder', { defaultValue: 'Select insurance company' })}</option>
                {(vendorsBySection.insurance || []).map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </>
          ) : null}
        </div>
      ) : null

      bodyContent = (
        <>
          {sectionToolbar}
          <div className="shipment-fin-line-items-caption">{t('shipments.fin.lineItemsCaption')}</div>
          <div className="shipment-fin-table-wrap shipment-fin-draft-table-wrap">
            <table className="shipment-fin-line-table">
              {tableHead}
              <tbody>{sectionRows}</tbody>
            </table>
          </div>
          {editMode ? (
            <div className="shipment-fin-draft-add-row">
              <input
                type="text"
                className="shipment-fin-draft-add-row__input"
                value={addRowDraftByBucket[bucketId]?.desc || ''}
                onChange={(e) => patchAddRowDraft(bucketId, { desc: e.target.value })}
                placeholder="اسم البند الجديد..."
              />
              <select
                className="shipment-fin-draft-add-row__select"
                value={addRowDraftByBucket[bucketId]?.currency || 'USD'}
                onChange={(e) => patchAddRowDraft(bucketId, { currency: e.target.value })}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button type="button" className="shipment-fin-btn shipment-fin-btn--secondary shipment-fin-btn--sm shipment-fin-btn--dashed" onClick={() => addPendingFromDraft(bucketId)}>
                + إضافة بند
              </button>
            </div>
          ) : null}
          <div className="shipment-fin-draft-sec-total">
            <span className="shipment-fin-draft-sec-total__label">{t(secTotalLabelKey)}</span>
            <span className="shipment-fin-draft-sec-total__tv">
              <span className="shipment-fin-draft-sec-total__badges">{subtotalBadges}</span>
            </span>
          </div>
          {editMode ? (
            <div
              className="shipment-fin-draft-upload-area"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  document.getElementById(`fin-upload-${bucketId}`)?.click()
                }
              }}
              onClick={() => document.getElementById(`fin-upload-${bucketId}`)?.click()}
            >
              <input
                id={`fin-upload-${bucketId}`}
                type="file"
                className="shipment-fin-draft-upload-input"
                accept=".pdf"
                onChange={(e) => handleSectionUpload(bucketId, e)}
                disabled={batchSavingBucket === bucketId}
              />
              <div className="shipment-fin-draft-upload-icon" aria-hidden>
                📎
              </div>
              <div className="shipment-fin-draft-upload-ut">{t(uploadPdfUtKey)}</div>
            </div>
          ) : null}
          {attachmentTable}
          {editMode ? (
            <div className="shipment-fin-section-save-row">
              <button
                type="button"
                className="shipment-fin-btn shipment-fin-btn--secondary shipment-fin-btn--sm"
                disabled={savingAllDraft || savingSectionId != null}
                onClick={() => handleSaveSectionDraft(bucketId)}
              >
                {savingSectionId === bucketId ? t('shipments.saving') : t('shipments.fin.saveSection')}
              </button>
            </div>
          ) : null}
        </>
      )
    }

    const cardTitle = def.displayTitle || (def.titleKey ? t(def.titleKey) : bucketId)

    const vendorNameFromList = (list, vendorId) => {
      if (vendorId == null || vendorId === '') return ''
      const id = typeof vendorId === 'number' ? vendorId : Number(vendorId)
      if (!Number.isFinite(id) || id <= 0) return ''
      const v = (list || []).find((x) => Number(x.id) === id)
      return (v?.name || '').trim()
    }

    let cardSub = ''
    if (def.hideCardSub) {
      cardSub = ''
    } else if (bucketId === 'shipping') {
      cardSub = (shipment?.shipping_line?.name || shipment?.shippingLine?.name || '').trim()
    } else if (bucketId === 'inland') {
      const vid = sectionMetaByBucket.inland?.contractor_vendor_id
      cardSub =
        vendorNameFromList(vendorsBySection.inland, vid) || (sectionMetaByBucket.inland?.contractor_name || '').trim()
    } else if (bucketId === 'customs') {
      const vid = sectionMetaByBucket.customs?.customs_broker_vendor_id
      cardSub =
        vendorNameFromList(vendorsBySection.customs, vid) || (sectionMetaByBucket.customs?.customs_broker_name || '').trim()
    } else if (bucketId === 'insurance') {
      const vid = sectionMetaByBucket.insurance?.insurance_company_vendor_id
      cardSub =
        vendorNameFromList(vendorsBySection.insurance, vid) ||
        (sectionMetaByBucket.insurance?.insurance_company_name || '').trim()
    } else {
      cardSub = (def.displaySub || (def.subKey ? t(def.subKey) : '') || '').trim()
    }
    const iconThemeByBucket = {
      shipping: { glyph: '🚢', cls: '' },
      inland: { glyph: '🚛', cls: 'shipment-fin-cost-sec-icon--inland' },
      customs: { glyph: '🏛️', cls: 'shipment-fin-cost-sec-icon--customs' },
      insurance: { glyph: '🛡️', cls: 'shipment-fin-cost-sec-icon--insurance' },
    }
    const iconTheme = iconThemeByBucket[bucketId]

    return (
      <div key={bucketId} className="shipment-fin-card">
        <button type="button" className="shipment-fin-card__head" onClick={() => toggleCard(bucketId)}>
          <div className="shipment-fin-card__head-main">
            {iconTheme ? (
              <span className={`shipment-fin-cost-sec-icon ${iconTheme.cls}`.trim()} aria-hidden>
                {iconTheme.glyph}
              </span>
            ) : (
              <Icon className="shipment-fin-card__icon" aria-hidden />
            )}
            <div>
              <div className="shipment-fin-card__title">{cardTitle}</div>
              {cardSub ? <div className="shipment-fin-card__sub">{cardSub}</div> : null}
            </div>
          </div>
          <div className="shipment-fin-card__head-meta">
            <span className="shipment-fin-card__subtotal shipment-fin-card__subtotal--badges">{subtotalBadges}</span>
            {editMode && def.deletable ? (
              <button
                type="button"
                className="shipment-fin-btn shipment-fin-btn--danger shipment-fin-btn--sm"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteCustomSection(bucketId)
                }}
              >
                {t('shipments.delete')}
              </button>
            ) : null}
            {isOpen ? <ChevronUp className="shipment-fin-chevron" /> : <ChevronDown className="shipment-fin-chevron" />}
          </div>
        </button>
        {isOpen && <div className="shipment-fin-card__body">{bodyContent}</div>}
      </div>
    )
  }

  const financialTabs = useMemo(() => {
    const items = []
    if (isAccountingUser) {
      items.push({
        id: 'expenses',
        label: t('shipments.fin.shipmentCostItems', { defaultValue: 'Shipment Cost Items' }),
        icon: <Package className="w-4 h-4" aria-hidden />,
      })
    }
    if (isSalesUser) {
      items.push({
        id: 'selling',
        label: t('shipments.financialsTab.selling'),
        icon: <DollarSign className="w-4 h-4" aria-hidden />,
      })
    }
    if (isAccountingUser || isSalesUser) {
      const attachmentCount = expenses.filter((e) => e.has_receipt).length
      items.push({
        id: 'attachments',
        label: t('shipments.financialsTab.attachments', { defaultValue: 'Attachments' }),
        icon: <Paperclip className="w-4 h-4" aria-hidden />,
        badge: attachmentCount > 0 ? attachmentCount : undefined,
      })
    }
    items.push(
      {
        id: 'summary',
        label: t('shipments.financialsTab.summary'),
        icon: <FileText className="w-4 h-4" aria-hidden />,
      },
      {
        id: 'history',
        label: t('shipments.fin.tabD'),
        icon: <History className="w-4 h-4" aria-hidden />,
      }
    )
    return items
  }, [isAccountingUser, isSalesUser, expenses, t])

  return (
    <div
      className={`client-detail-modal shipments-no-print shipment-fin-modal-root${tab === 'selling' ? ' shipment-fin-modal-root--selling-tab' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shipment-fin-modal-title"
    >
      <div className="client-detail-modal__backdrop" onClick={onClose} />
      <div className="client-detail-modal__box client-detail-modal__box--form shipment-fin-modal__box">
        <header className="client-detail-modal__header client-detail-modal__header--form shipment-fin-modal__header">
          <div className="shipment-fin-modal__header-main">
            <div className="ship-bar">
              <div>
                <div id="shipment-fin-modal-title" className="ship-ref" role="heading" aria-level={2}>
                  {bl}
                </div>
                <div className="ship-client">{clientLabel(shipment)}</div>
              </div>
              <div className="ship-metas">
                <div>
                  <div className="ship-meta-val">{shipBarLine}</div>
                  <div className="ship-meta-lbl">Shipping Line</div>
                </div>
                <div className="ship-meta-divider" aria-hidden />
                <div>
                  <div className="ship-meta-val">{shipBarRoute}</div>
                  <div className="ship-meta-lbl">Route</div>
                </div>
                <div className="ship-meta-divider" aria-hidden />
                <div>
                  <div className="ship-meta-val">{shipBarContainer}</div>
                  <div className="ship-meta-lbl">Container</div>
                </div>
                <div className="ship-meta-divider" aria-hidden />
                <div>
                  <div className="ship-meta-val">{shipBarCutOff}</div>
                  <div className="ship-meta-lbl">CUT-OFF</div>
                </div>
                <div className="ship-meta-divider" aria-hidden />
                <div className="ship-meta ship-meta--sales-only">
                  <div className="ship-meta-val ship-meta-val--sales" data-ship-meta="sales">
                    {shipBarSales}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <button type="button" className="client-detail-modal__close shipment-fin-modal__header-close" onClick={onClose} aria-label={t('shipments.close')}>
            <X className="client-detail-modal__close-icon" aria-hidden />
          </button>
        </header>

        <Tabs tabs={financialTabs} activeTab={tab} onChange={setTab} className="client-detail-modal__tabs" />

        <div className="client-detail-modal__body client-detail-modal__body--form shipment-fin-modal__body">
          {finBanner ? (
            <div className={`shipment-fin-flash shipment-fin-flash--${finBanner.type}`} role="status">
              {finBanner.message}
            </div>
          ) : null}
          <div className="client-detail-modal__body-inner clients-form-sections">
          {tab === 'expenses' && isAccountingUser && (
            <div key="expenses" className="shipment-fin-panel shipment-fin-panel--enter shipment-fin-panel--expenses">
              {!hasBl ? (
                <p className="client-detail-modal__empty">{t('shipments.financialsNoBl')}</p>
              ) : loading ? (
                <ShipmentFinLoadingSkeleton variant="expenses" />
              ) : (
                <>
                  {BUCKET_DEFS.map((d) => renderBucketCard(d.id, { ...d }))}
                  {customSectionDefs.map((sec) =>
                    renderBucketCard(sec.id, {
                      icon: Package,
                      titleKey: null,
                      subKey: null,
                      displayTitle: sec.title,
                      hideCardSub: true,
                      deletable: true,
                    })
                  )}
                  {editMode ? (
                    <button type="button" className="shipment-fin-add-sec-card" onClick={addCustomCostSection}>
                      <div className="shipment-fin-add-sec-card__icon">➕</div>
                      <div className="shipment-fin-add-sec-card__title">{t('shipments.fin.addNewCostSection')}</div>
                    </button>
                  ) : null}
                  <div className="shipment-fin-draft-grand-total">
                    <div className="shipment-fin-draft-grand-top">
                      <div className="shipment-fin-draft-grand-main">
                        <div className="shipment-fin-draft-grand-gl">
                          {t('shipments.fin.expensesGrandHeading', { defaultValue: 'إجمالي تكاليف الشحنة الكاملة' })}
                        </div>
                        <div className="shipment-fin-draft-grand-gv">{netBreakdownStr}</div>
                      </div>
                      <div className="shipment-fin-draft-grand-breakdown">
                        <div className="shipment-fin-draft-grand-gb-row">
                          <span className="shipment-fin-draft-grand-gb-lbl">
                            {grandCardBucketEmoji('shipping')} {t('shipments.fin.breakdown.shipping')}
                          </span>
                          <span className="shipment-fin-draft-grand-gb-val shipment-fin-draft-grand-gb-val--cost">
                            {formatOrderedCurrencyMap(bucketTotalsLive('shipping'), formatMoney, numberLocale)}
                          </span>
                        </div>
                        <div className="shipment-fin-draft-grand-gb-row">
                          <span className="shipment-fin-draft-grand-gb-lbl">
                            {grandCardBucketEmoji('inland')} {t('shipments.fin.breakdown.inland')}
                          </span>
                          <span className="shipment-fin-draft-grand-gb-val shipment-fin-draft-grand-gb-val--cost">
                            {formatOrderedCurrencyMap(bucketTotalsLive('inland'), formatMoney, numberLocale)}
                          </span>
                        </div>
                        <div className="shipment-fin-draft-grand-gb-row">
                          <span className="shipment-fin-draft-grand-gb-lbl">
                            {grandCardBucketEmoji('customs')} {t('shipments.fin.breakdown.customs')}
                          </span>
                          <span className="shipment-fin-draft-grand-gb-val shipment-fin-draft-grand-gb-val--cost">
                            {formatOrderedCurrencyMap(bucketTotalsLive('customs'), formatMoney, numberLocale)}
                          </span>
                        </div>
                        <div className="shipment-fin-draft-grand-gb-row">
                          <span className="shipment-fin-draft-grand-gb-lbl">
                            {grandCardBucketEmoji('insurance')} {t('shipments.fin.breakdown.insurance')}
                          </span>
                          <span className="shipment-fin-draft-grand-gb-val shipment-fin-draft-grand-gb-val--cost">
                            {formatOrderedCurrencyMap(bucketTotalsLive('insurance'), formatMoney, numberLocale)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="shipment-fin-draft-actions-footer">
                    <button
                      type="button"
                      className="client-detail-modal__btn client-detail-modal__btn--secondary"
                      disabled={savingAllDraft || savingSectionId != null}
                      onClick={handleSaveAllDraft}
                    >
                      {savingAllDraft ? t('shipments.saving') : 'حفظ كمسودة'}
                    </button>
                    <button
                      type="button"
                      className="client-detail-modal__btn client-detail-modal__btn--primary"
                      disabled={notifySending || savingAllDraft || savingSectionId != null}
                      onClick={handleNotifySales}
                    >
                      {notifySending ? t('shipments.saving') : 'حفظ إشعار مبيعات'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'selling' && isSalesUser && (
            <div
              key="selling"
              className="shipment-fin-panel shipment-fin-panel--enter shipment-fin-panel--expenses shipment-fin-panel--client-invoice"
            >
              {!hasBl ? (
                <p className="client-detail-modal__empty">{t('shipments.financialsNoBl')}</p>
              ) : loading || invoiceLoading ? (
                <ShipmentFinLoadingSkeleton variant="selling" />
              ) : sellingSections.length === 0 ? (
                <p className="client-detail-modal__empty">{t('shipments.fin.tabBEmpty')}</p>
              ) : (
                <>
                  {sellingSections.map((sec) => {
                    const liveRows = editableSectionRows(sec.id)
                    const st = sectionCurrencyTotals(liveRows)
                    const secTotals = { cost: st.cost, sell: st.sell, profit: st.profit }
                    const iconCls =
                      sec.id === 'shipping'
                        ? ''
                        : sec.id === 'inland'
                          ? 'shipment-fin-cost-sec-icon--inland'
                          : sec.id === 'customs'
                            ? 'shipment-fin-cost-sec-icon--customs'
                            : sec.id === 'insurance'
                              ? 'shipment-fin-cost-sec-icon--insurance'
                              : 'shipment-fin-cost-sec-icon--other'
                    const cliEmoji =
                      sec.id === 'shipping'
                        ? '🚢'
                        : sec.id === 'inland'
                          ? '🚛'
                          : sec.id === 'customs'
                            ? '🏛️'
                            : sec.id === 'insurance'
                              ? '🛡️'
                              : '📦'
                    const sellCardKey = `sell-${sec.id}`
                    const isOpen = expanded.has(sellCardKey)
                    return (
                      <div key={sec.id} className="shipment-fin-card">
                        <button type="button" className="shipment-fin-card__head" onClick={() => toggleCard(sellCardKey)}>
                          <div className="shipment-fin-card__head-main">
                            <span className={`shipment-fin-cost-sec-icon ${iconCls}`.trim()} aria-hidden>
                              {cliEmoji}
                            </span>
                            <div>
                              <div className="shipment-fin-card__title">{sec.label}</div>
                            </div>
                          </div>
                          <div className="shipment-fin-card__head-meta">
                            <span className="shipment-fin-card__subtotal shipment-fin-card__subtotal--badges">
                              <span className="shipment-fin-currency-badge shipment-fin-currency-badge--blue">
                                {t('shipments.fin.cliBadgeCost', { defaultValue: 'تكلفة:' })}{' '}
                                {formatCurrencyBreakdown(secTotals.cost)}
                              </span>
                              <span className="shipment-fin-currency-badge shipment-fin-currency-badge--orange">
                                {t('shipments.fin.cliBadgeSell', { defaultValue: 'سعر:' })}{' '}
                                {formatCurrencyBreakdown(secTotals.sell)}
                              </span>
                              <span className="shipment-fin-currency-badge shipment-fin-currency-badge--green">
                                {t('shipments.fin.cliBadgeProfit', { defaultValue: 'ربح:' })}{' '}
                                {formatCurrencyBreakdown(secTotals.profit)}
                              </span>
                            </span>
                            {isOpen ? <ChevronUp className="shipment-fin-chevron" aria-hidden /> : <ChevronDown className="shipment-fin-chevron" aria-hidden />}
                          </div>
                        </button>
                        {isOpen ? (
                          <div className="shipment-fin-card__body">
                            <div className="shipment-fin-table-wrap shipment-fin-draft-table-wrap shipment-fin-table-wrap--client-scroll">
                              <table className="shipment-fin-line-table shipment-fin-line-table--client-invoice">
                                <thead>
                                  <tr>
                                    <th>{t('shipments.fin.cliColFeeName', { defaultValue: 'Fee Name (full name)' })}</th>
                                    <th>{t('shipments.fin.cliColOriginalCost', { defaultValue: 'Original Cost' })}</th>
                                    <th>{t('shipments.fin.cliColClientPrice', { defaultValue: 'Client Price (editable)' })}</th>
                                    <th>{t('shipments.fin.cliColProfitCalculated', { defaultValue: 'Profit (calculated)' })}</th>
                                    <th>{t('shipments.fin.colCurrency')}</th>
                                    <th className="shipment-fin-th--client-actions">
                                      {t('shipments.fin.cliColActionsHeader', { defaultValue: 'الإجراءات / Actions' })}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {editableSectionRows(sec.id).map((row) => {
                                    const idx = tabBRows.findIndex((r) => r.expenseId === row.expenseId)
                                    const isEditableRow = idx >= 0
                                    const rowCurrency = (row.currency || row.currency_code || 'USD').toUpperCase()
                                    const rowCost = Number(row.cost ?? row.cost_line_total ?? 0) || 0
                                    const sellNum = Number(row.unit_price ?? row.sell ?? 0)
                                    const rowQty = Number(row.quantity ?? 1) || 1
                                    const originalUnitPrice = rowQty > 0 ? rowCost / rowQty : rowCost
                                    const rowSelling = row.line_total != null ? Number(row.line_total) || 0 : sellNum * rowQty
                                    const profit = rowSelling - rowCost
                                    const profitTone = profit > 0 ? 'pos' : profit < 0 ? 'neg' : 'zero'
                                    return (
                                      <tr key={row.id || row.expenseId || row.source_key || `${sec.id}-${row.description}`}>
                                        <td>
                                          <div className="shipment-fin-line-label-wrap shipment-fin-fee-name-readonly">
                                            <span className="shipment-fin-line-label">
                                              {resolveCostItemStyleFeeNameFromRow(row, t, Boolean(shipment?.is_reefer))}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="shipment-fin-num">{formatMoney(originalUnitPrice, numberLocale)}</td>
                                        <td>
                                          {canEditSellingGrid && isEditableRow ? (
                                            <input
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              className="shipment-fin-input shipment-fin-input--num"
                                              value={row.unit_price}
                                              onChange={(e) => patchTabBRow(idx, { unit_price: e.target.value })}
                                            />
                                          ) : (
                                            <span className="shipment-fin-num">{formatMoney(rowSelling || 0, numberLocale)}</span>
                                          )}
                                        </td>
                                        <td className={`shipment-fin-num shipment-fin-profit-cell shipment-fin-profit-cell--${profitTone}`}>
                                          {profit > 0 ? `+${formatMoney(profit, numberLocale)}` : formatMoney(profit, numberLocale)}
                                        </td>
                                        <td className="shipment-fin-cur-cell">{currencyCodePill(rowCurrency)}</td>
                                        <td className="shipment-fin-line-del-cell">
                                          {isEditableRow ? (
                                            <button
                                              type="button"
                                              className="shipment-fin-btn shipment-fin-btn--danger shipment-fin-btn--sm"
                                              onClick={() => setDeletedSellIds((prev) => new Set(prev).add(row.expenseId))}
                                              title={t('shipments.delete')}
                                              aria-label={t('shipments.delete')}
                                            >
                                              ✕
                                            </button>
                                          ) : (
                                            <span className="shipment-fin-line-del-placeholder">—</span>
                                          )}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                            {renderClientInvoiceSecTotal(secTotals, sec.id)}
                            <div className="shipment-fin-client-meta-strip">
                              <span className="shipment-fin-client-meta-strip__lbl">{t('shipments.fin.attachmentsLabel')}</span>
                              <div className="shipment-fin-client-meta-strip__inner">
                                {(sec.attachments || []).length === 0 ? (
                                  <span className="shipment-fin-client-meta-strip__empty">—</span>
                                ) : (
                                  (sec.attachments || []).map((a, i) => {
                                    const canOpen = canOpenShipmentAttachment(a)
                                    return (
                                      <span key={a.id || `${sec.id}-att-${i}`} className="shipment-fin-client-mini-att">
                                        <button
                                          type="button"
                                          className="shipment-fin-client-att-name"
                                          onClick={() => openSectionAttachment(a)}
                                          disabled={!canOpen}
                                          title={canOpen ? t('shipments.fin.viewReceipt') : undefined}
                                        >
                                          {a.name || 'PDF'}
                                        </button>
                                        {canOpen ? (
                                          <button
                                            type="button"
                                            className="shipment-fin-client-att-ico"
                                            onClick={() => downloadSectionAttachment(a)}
                                            title={t('shipments.fin.downloadReceipt')}
                                            aria-label={t('shipments.fin.downloadReceipt')}
                                          >
                                            <FileDown size={12} />
                                          </button>
                                        ) : null}
                                      </span>
                                    )
                                  })
                                )}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )
                  })}

                  <div className="shipment-fin-card">
                    <button type="button" className="shipment-fin-card__head" onClick={() => toggleCard('sell-handling')}>
                      <div className="shipment-fin-card__head-main">
                        <span className="shipment-fin-cost-sec-icon" aria-hidden>
                          💼
                        </span>
                        <div>
                          <div className="shipment-fin-card__title">
                            {t('shipments.fin.sellingSection.handling', { defaultValue: 'Handling Fees — رسوم الخدمة والمتابعة' })}
                          </div>
                        </div>
                      </div>
                      <div className="shipment-fin-card__head-meta">
                        {handlingRow.include ? (
                          <span className="shipment-fin-card__subtotal shipment-fin-card__subtotal--badges">
                            <span className={`shipment-fin-currency-badge ${currencyBadgeClassForCode(handlingRow.currency)}`}>
                              {(handlingRow.currency || 'USD').toUpperCase()} {formatMoney(handlingTotal, numberLocale)}
                            </span>
                          </span>
                        ) : null}
                        {expanded.has('sell-handling') ? (
                          <ChevronUp className="shipment-fin-chevron" aria-hidden />
                        ) : (
                          <ChevronDown className="shipment-fin-chevron" aria-hidden />
                        )}
                      </div>
                    </button>
                    {expanded.has('sell-handling') ? (
                      <div className="shipment-fin-card__body">
                        {handlingRow.include ? (
                          <>
                            <div className="fin-cli-hf-grid">
                              <div className="fin-cli-fg">
                                <label htmlFor="fin-cli-hf-cont">{t('shipments.fin.cliHandlingContainers', { defaultValue: 'عدد الحاويات / No. of Containers' })}</label>
                                <input
                                  id="fin-cli-hf-cont"
                                  type="number"
                                  min="1"
                                  className="shipment-fin-input shipment-fin-input--num"
                                  value={handlingRow.number_of_containers}
                                  onChange={(e) => setHandlingRow((h) => ({ ...h, number_of_containers: e.target.value }))}
                                />
                              </div>
                              <div className="fin-cli-fg">
                                <label htmlFor="fin-cli-hf-fee">{t('shipments.fin.cliHandlingPerUnit', { defaultValue: 'Handling Fee لكل حاوية' })}</label>
                                <input
                                  id="fin-cli-hf-fee"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="shipment-fin-input shipment-fin-input--num"
                                  value={handlingRow.handling_fee_per_container}
                                  onChange={(e) => setHandlingRow((h) => ({ ...h, handling_fee_per_container: e.target.value }))}
                                />
                              </div>
                              <div className="fin-cli-fg">
                                <label htmlFor="fin-cli-hf-cur">{t('shipments.fin.colCurrency')}</label>
                                <select
                                  id="fin-cli-hf-cur"
                                  className="shipment-fin-select shipment-fin-cli-handling-cur"
                                  value={handlingRow.currency || invCurrency}
                                  onChange={(e) => setHandlingRow((h) => ({ ...h, currency: e.target.value }))}
                                >
                                  {CURRENCIES.map((c) => (
                                    <option key={c} value={c}>
                                      {c}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="fin-cli-fg">
                                <label htmlFor="fin-cli-hf-tot">{t('shipments.fin.cliHandlingTotalReadonly', { defaultValue: 'الإجمالي / Total' })}</label>
                                <input
                                  id="fin-cli-hf-tot"
                                  type="text"
                                  readOnly
                                  className="shipment-fin-input shipment-fin-cli-handling-total-ro"
                                  value={`${(handlingRow.currency || 'USD').toUpperCase()} ${formatMoney(handlingTotal, numberLocale)}`}
                                />
                              </div>
                            </div>
                            <div className="shipment-fin-handling-remove-row">
                              <button
                                type="button"
                                className="shipment-fin-btn shipment-fin-btn--secondary shipment-fin-btn--sm"
                                onClick={() => setHandlingRow((h) => ({ ...h, include: false }))}
                              >
                                {t('shipments.delete')}
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="shipment-fin-handling-enable">
                            <button
                              type="button"
                              className="shipment-fin-btn shipment-fin-btn--secondary shipment-fin-btn--sm shipment-fin-btn--dashed"
                              onClick={() => setHandlingRow((h) => ({ ...h, include: true }))}
                            >
                              + {t('shipments.fin.addRow')}
                            </button>
                          </div>
                        )}
                        <div className="shipment-fin-draft-sec-total">
                          <span className="shipment-fin-draft-sec-total__label">{t('shipments.fin.subtotal', { defaultValue: 'Subtotal' })}</span>
                          <span className="shipment-fin-draft-sec-total__tv">
                            <span className="shipment-fin-draft-sec-total__badges">
                              {handlingRow.include ? (
                                <span className={`shipment-fin-currency-badge ${currencyBadgeClassForCode(handlingRow.currency)}`}>
                                  {(handlingRow.currency || 'USD').toUpperCase()} {formatMoney(handlingTotal, numberLocale)}
                                </span>
                              ) : (
                                <span className="shipment-fin-currency-badge shipment-fin-currency-badge--blue">—</span>
                              )}
                            </span>
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="shipment-fin-draft-grand-total">
                    <div className="shipment-fin-draft-grand-top">
                      <div className="shipment-fin-draft-grand-main">
                        <div className="shipment-fin-draft-grand-gl">
                          {t('shipments.fin.clientInvoiceGrandHeading', { defaultValue: 'ملخص فاتورة البيع للعميل' })}
                        </div>
                        <div className="shipment-fin-draft-grand-gv">
                          {formatCurrencyBreakdown(invoiceFinancialOverview.totalSell)}
                        </div>
                        <div className="shipment-fin-draft-grand-gs">
                          {t('shipments.fin.clientInvoiceGrandHint')}
                        </div>
                      </div>
                      <div className="shipment-fin-draft-grand-breakdown">
                        {sellingSections.map((sec) => {
                          const liveRows = editableSectionRows(sec.id)
                          const st = sectionCurrencyTotals(liveRows)
                          return (
                            <div key={sec.id} className="shipment-fin-draft-grand-gb-row">
                              <span className="shipment-fin-draft-grand-gb-lbl">
                                {grandCardBucketEmoji(sec.id)} {grandCardBreakdownLabel(sec)}
                              </span>
                              <span className="shipment-fin-draft-grand-gb-val shipment-fin-draft-grand-gb-val--sell">
                                {formatCurrencyBreakdown(st.sell)}
                              </span>
                            </div>
                          )
                        })}
                        {handlingRow.include && handlingTotal > 0 ? (
                          <div className="shipment-fin-draft-grand-gb-row">
                            <span className="shipment-fin-draft-grand-gb-lbl">
                              💼 {t('shipments.fin.grandCardHandlingLine')}
                            </span>
                            <span className="shipment-fin-draft-grand-gb-val shipment-fin-draft-grand-gb-val--sell">
                              {formatCurrencyBreakdown({
                                [(handlingRow.currency || 'USD').toUpperCase()]: handlingTotal,
                              })}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="shipment-fin-draft-grand-divider" aria-hidden />
                    <div className="shipment-fin-draft-grand-profit-summary">
                      <div className="shipment-fin-draft-grand-ps-item">
                        <div className="shipment-fin-draft-grand-ps-lbl">{t('shipments.fin.grandCardHiddenCost')}</div>
                        <div className="shipment-fin-draft-grand-ps-val shipment-fin-draft-grand-ps-val--muted">
                          {formatCurrencyBreakdown(invoiceFinancialOverview.totalCost)}
                        </div>
                      </div>
                      <div className="shipment-fin-draft-grand-ps-sep" aria-hidden />
                      <div className="shipment-fin-draft-grand-ps-item">
                        <div className="shipment-fin-draft-grand-ps-lbl">{t('shipments.fin.grandCardSellingTotal')}</div>
                        <div className="shipment-fin-draft-grand-ps-val shipment-fin-draft-grand-ps-val--orange">
                          {formatCurrencyBreakdown(invoiceFinancialOverview.totalSell)}
                        </div>
                      </div>
                      <div className="shipment-fin-draft-grand-ps-sep" aria-hidden />
                      <div className="shipment-fin-draft-grand-ps-item">
                        <div className="shipment-fin-draft-grand-ps-lbl">{t('shipments.fin.grandCardHiddenProfit')}</div>
                        <div
                          className={
                            invoiceGrandProfitNet > 0
                              ? 'shipment-fin-draft-grand-ps-val shipment-fin-draft-grand-ps-val--profit-pos'
                              : invoiceGrandProfitNet < 0
                                ? 'shipment-fin-draft-grand-ps-val shipment-fin-draft-grand-ps-val--profit-neg'
                                : 'shipment-fin-draft-grand-ps-val shipment-fin-draft-grand-ps-val--muted'
                          }
                        >
                          {formatCurrencyBreakdown(invoiceFinancialOverview.profit)}
                        </div>
                      </div>
                    </div>
                    <div className="shipment-fin-draft-grand-divider" aria-hidden />
                    <div className="shipment-fin-draft-grand-meta">
                      <div className="shipment-fin-draft-grand-gb-row">
                        <span className="shipment-fin-draft-grand-gb-lbl">
                          {t('shipments.fin.paidAmount', { defaultValue: 'Paid Amount' })}
                        </span>
                        <span className="shipment-fin-draft-grand-gb-val shipment-fin-draft-grand-gb-val--sell">
                          {formatCurrencyBreakdown(invoiceFinancialOverview.paid)}
                        </span>
                      </div>
                      <div className="shipment-fin-draft-grand-gb-row">
                        <span className="shipment-fin-draft-grand-gb-lbl">
                          {t('shipments.fin.remainingAmount', { defaultValue: 'Remaining Balance' })}
                        </span>
                        <span className="shipment-fin-draft-grand-gb-val shipment-fin-draft-grand-gb-val--sell">
                          {formatCurrencyBreakdown(invoiceFinancialOverview.remaining)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {canEditSellingGrid ? (
                    <div className="shipment-fin-draft-actions-footer">
                      <button
                        type="button"
                        className="client-detail-modal__btn client-detail-modal__btn--primary"
                        disabled={notifySending || pricingSaving}
                        onClick={handleSaveSalesInvoice}
                      >
                        {notifySending ? t('shipments.saving') : t('shipments.fin.saveSalesInvoice', { defaultValue: 'حفظ فاتورة المبيعات' })}
                      </button>
                      {clientInvoice?.id ? (
                        <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={handleDownloadInvoicePdf}>
                          {t('shipments.fin.downloadSalesInvoicePdf', { defaultValue: 'تحميل PDF' })}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          )}

          {tab === 'attachments' && (isAccountingUser || isSalesUser) && (
            <div key="attachments" className="shipment-fin-panel shipment-fin-panel--enter">
              <div className="shipment-fin-attachments-header mb-4">
                <div className="fw-600 fs-lg">📎 {t('shipments.tabs.attachments') || 'Shipment Attachments'}</div>
              </div>
              
              {!hasBl ? (
                <p className="client-detail-modal__empty">{t('shipments.financialsNoBl')}</p>
              ) : sellingSections.every((s) => (s.attachments || []).length === 0) ? (
                <div className="shipment-fin-empty-inline shipment-fin-empty-inline--centered shipment-fin-empty-inline--attachments" role="status">
                  <Paperclip size={40} className="shipment-fin-empty-inline__clip" aria-hidden />
                  <p className="shipment-fin-empty-inline__text">{t('shipments.fin.noAssetsAvailable')}</p>
                </div>
              ) : (
                <div className="shipment-fin-attachments-grouped-list">
                  {sellingSections
                    .filter((sec) => ['shipping', 'inland', 'customs', 'insurance'].includes(sec.id))
                    .map((sec) => {
                      const bucketId = sec.id
                      let titleKey = 'shipments.fin.bucketOtherTitle'
                      if (bucketId === 'shipping') titleKey = 'shipments.fin.bucketShippingTitle'
                      else if (bucketId === 'inland') titleKey = 'shipments.fin.bucketInlandTitle'
                      else if (bucketId === 'customs') titleKey = 'shipments.fin.bucketCustomsTitle'
                      else if (bucketId === 'insurance') titleKey = 'shipments.fin.bucketInsuranceTitle'
                      
                      return (
                        <div key={bucketId} className="shipment-fin-attachment-bucket-group mb-6">
                          <h3 className="shipment-fin-bucket-title fs-sm fw-700 mb-2 border-b pb-1 text-primary">
                            {t(titleKey)}
                          </h3>
                          <div className="shipment-fin-table-wrap">
                            <table className="shipment-fin-line-table">
                              <thead>
                                <tr>
                                  <th style={{ width: '120px' }}>{t('shipments.expColDate')}</th>
                                  <th>{t('shipments.fin.attachmentsLabel')}</th>
                                  <th style={{ width: '90px' }}>{t('shipments.fin.colType', { defaultValue: 'Type' })}</th>
                                  <th className="text-center" style={{ width: '160px' }}>{t('shipments.fin.colReceipt')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(sec.attachments || []).length === 0 ? (
                                  <tr>
                                    <td colSpan={4} className="text-center text-muted">—</td>
                                  </tr>
                                ) : (sec.attachments || []).map((ex, idx) => {
                                  const canOpen = canOpenShipmentAttachment(ex)
                                  return (
                                    <tr key={ex.id || `${bucketId}-att-${idx}`}>
                                      <td className="fs-xs">{ex.uploaded_at || '—'}</td>
                                      <td className="fw-500">
                                        {canOpen ? (
                                          <button
                                            type="button"
                                            className="shipment-fin-att-name-link"
                                            onClick={() => openSectionAttachment(ex)}
                                            title={t('shipments.fin.viewReceipt')}
                                          >
                                            {ex.name || t('shipments.fin.unnamedReceipt')}
                                          </button>
                                        ) : (
                                          <span className="shipment-fin-att-name-muted">{ex.name || t('shipments.fin.unnamedReceipt')}</span>
                                        )}
                                      </td>
                                      <td className="fs-xs">{ex.type || 'PDF'}</td>
                                      <td className="text-center">
                                        <div className="shipment-fin-actions__inner">
                                          <button
                                            type="button"
                                            className="shipment-fin-btn shipment-fin-btn--secondary shipment-fin-btn--sm"
                                            onClick={() => downloadSectionAttachment(ex)}
                                            title={t('shipments.fin.downloadReceipt')}
                                            disabled={!canOpen}
                                          >
                                            <FileDown size={12} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )}

          {tab === 'history' && (
            <div key="history" className="shipment-fin-panel shipment-fin-panel--enter">
              <div className="shipment-fin-audit-head">
                <h4 className="shipment-fin-audit-title">{t('shipments.fin.auditTitle')}</h4>
                <span className="fs-xs text-muted">{t('shipments.fin.auditSub')}</span>
              </div>
              {!hasBl ? (
                <p className="client-detail-modal__empty">{t('shipments.financialsNoBl')}</p>
              ) : activityLoading ? (
                <ShipmentFinLoadingSkeleton variant="history" />
              ) : activityRows.length === 0 ? (
                <div className="shipment-fin-audit-empty">
                  <History className="shipment-fin-audit-empty__icon" />
                  <div>{t('shipments.fin.auditEmpty')}</div>
                </div>
              ) : (
                <ul className="shipment-fin-audit-list">
                  {activityRows.map((a) => {
                    const rawEvent = a.event || a.description || ''
                    const eventKey = rawEvent.replace(/\./g, '_')
                    const translatedEvent = t(`shipments.fin.events.${eventKey}`, { defaultValue: rawEvent })
                    
                    const props = a.properties || {}
                    const filteredProps = Object.entries(props).filter(([k]) => k !== 'request' && k !== 'ip')

                    return (
                      <li key={a.id} className="shipment-fin-audit-item">
                        <div className="shipment-fin-audit-item__dot" />
                        <div>
                          <div className="shipment-fin-audit-item__meta">
                            {a.created_at ? String(a.created_at).replace('T', ' ').slice(0, 19) : '—'}
                            {a.causer_id ? ` · ${t('shipments.fin.auditUser')} #${a.causer_id}` : ''}
                          </div>
                          <div className="shipment-fin-audit-item__body">
                            <span className="fw-600">{translatedEvent}</span>
                          </div>
                          {filteredProps.length > 0 && (
                            <div className="shipment-fin-audit-props">
                              {filteredProps.map(([k, v]) => (
                                <span key={k} className="shipment-fin-audit-prop">
                                  <span className="shipment-fin-audit-prop-key">
                                    {t(`shipments.fields.${k}`, { defaultValue: k })}:
                                  </span>
                                  <span className="shipment-fin-audit-prop-val">
                                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                  </span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}

          {tab === 'summary' && (
            <div key="summary" className="shipment-fin-panel shipment-fin-panel--enter">
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
                <div className="font-semibold mb-2">{t('shipments.fin.linkedInvoices', { defaultValue: 'Linked Invoices' })}</div>
                {clientInvoicesList.length === 0 ? (
                  <div className="text-sm text-gray-500">{t('shipments.fin.noLinkedInvoices', { defaultValue: 'No linked invoices yet.' })}</div>
                ) : (
                  <div className="space-y-2">
                    {clientInvoicesList.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between text-sm border rounded-lg px-3 py-2">
                        <div>
                          <div className="font-medium">{inv.invoice_number || `INV-${inv.id}`}</div>
                          <div className="text-gray-500">{formatHumanDate(inv.issue_date)}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{(inv.currency_code || 'USD').toUpperCase()} {formatMoney(Number(inv.amount || 0), numberLocale)}</div>
                          <div className="text-xs text-gray-500">{t(`shipments.fin.invoiceStatusValue.${inv.status || 'unpaid'}`, { defaultValue: inv.status || 'unpaid' })}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="shipment-fin-summary-grid">
                <div className="shipment-fin-summary-card">
                  <div className="shipment-fin-summary-card__label">{t('shipments.fin.summary.totalCost', { defaultValue: 'Total Cost' })}</div>
                  <div className="shipment-fin-summary-card__value text-red-600 font-bold text-2xl">
                    {formatCurrencyBreakdown(invoiceFinancialOverview.totalCost)}
                  </div>
                </div>

                <div className="shipment-fin-summary-card bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/40">
                  <div className="shipment-fin-summary-card__label">{t('shipments.fin.summary.totalSelling', { defaultValue: 'Total Selling' })}</div>
                  <div className="shipment-fin-summary-card__value text-blue-600 font-bold text-2xl">
                    {formatCurrencyBreakdown(invoiceFinancialOverview.totalSell)}
                  </div>
                </div>

                <div className="shipment-fin-summary-card bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/40">
                  <div className="shipment-fin-summary-card__label">{t('shipments.fin.summary.netProfit', { defaultValue: 'Net Profit / Loss' })}</div>
                  <div className="shipment-fin-summary-card__value font-bold text-2xl text-emerald-600">
                    {formatCurrencyBreakdown(invoiceFinancialOverview.profit)}
                  </div>
                </div>

                <div className="shipment-fin-summary-card">
                  <div className="shipment-fin-summary-card__label">{t('shipments.fin.paidAmount', { defaultValue: 'Paid Amount' })}</div>
                  <div className="shipment-fin-summary-card__value font-bold text-2xl">
                    {formatCurrencyBreakdown(invoiceFinancialOverview.paid)}
                  </div>
                </div>

                <div className="shipment-fin-summary-card">
                  <div className="shipment-fin-summary-card__label">{t('shipments.fin.remainingAmount', { defaultValue: 'Remaining Balance' })}</div>
                  <div className="shipment-fin-summary-card__value font-bold text-2xl">
                    {formatCurrencyBreakdown(invoiceFinancialOverview.remaining)}
                  </div>
                </div>

                <div className="shipment-fin-summary-card">
                  <div className="shipment-fin-summary-card__label">{t('shipments.fin.invoiceStatus', { defaultValue: 'Invoice Status' })}</div>
                  <div className="shipment-fin-summary-card__value font-bold text-2xl">
                    {t(`shipments.fin.invoiceStatusValue.${invoiceFinancialOverview.status}`, { defaultValue: invoiceFinancialOverview.status })}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 mt-6">
                <div className="font-semibold mb-2">{t('invoices.payments', 'Payments')}</div>
                {(clientInvoice?.payments || []).length === 0 ? (
                  <div className="text-sm text-gray-500">{t('invoices.noPayments', 'No payments yet')}</div>
                ) : (
                  <div className="space-y-2">
                    {(clientInvoice?.payments || []).map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm border rounded-lg px-3 py-2">
                        <div>
                          <div className="font-medium">{p.method || '—'} • {p.bank_name || p.bank_account_name || t('payments.bankAccountOptional', 'No bank account')}</div>
                          <div className="text-gray-500">{formatHumanDate(p.paid_at || p.created_at)} • {p.invoice_reference || clientInvoice?.invoice_number || `INV-${clientInvoice?.id}`}{p.shipment_reference ? ` • ${p.shipment_reference}` : ''}</div>
                        </div>
                        <div className="font-semibold">{String(p.currency_code || 'USD').toUpperCase()} {formatMoney(Number(p.amount) || 0, numberLocale)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 mt-6">
                <div className="font-semibold mb-2">{t('invoices.timeline.title', 'Financial Timeline')}</div>
                {financialTimelineRows.length === 0 ? (
                  <div className="text-sm text-gray-500">{t('shipments.fin.auditEmpty')}</div>
                ) : (
                  <div className="space-y-2">
                    {financialTimelineRows.map((entry) => (
                      <div key={entry.id} className="flex items-start justify-between border rounded-lg px-3 py-2 text-sm">
                        <div>
                          <div className="font-medium">{entry.title}</div>
                          <div className="text-gray-500">{entry.details || '—'}</div>
                        </div>
                        <div className="text-right">
                          <div>{formatHumanDate(entry.date)}</div>
                          {entry.amount ? <div className="font-semibold">{entry.amount}</div> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  className="client-detail-modal__btn client-detail-modal__btn--primary"
                  disabled={!clientInvoice?.id}
                  onClick={() => setShowPaymentModal(true)}
                >
                  {t('shipments.fin.recordPayment', { defaultValue: 'Record Payment' })}
                </button>
                <button
                  type="button"
                  className="client-detail-modal__btn client-detail-modal__btn--secondary"
                  disabled={!clientInvoice?.id}
                  onClick={handleDownloadInvoicePdf}
                >
                  {t('shipments.fin.printPdf', { defaultValue: 'Print Statement' })}
                </button>
              </div>

              {!isAccountingUser && (
                <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 text-center">
                  <button
                    type="button"
                    className="shipment-fin-cta-btn px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all mx-auto shadow-lg shadow-blue-500/20"
                    disabled={notifySending}
                    onClick={async () => {
                        if (!token || !shipment?.id) return;
                        setNotifySending(true);
                        try {
                            await notifyShipmentSalesFinancials(token, shipment.id);
                            setFinBanner({ type: 'success', message: t('shipments.fin.notifyAccountantOk') });
                            setTimeout(() => setFinBanner(null), 4000);
                        } catch (err) {
                            setFinBanner({ type: 'error', message: err.message || 'Failed to notify' });
                            setTimeout(() => setFinBanner(null), 4000);
                        } finally {
                            setNotifySending(false);
                        }
                    }}
                  >
                    <Bell className="h-4 w-4" aria-hidden />
                    {notifySending ? t('common.loading') : t('shipments.fin.notifyAccountantBtn')}
                  </button>
                </div>
              )}

              {isAccountingUser && (
                <div className="mt-8 p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800 text-center">
                   <h4 className="text-emerald-900 dark:text-emerald-200 font-bold mb-2">{t('shipments.fin.accountantFinalizeTitle')}</h4>
                   <p className="text-emerald-700 dark:text-emerald-300 text-sm mb-4">{t('shipments.fin.accountantFinalizeBody')}</p>
                   <button
                    type="button"
                    className="shipment-fin-cta-btn px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all mx-auto shadow-lg shadow-emerald-500/20"
                    disabled={notifySending}
                    onClick={handleNotifySales}
                   >
                    {notifySending ? t('common.loading') : t('shipments.fin.notifySalesButton')}
                   </button>
                </div>
              )}
            </div>
          )}
          {showPaymentModal ? (
            <div className="shipment-fin-payment-modal-backdrop">
              <div className="shipment-fin-payment-modal">
                <h4>{t('shipments.fin.recordPayment', { defaultValue: 'Record Payment' })}</h4>
                <div className="shipment-fin-payment-grid">
                  <input type="number" min="0.01" step="0.01" placeholder={t('shipments.expColAmount')} value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} />
                  <select value={paymentForm.currency} onChange={(e) => setPaymentForm((p) => ({ ...p, currency: e.target.value }))}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={paymentForm.method} onChange={(e) => setPaymentForm((p) => ({ ...p, method: e.target.value }))}>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="internal_transfer">Internal transfer</option>
                  </select>
                  <select value={paymentForm.bank_account_id} onChange={(e) => setPaymentForm((p) => ({ ...p, bank_account_id: e.target.value }))}>
                    <option value="">{t('partnerLedger.payment.sourceAccount', { defaultValue: 'Bank Account' })}</option>
                    {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.bank_name} - {b.account_name}</option>)}
                  </select>
                  <input type="date" value={paymentForm.paid_at} onChange={(e) => setPaymentForm((p) => ({ ...p, paid_at: e.target.value }))} />
                  <input placeholder={t('shipments.fin.paymentReference')} value={paymentForm.reference} onChange={(e) => setPaymentForm((p) => ({ ...p, reference: e.target.value }))} />
                </div>
                <div className="shipment-fin-pricing-actions mt-3">
                  <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={() => setShowPaymentModal(false)}>{t('common.cancel')}</button>
                  <button type="button" className="client-detail-modal__btn client-detail-modal__btn--primary" disabled={paymentSaving} onClick={submitInvoicePayment}>{paymentSaving ? t('shipments.saving') : t('shipments.fin.recordPayment')}</button>
                </div>
              </div>
            </div>
          ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
