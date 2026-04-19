import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ChevronDown, ChevronUp, FileText, DollarSign, FileType, History, Ship, Car, ShieldCheck, Shield, Package, Upload, Bell, Trash2, Paperclip } from 'lucide-react'
import { createExpense, updateExpense, deleteExpense, uploadExpenseReceipt, downloadExpenseReceipt, listExpenseCategories } from '../../api/expenses'
import {
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  recordInvoicePayment,
  listCurrencies,
} from '../../api/invoices'
import { listActivitiesBySubject } from '../../api/activities'
import { notifyShipmentSalesFinancials } from '../../api/shipments'
import { useAuthAccess } from '../../hooks/useAuthAccess'
import { BUCKET_DEFS, expenseBucket, LINE_TEMPLATES, expenseHaystack, partitionBucketRows } from './shipmentFinUtils'
import '../SDForms/SDForms.css'
import FileUploadButton from '../../components/shared/FileUploadButton'

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
  const map = {}
  for (const r of rows) {
    const cur = (r.currency_code || '—').toUpperCase()
    const amt = Number(r.amount) || 0
    map[cur] = (map[cur] || 0) + amt
  }
  return map
}

function formatMoney(amount, locale) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(amount)
}

function clientLabel(shipment) {
  return shipment?.client?.company_name ?? shipment?.client?.name ?? '—'
}

const CURRENCIES = ['USD', 'EGP', 'EUR']

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
  const s = stored.trim()
  if (s === prefix.trim()) return ''
  const p = `${prefix}:`
  if (s.startsWith(p)) return s.slice(p.length).trim()
  return s
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

  const buildFullDescription = () => {
    if (!tpl) return (desc || '').trim()
    const d = (desc || '').trim()
    return d ? `${descPrefix}: ${d}` : descPrefix
  }

  const handleSave = async () => {
    setRowError(null)
    
    if (!safeExp.id && amount === '' && !desc.trim()) {
      return // skip saving empty template rows
    }

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

  const onReceiptSuccess = () => {
    onSaved?.()
  }

  const onReceiptError = (err) => {
    setRowError(err.message || t('shipments.fin.errorReceipt'))
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
          <FileUploadButton
            collection="receipts"
            fileableType="App\\Models\\Expense"
            fileableId={expense.id}
            accept=".pdf,.png,.jpg,.jpeg"
            onSuccess={onReceiptSuccess}
            onError={onReceiptError}
            className="shipment-fin-upload"
          >
            {() => (
              <div title={t('shipments.fin.uploadReceipt')}>
                <Paperclip className="shipment-fin-upload__icon" aria-hidden />
              </div>
            )}
          </FileUploadButton>
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
        <td>{expense?.currency_code || '—'}</td>
      </tr>
    )
  }

  return (
    <tr key={expense?.id ?? `${tpl?.id || 'null'}-new`}>
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

  const handleSave = async () => {
    setRowError(null)

    if (amount === '' && !desc.trim()) {
      return // skip saving if row is completely empty
    }

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
    const fullDesc = `${prefix}: ${(desc || '').trim() || '—'}`
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
    <tr key={line.tempId} className="shipment-fin-other-pending-row">
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
  const { isAccountant, isAdminRole } = useAuthAccess()
  const isAccountingUser = isAdminRole || isAccountant
  
  const [tab, setTab] = useState('selling')
  const [expanded, setExpanded] = useState(() => new Set(['shipping', 'inland', 'customs', 'insurance', 'other']))
  const [sectionVendorChoice, setSectionVendorChoice] = useState({})
  const [pendingOtherByBucket, setPendingOtherByBucket] = useState({})
  const [batchSavingBucket, setBatchSavingBucket] = useState(null)
  const [finBanner, setFinBanner] = useState(null)
  const [notifySending, setNotifySending] = useState(false)

  const saveHandlersRef = useRef(new Map())
  const bucketBatchKeysRef = useRef({})

  const [clientInvoice, setClientInvoice] = useState(null)
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [pricingSaving, setPricingSaving] = useState(false)
  const [tabBRows, setTabBRows] = useState([])
  const [handlingRow, setHandlingRow] = useState({ sell: '', include: true })

  const [activityRows, setActivityRows] = useState([])
  const [activityLoading, setActivityLoading] = useState(false)

  const [paymentForm, setPaymentForm] = useState({ amount: '', currency_id: '1', method: 'bank', reference: '', paid_at: '' })
  const [paymentSaving, setPaymentSaving] = useState(false)
  const [currencies, setCurrencies] = useState([])

  useEffect(() => {
    if (open && shipment?.id != null) {
      setTab(isAccountingUser ? 'expenses' : 'selling')
      setExpanded(new Set(['shipping', 'inland', 'customs', 'insurance', 'other']))
      setSectionVendorChoice({})
      setPendingOtherByBucket({})
      setFinBanner(null)
      setClientInvoice(null)
      setTabBRows([])
      setHandlingRow({ sell: '', include: true })
      setActivityRows([])
      setPaymentForm({ amount: '', currency_id: '1', method: 'bank', reference: '', paid_at: '' })

      if (token) {
        listCurrencies(token).then(setCurrencies).catch(() => setCurrencies([]))
      }
    }
  }, [open, shipment?.id, isAccountingUser, token])

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
      buckets[expenseBucket(ex)].push(ex)
    }
    return buckets
  }, [expenses])

  const totalsByCurrencyAll = useMemo(() => sumByCurrency(expenses), [expenses])

  const netBreakdownStr = useMemo(() => {
    const parts = Object.entries(totalsByCurrencyAll)
      .filter(([, v]) => v !== 0)
      .map(([c, v]) => `${c} ${formatMoney(v, numberLocale)}`)
    return parts.length ? parts.join(' · ') : '—'
  }, [totalsByCurrencyAll, numberLocale])

  const invoiceDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
        dateStyle: 'medium',
      }).format(new Date())
    } catch {
      return '—'
    }
  }, [i18n.language])

  const printInvoice = useCallback(() => {
    document.body.classList.add('shipment-fin-print-invoice')
    window.print()
    setTimeout(() => document.body.classList.remove('shipment-fin-print-invoice'), 400)
  }, [])

  const registerRowSave = useCallback((key, fn) => {
    saveHandlersRef.current.set(key, fn)
    return () => saveHandlersRef.current.delete(key)
  }, [])

  const applyVendorToSection = useCallback(
    async (bucketId) => {
      if (!token) return
      const raw = sectionVendorChoice[bucketId]
      let vendorId = null
      if (raw != null && raw !== '') {
        const n = Number(raw)
        if (!Number.isNaN(n)) vendorId = n
      }
      const rows = byBucket[bucketId] || []
      try {
        for (const ex of rows) {
          if (ex?.id) {
            await updateExpense(token, ex.id, { vendor_id: vendorId })
          }
        }
        onExpensesChanged?.()
        setFinBanner({ type: 'success', message: t('shipments.fin.vendorApplied') })
      } catch (e) {
        setFinBanner({ type: 'error', message: e?.message || t('shipments.fin.errorSaveLine') })
      }
    },
    [token, byBucket, sectionVendorChoice, onExpensesChanged, t]
  )

  const saveBucketBatch = useCallback(
    async (bucketId) => {
      const keys = bucketBatchKeysRef.current[bucketId] || []
      setBatchSavingBucket(bucketId)
      try {
        for (const k of keys) {
          await saveHandlersRef.current.get(k)?.()
        }
        onExpensesChanged?.()
        setFinBanner({ type: 'success', message: t('shipments.fin.batchSaved') })
      } catch (e) {
        setFinBanner({ type: 'error', message: e?.message || t('shipments.fin.errorSaveLine') })
      } finally {
        setBatchSavingBucket(null)
      }
    },
    [onExpensesChanged, t]
  )

  const addPendingOtherLine = useCallback((bucketId) => {
    setPendingOtherByBucket((prev) => {
      const list = [...(prev[bucketId] || [])]
      list.push({ tempId: `t-${Date.now()}`, desc: '', amount: '', currency: 'USD' })
      return { ...prev, [bucketId]: list }
    })
  }, [])

  const removePendingOtherLine = useCallback((bucketId, tempId) => {
    setPendingOtherByBucket((prev) => ({
      ...prev,
      [bucketId]: (prev[bucketId] || []).filter((l) => l.tempId !== tempId),
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

  const handleSectionUpload = useCallback(async (bucketId, e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !token || !shipment?.id) return
    
    setBatchSavingBucket(bucketId)
    try {
      const categoryCode = otherLineCategoryCode(bucketId)
      const categoryMeta = categoriesByCode[categoryCode]
      if (!categoryMeta?.id) throw new Error(t('shipments.fin.errorNoCategory'))

      const prefix = OTHER_DESC_PREFIX[bucketId] || 'Other'
      const dateStr = new Date().toISOString().slice(0, 10)
      
      const res = await createExpense(token, {
        type: 'shipment',
        shipment_id: shipment.id,
        expense_category_id: categoryMeta.id,
        description: `${prefix}: ${t('shipments.fin.bulkUploadDesc')}`,
        amount: 0,
        currency_code: 'USD',
        expense_date: dateStr,
        vendor_id: sectionVendorChoice[bucketId] || undefined,
      })
      
      const newEx = res?.data ?? res
      if (newEx?.id) {
        await uploadExpenseReceipt(token, newEx.id, file)
      }
      onExpensesChanged?.()
      setFinBanner({ type: 'success', message: t('shipments.fin.receiptUploaded') })
    } catch (err) {
      setFinBanner({ type: 'error', message: err.message || t('shipments.fin.errorReceipt') })
    } finally {
      setBatchSavingBucket(null)
    }
  }, [token, shipment, categoriesByCode, sectionVendorChoice, t, onExpensesChanged])

  const handleNotifySales = useCallback(async () => {
    if (!token || !shipment?.id) return
    setNotifySending(true)
    try {
      await notifyShipmentSalesFinancials(token, shipment.id)
      setFinBanner({ type: 'success', message: t('shipments.fin.notifySalesOk') })
    } catch (e) {
      setFinBanner({ type: 'error', message: e?.message || t('shipments.fin.notifySalesFail') })
    } finally {
      setNotifySending(false)
    }
  }, [token, shipment?.id, t])

  const canAccessInvoices = Boolean(token && (canManageFinancial || canViewSelling))

  useEffect(() => {
    if (!open || !shipment?.id || !token || !canAccessInvoices) return undefined
    if (tab !== 'selling' && tab !== 'invoices') return undefined
    let cancelled = false
    setInvoiceLoading(true)
    listInvoices(token, { shipment_id: shipment.id, invoice_type: 'client' })
      .then(({ data }) => {
        if (cancelled) return undefined
        const list = Array.isArray(data) ? data : []
        const draft = list.find((i) => i.status === 'draft')
        const pick = draft || list[0]
        if (!pick?.id) {
          setClientInvoice(null)
          return undefined
        }
        return getInvoice(token, pick.id).then((full) => {
          if (!cancelled) setClientInvoice(full)
        })
      })
      .catch(() => {
        if (!cancelled) setClientInvoice(null)
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
      setHandlingRow({ sell: '', include: true })
      return
    }
    const items = clientInvoice?.items || []
    const handlingItem = items.find((it) => it.description === HANDLING_FEE_DESCRIPTION)
    setHandlingRow({
      sell: handlingItem != null ? String(handlingItem.unit_price ?? '') : '',
      include: handlingItem ? Number(handlingItem.quantity) > 0 : true,
    })
    setTabBRows(
      expenses.map((ex) => {
        const match = items.find((it) => it.description === ex.description)
        const cost = Number(ex.amount) || 0
        const sellVal = match != null ? Number(match.unit_price) : cost
        const include = match ? Number(match.quantity) > 0 : true
        return {
          expenseId: ex.id,
          description: ex.description,
          category_name: ex.category_name || '—',
          cost,
          currency: ex.currency_code || 'USD',
          sell: Number.isNaN(sellVal) ? '' : String(sellVal),
          include,
        }
      })
    )
  }, [expenses, clientInvoice])

  const savePricingInvoice = useCallback(async () => {
    if (!token || !shipment?.id) return
    if (!shipment.client_id) {
      setFinBanner({ type: 'error', message: t('shipments.fin.invoiceNoClient') })
      return
    }
    const curCode = expenses[0]?.currency_code || 'USD'
    const foundCurrency = currencies.find(c => c.code === curCode)
    const currencyId = foundCurrency?.id || 1
    const items = []
    for (const row of tabBRows) {
      if (!row.include) continue
      const sell = Number(row.sell)
      if (Number.isNaN(sell) || sell < 0) continue
      items.push({ description: row.description, quantity: 1, unit_price: sell })
    }
    if (handlingRow.include) {
      const h = Number(handlingRow.sell)
      if (!Number.isNaN(h) && h >= 0) {
        items.push({ description: HANDLING_FEE_DESCRIPTION, quantity: 1, unit_price: h })
      }
    }
    if (items.length === 0) {
      setFinBanner({ type: 'error', message: t('shipments.fin.pricingNoLines') })
      return
    }
    setPricingSaving(true)
    try {
      let inv = clientInvoice
      if (!inv?.id) {
        inv = await createInvoice(token, {
          invoice_type_id: 0,
          shipment_id: shipment.id,
          client_id: shipment.client_id,
          issue_date: new Date().toISOString().slice(0, 10),
          currency_id: currencyId,
          items,
        })
      } else if (inv.status === 'draft') {
        inv = await updateInvoice(token, inv.id, { items })
      } else {
        setFinBanner({ type: 'error', message: t('shipments.fin.pricingNotDraft') })
        return
      }
      setClientInvoice(inv)
      onShipmentTotalsRefresh?.()
      setFinBanner({ type: 'success', message: t('shipments.fin.pricingSaved') })
    } catch (e) {
      setFinBanner({ type: 'error', message: e?.message || t('shipments.fin.errorSaveLine') })
    } finally {
      setPricingSaving(false)
    }
  }, [
    token,
    shipment,
    expenses,
    tabBRows,
    handlingRow,
    clientInvoice,
    t,
    onShipmentTotalsRefresh,
    currencies,
  ])

  const submitInvoicePayment = useCallback(async () => {
    if (!token || !clientInvoice?.id) return
    const amt = Number(paymentForm.amount)
    if (Number.isNaN(amt) || amt <= 0) {
      setFinBanner({ type: 'error', message: t('shipments.fin.paymentInvalidAmount') })
      return
    }
    const currencyId = Number(paymentForm.currency_id) || 1
    setPaymentSaving(true)
    try {
      const inv = await recordInvoicePayment(token, clientInvoice.id, {
        amount: amt,
        currency_id: currencyId,
        method: paymentForm.method || 'bank',
        reference: paymentForm.reference || null,
        paid_at: paymentForm.paid_at || null,
      })
      setClientInvoice(inv)
      setPaymentForm((f) => ({ ...f, amount: '', reference: '' }))
      onShipmentTotalsRefresh?.()
      setFinBanner({ type: 'success', message: t('shipments.fin.paymentRecorded') })
    } catch (e) {
      setFinBanner({ type: 'error', message: e?.message || t('shipments.fin.paymentFailed') })
    } finally {
      setPaymentSaving(false)
    }
  }, [token, clientInvoice, paymentForm, t, onShipmentTotalsRefresh])

  if (!open || !shipment) return null

  const bl = shipment.bl_number?.trim() || `—`
  const hasBl = Boolean(shipment.bl_number?.trim())
  const isReefer = Boolean(shipment?.is_reefer)
  const editMode = Boolean(token && canManageExpenses && hasBl && shipment?.id)

  const paidTotal = (clientInvoice?.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const netAmt = Number(clientInvoice?.net_amount) || 0
  const remainingInvoice = Math.max(0, netAmt - paidTotal)
  const invCurrency = clientInvoice?.currency_code || 'USD'

  let displayInvoiceDate = invoiceDate
  if (clientInvoice?.issue_date) {
    try {
      displayInvoiceDate = new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(
        new Date(clientInvoice.issue_date)
      )
    } catch {
      displayInvoiceDate = String(clientInvoice.issue_date)
    }
  }

  const tabCItems = clientInvoice?.items
  const tabCInvoiceLines =
    Array.isArray(tabCItems) && tabCItems.length > 0
      ? tabCItems.map((it) => ({
          key: it.id ?? it.description,
          label: it.description,
          amount: Number(it.line_total ?? Number(it.quantity) * Number(it.unit_price)) || 0,
          currency: invCurrency,
        }))
      : expenses.map((ex) => ({
          key: ex.id,
          label: ex.description?.trim() || ex.category_name || '—',
          amount: Number(ex.amount) || 0,
          currency: ex.currency_code || '—',
        }))

  const patchTabBRow = (idx, patch) => {
    setTabBRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  const renderLineLabelCell = (tpl) => (
    <span className="shipment-fin-line-label">
      {t(tpl.labelKey)}
      {tpl.optional ? <span className="shipment-fin-mini-badge">{t('shipments.fin.lines.optionalBadge')}</span> : null}
      {tpl.reeferOnly ? <span className="shipment-fin-mini-badge">{t('shipments.fin.lines.reeferBadge')}</span> : null}
    </span>
  )

  const renderBucketCard = (bucketId, def) => {
    const rows = byBucket[bucketId]
    const Icon = def?.icon ?? Package
    const sums = sumByCurrency(rows)
    const subtotalParts = Object.entries(sums)
      .filter(([, v]) => v !== 0)
      .map(([c, v]) => `${c} ${formatMoney(v, numberLocale)}`)
    const subtotalLabel = subtotalParts.length ? subtotalParts.join(' · ') : formatMoney(0, numberLocale)
    const linesWithAmount = rows.filter((r) => Number(r.amount) > 0)
    const allReceipt = linesWithAmount.length > 0 && linesWithAmount.every((r) => r.has_receipt)
    const partialReceipt = !allReceipt && linesWithAmount.some((r) => r.has_receipt)
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
          <th>{t('shipments.fin.colDescription')}</th>
          <th>{t('shipments.expColAmount')}</th>
          <th>{t('shipments.fin.colCurrency')}</th>
        </tr>
      </thead>
    )

    const renderExpenseCells = (ex) => (
      <>
        <td>{ex?.description?.trim() || ex?.invoice_number || '—'}</td>
        <td className="shipment-fin-num">{formatMoney(Number(ex?.amount) || 0, numberLocale)}</td>
        <td>{ex?.currency_code || '—'}</td>
      </>
    )

    const otherTableHead = (
      <thead>
        <tr>
          <th>{t('shipments.fin.colItem')}</th>
          <th>{t('shipments.fin.colDescription')}</th>
          <th>{t('shipments.expColAmount')}</th>
          <th>{t('shipments.fin.colCurrency')}</th>
        </tr>
      </thead>
    )

    let bodyContent
    if (bucketId === 'other') {
      // "Other" bucket — fully editable in editMode, static in view mode
      const pendingOthers = pendingOtherByBucket['other'] || []
      const otherToolbar = editMode ? (
        <div className="shipment-fin-section-toolbar">
          <select
            className="shipment-fin-select shipment-fin-select--vendor"
            value={sectionVendorChoice['other'] ?? ''}
            onChange={(e) => setSectionVendorChoice((s) => ({ ...s, other: e.target.value }))}
          >
            <option value="">{t('shipments.fin.sectionVendorPlaceholder')}</option>
            {vendors.map((v) => (
              <option key={v.id} value={String(v.id)}>
                {v.name || `#${v.id}`}
              </option>
            ))}
          </select>
          <button type="button" className="shipment-fin-btn shipment-fin-btn--secondary" onClick={() => applyVendorToSection('other')}>
            {t('shipments.fin.applyVendor')}
          </button>
          <button type="button" className="shipment-fin-btn shipment-fin-btn--secondary" onClick={() => addPendingOtherLine('other')}>
            {t('shipments.fin.addRow')}
          </button>
          <FileUploadButton
            onFileSelect={(file) => handleSectionUpload('other', { target: { files: [file] } })}
            accept=".pdf,.png,.jpg,.jpeg"
            className="inline-block"
          >
            {() => (
              <div className="shipment-fin-btn shipment-fin-btn--secondary shipment-fin-section-upload" title={t('shipments.fin.uploadSectionReceipt')}>
                <Paperclip size={14} className="shipment-fin-icon-leading" />
                {t('shipments.fin.uploadReceipt') || 'Upload'}
              </div>
            )}
          </FileUploadButton>
        </div>
      ) : null

      bodyContent = (
        <>
          {otherToolbar}
          {rows.length === 0 && pendingOthers.length === 0 ? (
            <p className="shipment-fin-empty-inline">{t('shipments.fin.bucketOtherEmpty')}</p>
          ) : (
            <div className="shipment-fin-table-wrap">
              <table className="shipment-fin-line-table">
                {otherTableHead}
                <tbody>
                  {rows.map((ex) => (
                    <tr key={ex.id}>
                      <td>—</td>
                      <td>{ex.description?.trim() || ex.invoice_number || '—'}</td>
                      <td className="shipment-fin-num">{formatMoney(Number(ex.amount) || 0, numberLocale)}</td>
                      <td>{ex.currency_code || '—'}</td>
                      {editMode ? (
                        <td className="shipment-fin-actions">
                          <div className="shipment-fin-actions__inner">
                            <button
                              type="button"
                              className="shipment-fin-btn shipment-fin-btn--danger shipment-fin-btn--sm"
                              onClick={async () => {
                                if (!window.confirm(t('shipments.fin.confirmDeleteLine'))) return;
                                try {
                                  await deleteExpense(token, ex.id);
                                  onExpensesChanged?.();
                                } catch (err) {
                                  setFinBanner({ type: 'error', message: err.message || t('shipments.fin.errorDeleteLine') });
                                }
                              }}
                              title={t('shipments.delete')}
                            >
                              <Trash2 size={14} />
                            </button>
                            <button
                              type="button"
                              className="shipment-fin-btn shipment-fin-btn--secondary"
                              onClick={() => handleDownloadReceipt(ex.id)}
                              title={t('shipments.fin.downloadReceipt')}
                            >
                              <Paperclip size={14} />
                            </button>
                            <FileUploadButton
                              collection="receipts"
                              fileableType="App\\Models\\Expense"
                              fileableId={ex.id}
                              accept=".pdf,.png,.jpg,.jpeg"
                              onSuccess={() => onExpensesChanged?.()}
                              onError={(err) => setFinBanner({ type: 'error', message: err })}
                              className="inline-block"
                            >
                              {() => (
                                <div className="shipment-fin-upload" title={t('shipments.fin.uploadReceipt')}>
                                  <Paperclip className="shipment-fin-upload__icon" aria-hidden />
                                </div>
                              )}
                            </FileUploadButton>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                  {pendingOthers.map((line) => (
                    <FinPendingOtherChargeRow
                      key={line.tempId}
                      bucketId="other"
                      line={line}
                      token={token}
                      shipment={shipment}
                      categoriesByCode={categoriesByCode}
                      t={t}
                      editMode={editMode}
                      onSaved={onExpensesChanged}
                      onRemove={() => removePendingOtherLine('other', line.tempId)}
                      sectionVendorId={undefined}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )
    } else {
      const { sections, orphans } = partitionBucketRows(bucketId, rows, isReefer)
      const sectionRows = []
      const batchKeys = []
      for (const { tpl, matched } of sections) {
        const rowsForTpl = matched.length > 0 ? matched : [null]
        rowsForTpl.forEach((ex, idx) => {
          const rowKey = `${bucketId}::${tpl.id}::${ex?.id ?? 'new'}::${idx}`
          batchKeys.push(rowKey)
          sectionRows.push(
            <FinSingleExpenseRow
              key={ex?.id ?? `${bucketId}-${tpl.id}-new-${idx}`}
              tpl={tpl}
              bucketId={bucketId}
              expense={ex}
              showLineLabel={idx === 0}
              shipment={shipment}
              token={token}
              editMode={editMode}
              categoriesByCode={categoriesByCode}
              t={t}
              numberLocale={numberLocale}
              renderLineLabelCell={renderLineLabelCell}
              onSaved={onExpensesChanged}
              saveRegisterKey={editMode ? rowKey : null}
              onRegisterSave={editMode ? registerRowSave : null}
              sectionVendorId={sectionVendorChoice[bucketId]}
            />
          )
        })
      }
      const pendingOthers = pendingOtherByBucket[bucketId] || []
      for (const line of pendingOthers) {
        sectionRows.push(
          <FinPendingOtherChargeRow
            key={line.tempId}
            bucketId={bucketId}
            line={line}
            token={token}
            shipment={shipment}
            categoriesByCode={categoriesByCode}
            t={t}
            editMode={editMode}
            onSaved={onExpensesChanged}
            onRemove={() => removePendingOtherLine(bucketId, line.tempId)}
            sectionVendorId={sectionVendorChoice[bucketId]}
          />
        )
      }
      if (orphans.length > 0) {
        sectionRows.push(
          <tr key="__orphan-sep" className="shipment-fin-template-sep">
            <td colSpan={editMode ? 7 : 6}>{t('shipments.fin.otherPosted')}</td>
          </tr>
        )
        orphans.forEach((ex) => {
          sectionRows.push(
            <tr key={ex.id}>
              <td>—</td>
              {renderExpenseCells(ex)}
            </tr>
          )
        })
      }
      // Always show receipt download indicators per row (for non-'other' buckets)
      if (rows.filter((r) => r.has_receipt).length > 0) {
        sectionRows.push(
          <tr key="__receipts-header" className="shipment-fin-template-sep">
            <td colSpan={editMode ? 7 : 6}>📎 {t('shipments.fin.attachmentsLabel')}</td>
          </tr>
        )
        rows.filter((r) => r.has_receipt).forEach((ex) => {
          sectionRows.push(
            <tr key={`receipt-${ex.id}`} className="shipment-fin-receipt-row">
              <td colSpan={2}>{ex.description?.trim() || '—'}</td>
              <td colSpan={2}>
                <button type="button" className="shipment-fin-btn shipment-fin-btn--secondary" onClick={() => handleDownloadReceipt(ex.id)}>
                  <Paperclip size={14} className="shipment-fin-icon-leading" />
                  {t('shipments.fin.downloadReceipt')}
                </button>
              </td>
              {editMode ? <td /> : null}
            </tr>
          )
        })
      }

      bucketBatchKeysRef.current[bucketId] = batchKeys

      const sectionToolbar =
        editMode ? (
          <div className="shipment-fin-section-toolbar">
            <select
              className="shipment-fin-select shipment-fin-select--vendor"
              value={sectionVendorChoice[bucketId] ?? ''}
              onChange={(e) => setSectionVendorChoice((s) => ({ ...s, [bucketId]: e.target.value }))}
            >
              <option value="">{t('shipments.fin.sectionVendorPlaceholder')}</option>
              {vendors.map((v) => (
                <option key={v.id} value={String(v.id)}>
                  {v.name || `#${v.id}`}
                </option>
              ))}
            </select>
            <button type="button" className="shipment-fin-btn shipment-fin-btn--secondary" onClick={() => applyVendorToSection(bucketId)}>
              {t('shipments.fin.applyVendor')}
            </button>
            <button type="button" className="shipment-fin-btn shipment-fin-btn--secondary" onClick={() => addPendingOtherLine(bucketId)}>
              {t('shipments.fin.addRow')}
            </button>
            <FileUploadButton
              onFileSelect={(file) => handleSectionUpload(bucketId, { target: { files: [file] } })}
              accept=".pdf,.png,.jpg,.jpeg"
              className="inline-block"
            >
              {() => (
                <div className="shipment-fin-btn shipment-fin-btn--secondary shipment-fin-section-upload" title={t('shipments.fin.uploadSectionReceipt')}>
                  <Paperclip size={14} className="shipment-fin-icon-leading" />
                  {t('shipments.fin.uploadReceipt')}
                </div>
              )}
            </FileUploadButton>
            <button
              type="button"
              className="shipment-fin-btn shipment-fin-btn--primary"
              disabled={batchSavingBucket === bucketId}
              onClick={() => saveBucketBatch(bucketId)}
            >
              {batchSavingBucket === bucketId ? t('shipments.saving') : t('shipments.fin.saveSection')}
            </button>
          </div>
        ) : null

      bodyContent = (
        <>
          {sectionToolbar}
          <div className="shipment-fin-table-wrap">
            <table className="shipment-fin-line-table">
              {tableHead}
              <tbody>{sectionRows}</tbody>
            </table>
          </div>
        </>
      )
    }

    return (
      <div key={bucketId} className="shipment-fin-card">
        <button type="button" className="shipment-fin-card__head" onClick={() => toggleCard(bucketId)}>
          <div className="shipment-fin-card__head-main">
            <Icon className="shipment-fin-card__icon" aria-hidden />
            <div>
              <div className="shipment-fin-card__title">{t(def.titleKey)}</div>
              <div className="shipment-fin-card__sub">{t(def.subKey)}</div>
            </div>
          </div>
          <div className="shipment-fin-card__head-meta">
            <span className="shipment-fin-card__subtotal">{subtotalLabel}</span>
            <span className={`shipment-fin-badge ${receiptBadgeClass}`}>{t(receiptBadgeKey)}</span>
            {isOpen ? <ChevronUp className="shipment-fin-chevron" /> : <ChevronDown className="shipment-fin-chevron" />}
          </div>
        </button>
        {isOpen && <div className="shipment-fin-card__body">{bodyContent}</div>}
      </div>
    )
  }

  const otherDef = {
    icon: Package,
    titleKey: 'shipments.fin.bucketOtherTitle',
    subKey: 'shipments.fin.bucketOtherSub',
  }

  return (
    <div className="client-detail-modal shipments-no-print shipment-fin-modal-root" role="dialog" aria-modal="true" aria-labelledby="shipment-fin-modal-title">
      <div className="client-detail-modal__backdrop" onClick={onClose} />
      <div className="client-detail-modal__box client-detail-modal__box--form shipment-fin-modal__box">
        <header className="client-detail-modal__header client-detail-modal__header--form shipment-fin-modal__header">
          <div className="client-detail-modal__header-inner">
            <span className="client-detail-modal__header-label">{t('shipments.financialsModalTitle')}</span>
            <h2 id="shipment-fin-modal-title" className="client-detail-modal__title shipment-fin-modal__title-bl">
              {bl}
            </h2>
            <div className="sd-form-modal-preview__hint">{clientLabel(shipment)}</div>
          </div>
          <button type="button" className="client-detail-modal__close" onClick={onClose} aria-label={t('shipments.close')}>
            <X className="client-detail-modal__close-icon" aria-hidden />
          </button>
        </header>

        <div className="shipment-fin-tab-bar" role="tablist">
          {isAccountingUser && (
            <button type="button" role="tab" aria-selected={tab === 'expenses'} className={`shipment-fin-tab ${tab === 'expenses' ? 'shipment-fin-tab--active' : ''}`} onClick={() => setTab('expenses')}>
              <Package className="shipment-fin-tab__icon" aria-hidden />
              {t('shipments.financialsTab.expenses')}
            </button>
          )}
          <button type="button" role="tab" aria-selected={tab === 'selling'} className={`shipment-fin-tab ${tab === 'selling' ? 'shipment-fin-tab--active' : ''}`} onClick={() => setTab('selling')}>
            <DollarSign className="shipment-fin-tab__icon" aria-hidden />
            {t('shipments.financialsTab.selling')}
          </button>
          {isAccountingUser && (
            <button type="button" role="tab" aria-selected={tab === 'invoices'} className={`shipment-fin-tab ${tab === 'invoices' ? 'shipment-fin-tab--active' : ''}`} onClick={() => setTab('invoices')}>
              <FileType className="shipment-fin-tab__icon" aria-hidden />
              {t('shipments.financialsTab.invoices')}
            </button>
          )}
          {isAccountingUser && (
            <button type="button" role="tab" aria-selected={tab === 'attachments'} className={`shipment-fin-tab ${tab === 'attachments' ? 'shipment-fin-tab--active' : ''}`} onClick={() => setTab('attachments')}>
              <Paperclip className="shipment-fin-tab__icon" aria-hidden />
              {t('shipments.financialsTab.attachments', { defaultValue: 'Attachments' })}
              {expenses.filter((e) => e.has_receipt).length > 0 && (
                <span className="shipment-fin-tab-badge">{expenses.filter((e) => e.has_receipt).length}</span>
              )}
            </button>
          )}
          <button type="button" role="tab" aria-selected={tab === 'summary'} className={`shipment-fin-tab ${tab === 'summary' ? 'shipment-fin-tab--active' : ''}`} onClick={() => setTab('summary')}>
            <FileText className="shipment-fin-tab__icon" aria-hidden />
            {t('shipments.financialsTab.summary')}
          </button>
          <button type="button" role="tab" aria-selected={tab === 'history'} className={`shipment-fin-tab ${tab === 'history' ? 'shipment-fin-tab--active' : ''}`} onClick={() => setTab('history')}>
            <History className="shipment-fin-tab__icon" aria-hidden />
            {t('shipments.fin.tabD')}
          </button>
        </div>

        <div className="client-detail-modal__body client-detail-modal__body--form shipment-fin-modal__body">
          {finBanner ? (
            <div className={`shipment-fin-flash shipment-fin-flash--${finBanner.type}`} role="status">
              {finBanner.message}
            </div>
          ) : null}
          <div className="client-detail-modal__body-inner clients-form-sections">
          {tab === 'expenses' && isAccountingUser && (
            <div key="expenses" className="shipment-fin-panel shipment-fin-panel--enter">
              {!hasBl ? (
                <p className="client-detail-modal__empty">{t('shipments.financialsNoBl')}</p>
              ) : loading ? (
                <ShipmentFinLoadingSkeleton variant="expenses" />
              ) : (
                <>
                  {editMode ? <p className="shipment-fin-tab-a-hint">{t('shipments.fin.tabAEditHint')}</p> : null}
                  {BUCKET_DEFS.map((d) => renderBucketCard(d.id, d))}
                  {renderBucketCard('other', otherDef)}
                  <div className="shipment-fin-total-bar">
                    <div className="shipment-fin-total-bar__label">
                      <span className="fw-700">{t('shipments.fin.netCostLabel')}</span>
                    </div>
                    <div className="shipment-fin-total-bar__vals">
                      <span className="shipment-fin-total-bar__break text-muted">{netBreakdownStr}</span>
                      <span className="shipment-fin-grand">
                        {shipment.cost_total != null
                          ? formatMoney(Number(shipment.cost_total), numberLocale)
                          : Object.values(totalsByCurrencyAll).reduce((a, b) => a + b, 0) > 0
                            ? t('shipments.fin.seeBreakdown')
                            : '—'}
                      </span>
                    </div>
                  </div>
                  {shipment.cost_total != null && (
                    <p className="shipment-fin-hint text-muted fs-xs">{t('shipments.fin.netCostHint')}</p>
                  )}
                  <p className="shipment-fin-notify-hint text-center text-muted fs-sm">{t('shipments.fin.notifySalesHint')}</p>
                  {canNotifySales ? (
                    <div className="shipment-fin-notify-actions">
                      <button
                        type="button"
                        className="client-detail-modal__btn client-detail-modal__btn--primary"
                        disabled={notifySending}
                        onClick={handleNotifySales}
                      >
                        <Bell className="shipment-fin-notify-icon" aria-hidden />
                        {notifySending ? t('shipments.saving') : t('shipments.fin.notifySalesButton')}
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          )}

          {tab === 'selling' && (
            <div key="selling" className="shipment-fin-panel shipment-fin-panel--enter">
              <div className="shipment-fin-sales-banner">
                <div className="fw-600">{t('shipments.fin.salesBannerTitle')}</div>
                <div className="fs-xs text-muted">{t('shipments.fin.salesBannerSub')}</div>
              </div>
              {!hasBl ? (
                <p className="client-detail-modal__empty">{t('shipments.financialsNoBl')}</p>
              ) : loading || invoiceLoading ? (
                <ShipmentFinLoadingSkeleton variant="selling" />
              ) : expenses.length === 0 ? (
                <p className="client-detail-modal__empty">{t('shipments.fin.tabBEmpty')}</p>
              ) : (
                <>
                  <p className="shipment-fin-hint text-muted fs-xs mb-2">{t('shipments.fin.tabBInvoiceHint')}</p>
                  <div className="shipment-fin-table-wrap">
                    <table className="shipment-fin-sell-table shipment-fin-sell-table--wide">
                      <thead>
                        <tr>
                          <th>{t('shipments.fin.colVendorType')}</th>
                          <th>{t('shipments.fin.colCharge')}</th>
                          <th>{t('shipments.fields.cost_total')}</th>
                          {canViewSelling && canManageFinancial ? <th className="shipment-fin-th-center">{t('shipments.fin.colInclude')}</th> : null}
                          {canViewSelling && <th>{t('shipments.fin.colSell')}</th>}
                          <th>{t('shipments.fin.colCurrency')}</th>
                          <th>{t('shipments.fin.colMargin')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tabBRows.map((row, idx) => {
                          const sellNum = Number(row.sell)
                          const margin =
                            canViewSelling && !Number.isNaN(sellNum) ? sellNum - row.cost : null
                          return (
                            <tr key={row.expenseId}>
                              <td>{row.category_name || '—'}</td>
                              <td>{row.description?.trim() || '—'}</td>
                              <td className="shipment-fin-num">{formatMoney(row.cost, numberLocale)}</td>
                              {canViewSelling && canManageFinancial ? (
                                <td className="shipment-fin-td-center">
                                  <input
                                    type="checkbox"
                                    checked={row.include}
                                    onChange={(e) => patchTabBRow(idx, { include: e.target.checked })}
                                    disabled={!canManageFinancial}
                                    aria-label={t('shipments.fin.colInclude')}
                                  />
                                </td>
                              ) : null}
                              {canViewSelling ? (
                                <td>
                                  {canManageFinancial ? (
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className="shipment-fin-input shipment-fin-input--num"
                                      value={row.sell}
                                      onChange={(e) => patchTabBRow(idx, { sell: e.target.value })}
                                    />
                                  ) : (
                                    <span className="shipment-fin-num">{formatMoney(sellNum || 0, numberLocale)}</span>
                                  )}
                                </td>
                              ) : null}
                              <td>{row.currency || '—'}</td>
                              <td className="shipment-fin-num text-muted">
                                {margin != null && !Number.isNaN(margin) ? formatMoney(margin, numberLocale) : '—'}
                              </td>
                            </tr>
                          )
                        })}
                        {canViewSelling ? (
                          <tr className="shipment-fin-handling-row">
                            <td className="fw-600" colSpan={2}>
                              {t('shipments.fin.handlingFee')}
                            </td>
                            <td className="shipment-fin-num">—</td>
                            {canManageFinancial ? (
                              <td className="shipment-fin-td-center">
                                <input
                                  type="checkbox"
                                  checked={handlingRow.include}
                                  onChange={(e) => setHandlingRow((h) => ({ ...h, include: e.target.checked }))}
                                  aria-label={t('shipments.fin.colInclude')}
                                />
                              </td>
                            ) : null}
                            <td className="shipment-fin-num">
                              {canManageFinancial ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="shipment-fin-input shipment-fin-input--num"
                                  value={handlingRow.sell}
                                  onChange={(e) => setHandlingRow((h) => ({ ...h, sell: e.target.value }))}
                                />
                              ) : (
                                formatMoney(Number(handlingRow.sell) || 0, numberLocale)
                              )}
                            </td>
                            <td>{invCurrency}</td>
                            <td className="text-muted">—</td>
                          </tr>
                        ) : null}
                      </tbody>
                      <tfoot>
                        <tr className="shipment-fin-foot-row">
                          <td colSpan={2} className="fw-700">
                            {t('shipments.fin.footerTotalCost')}
                          </td>
                          <td className="shipment-fin-num fw-700">
                            {shipment.cost_total != null ? formatMoney(Number(shipment.cost_total), numberLocale) : '—'}
                          </td>
                          {canViewSelling && canManageFinancial ? <td /> : null}
                          {canViewSelling ? <td /> : null}
                          <td colSpan={2} className="text-muted fs-xs">
                            {t('shipments.fin.footerByCurrency')}
                            {Object.entries(totalsByCurrencyAll)
                              .filter(([, v]) => v !== 0)
                              .map(([c, v]) => (
                                <span key={c} className="shipment-fin-cur-pill">
                                  {c}: <strong>{formatMoney(v, numberLocale)}</strong>
                                </span>
                              ))}
                          </td>
                        </tr>
                        {canViewSelling && (
                          <>
                            <tr className="shipment-fin-foot-row">
                              <td colSpan={2} className="fw-700">
                                {t('shipments.fields.selling_price_total')}
                              </td>
                              <td />
                              {canManageFinancial ? <td /> : null}
                              <td className="shipment-fin-num fw-700">
                                {shipment.selling_price_total != null ? formatMoney(Number(shipment.selling_price_total), numberLocale) : '—'}
                              </td>
                              <td colSpan={2} className="text-muted fs-xs">
                                {clientInvoice?.invoice_number ? `${t('shipments.fin.invoiceRef')}: ${clientInvoice.invoice_number}` : t('shipments.fin.draftPricingInvoice')}
                              </td>
                            </tr>
                            <tr className="shipment-fin-foot-row shipment-fin-foot-row--profit">
                              <td colSpan={2} className="fw-700">
                                {t('shipments.fields.profit_total')}
                              </td>
                              <td />
                              {canManageFinancial ? <td /> : null}
                              <td className="shipment-fin-num fw-700 text-emerald-600">
                                {shipment.profit_total != null ? formatMoney(Number(shipment.profit_total), numberLocale) : '—'}
                              </td>
                              <td colSpan={2} className="text-muted fs-xs">
                                {t('shipments.fin.marginNote')}
                              </td>
                            </tr>
                          </>
                        )}
                      </tfoot>
                    </table>
                  </div>
                  {canManageFinancial ? (
                    <div className="shipment-fin-pricing-actions mt-3">
                      <button
                        type="button"
                        className="client-detail-modal__btn client-detail-modal__btn--primary"
                        disabled={pricingSaving}
                        onClick={savePricingInvoice}
                      >
                        {pricingSaving ? t('shipments.saving') : t('shipments.fin.saveSalesPricing')}
                      </button>
                    </div>
                  ) : null}
                  <p className="shipment-fin-hint text-muted fs-xs mt-3">{t('shipments.fin.savePricingHint')}</p>
                </>
              )}
            </div>
          )}

          {tab === 'invoices' && isAccountingUser && (
            <div key="invoices" className="shipment-fin-panel shipment-fin-panel--enter">
              {!hasBl ? (
                <p className="client-detail-modal__empty">{t('shipments.financialsNoBl')}</p>
              ) : invoiceLoading ? (
                <ShipmentFinLoadingSkeleton variant="invoice" />
              ) : (
                <>
                  <div className="shipment-fin-client-invoice shipment-fin-print-target">
                    <div className="shipment-fin-invoice-head">
                      <div>
                        <div className="shipment-fin-invoice-brand">{t('common.brand')}</div>
                        <div className="fs-xs text-muted">{t('shipments.fin.invoiceTagline')}</div>
                      </div>
                      <div className="shipment-fin-invoice-head-right">
                        <div className="shipment-fin-invoice-word">{t('shipments.fin.invoiceWord')}</div>
                        <div className="fw-600">{bl}</div>
                        {clientInvoice?.invoice_number ? (
                          <div className="fs-xs text-muted">
                            {t('shipments.fin.invoiceNumberLabel')}: {clientInvoice.invoice_number}
                          </div>
                        ) : null}
                        <div className="fs-xs text-muted">{displayInvoiceDate}</div>
                      </div>
                    </div>
                    <div className="shipment-fin-invoice-to">
                      <div className="fs-xs text-muted">{t('shipments.fin.billTo')}</div>
                      <div className="fw-700">{clientLabel(shipment)}</div>
                    </div>
                    <table className="shipment-fin-invoice-table">
                      <thead>
                        <tr>
                          <th>{t('shipments.fin.colLine')}</th>
                          <th>{t('shipments.expColAmount')}</th>
                          <th>{t('shipments.fin.colCurrency')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tabCInvoiceLines.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="text-center text-muted py-4">
                              {t('shipments.fin.invoiceLinesEmpty')}
                            </td>
                          </tr>
                        ) : (
                          tabCInvoiceLines.map((line) => (
                            <tr key={line.key}>
                              <td>{line.label}</td>
                              <td className="shipment-fin-num">{formatMoney(line.amount, numberLocale)}</td>
                              <td>{line.currency}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {tabCInvoiceLines.length > 0 && clientInvoice?.id ? (
                        <tfoot>
                          <tr>
                            <td className="fw-700">{t('shipments.fin.invoiceNet')}</td>
                            <td className="fw-700 shipment-fin-num">{formatMoney(netAmt, numberLocale)}</td>
                            <td className="text-muted fs-xs">{invCurrency}</td>
                          </tr>
                        </tfoot>
                      ) : null}
                    </table>
                  </div>

                  <div className="shipment-fin-invoice-actions">
                    <div className="shipment-fin-invoice-card">
                      <p className="fw-700 fs-sm mb-2">{t('shipments.fin.sendInvoice')}</p>
                      <div className="shipment-fin-stack">
                        <button type="button" className="client-detail-modal__btn client-detail-modal__btn--primary" onClick={printInvoice}>
                          {t('shipments.fin.printPdf')}
                        </button>
                        <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" disabled title={t('shipments.fin.emailSoon')}>
                          {t('shipments.fin.emailInvoice')}
                        </button>
                      </div>
                    </div>
                    <div className="shipment-fin-invoice-card">
                      <p className="fw-700 fs-sm mb-2">{t('shipments.fin.invoiceStatus')}</p>
                      <p className="text-muted fs-xs mb-2">{t('shipments.fin.invoiceStatusHint')}</p>
                      <span
                        className={`shipment-fin-badge ${
                          clientInvoice?.status === 'paid'
                            ? 'shipment-fin-badge--ok'
                            : clientInvoice?.status === 'partial'
                              ? 'shipment-fin-badge--partial'
                              : 'shipment-fin-badge--draft'
                        }`}
                      >
                        {clientInvoice?.status
                          ? t(`shipments.fin.invoiceStatusValue.${clientInvoice.status}`, { defaultValue: clientInvoice.status })
                          : t('shipments.fin.noClientInvoiceYet')}
                      </span>
                      <div className="shipment-fin-payment-summary">
                        <div>
                          <div className="fs-xs text-muted">{t('shipments.fin.paidAmount')}</div>
                          <div className="fw-700">{formatMoney(paidTotal, numberLocale)}</div>
                        </div>
                        <div>
                          <div className="fs-xs text-muted">{t('shipments.fin.remainingAmount')}</div>
                          <div className="fw-700">{formatMoney(remainingInvoice, numberLocale)}</div>
                        </div>
                      </div>
                      {clientInvoice?.payments?.length ? (
                        <ul className="shipment-fin-payment-list fs-xs text-muted mt-2">
                          {clientInvoice.payments.map((p) => (
                            <li key={p.id}>
                              {p.paid_at ? String(p.paid_at).slice(0, 10) : '—'} · {formatMoney(Number(p.amount) || 0, numberLocale)}{' '}
                              {p.currency_code || invCurrency} · {p.method || '—'}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>

                  <div className="shipment-fin-payment-section">
                    <div className="shipment-fin-payment-section__head">
                      <span className="fw-600">{t('shipments.fin.addPaymentTitle')}</span>
                    </div>
                    {canManageFinancial && clientInvoice?.id ? (
                      <div className="shipment-fin-payment-form px-4 py-3">
                        <div className="shipment-fin-payment-form__grid">
                          <label className="shipment-fin-payment-field">
                            <span className="fs-xs text-muted">{t('shipments.expColAmount')}</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="shipment-fin-input shipment-fin-input--num"
                              value={paymentForm.amount}
                              onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                            />
                          </label>
                          <label className="shipment-fin-payment-field">
                            <span className="fs-xs text-muted">{t('shipments.fin.colCurrency')}</span>
                            <select
                              className="shipment-fin-select"
                              value={paymentForm.currency_id}
                              onChange={(e) => setPaymentForm((f) => ({ ...f, currency_id: e.target.value }))}
                            >
                              <option value="1">USD</option>
                              <option value="2">EGP</option>
                              <option value="3">EUR</option>
                            </select>
                          </label>
                          <label className="shipment-fin-payment-field">
                            <span className="fs-xs text-muted">{t('shipments.fin.paymentMethod')}</span>
                            <input
                              type="text"
                              className="shipment-fin-input"
                              value={paymentForm.method}
                              onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))}
                            />
                          </label>
                          <label className="shipment-fin-payment-field">
                            <span className="fs-xs text-muted">{t('shipments.fin.paymentReference')}</span>
                            <input
                              type="text"
                              className="shipment-fin-input"
                              value={paymentForm.reference}
                              onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))}
                            />
                          </label>
                          <label className="shipment-fin-payment-field">
                            <span className="fs-xs text-muted">{t('shipments.fin.paymentDate')}</span>
                            <input
                              type="date"
                              className="shipment-fin-input"
                              value={paymentForm.paid_at}
                              onChange={(e) => setPaymentForm((f) => ({ ...f, paid_at: e.target.value }))}
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          className="client-detail-modal__btn client-detail-modal__btn--primary mt-2"
                          disabled={paymentSaving}
                          onClick={submitInvoicePayment}
                        >
                          {paymentSaving ? t('shipments.saving') : t('shipments.fin.recordPayment')}
                        </button>
                      </div>
                    ) : (
                      <p className="text-muted fs-xs px-4 py-3 mb-0">{t('shipments.fin.addPaymentHint')}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'attachments' && isAccountingUser && (
            <div key="attachments" className="shipment-fin-panel shipment-fin-panel--enter">
              <div className="shipment-fin-attachments-header mb-4">
                <div className="fw-600 fs-lg">📎 {t('shipments.tabs.attachments') || 'Shipment Attachments'}</div>
                <div className="fs-xs text-muted">{t('shipments.tabs.attachmentsHint') || 'All uploaded receipts and documents grouped by financial category.'}</div>
              </div>
              
              {!hasBl ? (
                <p className="client-detail-modal__empty">{t('shipments.financialsNoBl')}</p>
              ) : expenses.filter((e) => e.has_receipt).length === 0 ? (
                <div className="shipment-fin-empty-inline py-12">
                  <Paperclip size={48} className="text-muted mb-3 opacity-20" />
                  <p>{t('shipments.tabs.noAttachments') || 'No attachments found for this shipment.'}</p>
                </div>
              ) : (
                <div className="shipment-fin-attachments-grouped-list">
                  {Object.entries(byBucket)
                    .filter(([_, bucketRows]) => bucketRows.some(e => e.has_receipt))
                    .map(([bucketId, bucketRows]) => {
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
                                  <th style={{ width: '100px' }}>{t('shipments.expColDate')}</th>
                                  <th>{t('shipments.fin.colDescription')}</th>
                                  <th>{t('shipments.fin.colVendor')}</th>
                                  <th className="text-right">{t('shipments.expColAmount')}</th>
                                  <th className="text-center" style={{ width: '120px' }}>{t('shipments.fin.colReceipt')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {bucketRows.filter(e => e.has_receipt).map(ex => (
                                  <tr key={ex.id}>
                                    <td className="fs-xs text-muted">{ex.expense_date || '—'}</td>
                                    <td className="fw-500">{ex.description?.trim() || t('shipments.fin.unnamedReceipt')}</td>
                                    <td className="fs-xs">{ex.vendor?.name || '—'}</td>
                                    <td className="shipment-fin-num no-wrap">
                                      {formatMoney(Number(ex.amount) || 0, numberLocale)} <span className="text-muted fs-xxs">{ex.currency_code}</span>
                                    </td>
                                    <td className="text-center">
                                      <button 
                                        type="button" 
                                        className="shipment-fin-btn shipment-fin-btn--secondary shipment-fin-btn--sm" 
                                        onClick={() => handleDownloadReceipt(ex.id)}
                                      >
                                        <Paperclip size={12} className="mr-1" />
                                        {t('shipments.fin.downloadReceipt')}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
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
              <div className="shipment-fin-summary-grid">
                <div className="shipment-fin-summary-card">
                  <div className="shipment-fin-summary-card__label">{t('shipments.fin.summary.totalCost')}</div>
                  <div className="shipment-fin-summary-card__value text-red-600 font-bold text-2xl">
                    {formatMoney(shipment.cost_total || 0, numberLocale)}
                  </div>
                  <div className="fs-xs text-muted mt-1">{netBreakdownStr}</div>
                </div>

                <div className="shipment-fin-summary-card bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/40">
                  <div className="shipment-fin-summary-card__label">{t('shipments.fin.summary.totalSelling')}</div>
                  <div className="shipment-fin-summary-card__value text-blue-600 font-bold text-2xl">
                    {formatMoney(shipment.selling_price_total || 0, numberLocale)}
                  </div>
                  <div className="fs-xs text-muted mt-1">{clientInvoice?.currency_code || 'USD'}</div>
                </div>

                <div className="shipment-fin-summary-card bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/40">
                  <div className="shipment-fin-summary-card__label">{t('shipments.fin.summary.netProfit')}</div>
                  <div className={`shipment-fin-summary-card__value font-bold text-2xl ${(shipment.profit_total || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatMoney(shipment.profit_total || 0, numberLocale)}
                  </div>
                  <div className="fs-xs text-muted mt-1">
                    {t('shipments.fin.summary.margin')}: {shipment.selling_price_total ? ((shipment.profit_total / shipment.selling_price_total) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </div>

              {!isAccountingUser && (
                <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 text-center">
                  <h4 className="text-blue-900 dark:text-blue-200 font-bold mb-2">{t('shipments.fin.salesNotifyTitle')}</h4>
                  <p className="text-blue-700 dark:text-blue-300 text-sm mb-4">{t('shipments.fin.salesNotifyBody')}</p>
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
          </div>
        </div>
      </div>
    </div>
  )
}
