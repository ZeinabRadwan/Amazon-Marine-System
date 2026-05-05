import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ChevronDown, ChevronUp, FileText, DollarSign, FileType, History, Ship, Car, ShieldCheck, Shield, Package, Upload, Trash2, Paperclip, Eye, Pencil, FileDown } from 'lucide-react'
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
  listCurrencies,
} from '../../api/invoices'
import { listActivitiesBySubject } from '../../api/activities'
import { notifyShipmentSalesFinancials, updateShipmentCostInvoice } from '../../api/shipments'
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
  const map = {}
  for (const r of rows) {
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
        <td>{expense?.currency_code || '—'}</td>
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
  const { isAccountant, isAdminRole, isSalesRole, roleId } = useAuthAccess()
  const isAccountingUser = isAdminRole || isAccountant
  const isSalesUser = isAdminRole || isSalesRole || roleId === ROLE_ID.SALES_MANAGER
  
  const [tab, setTab] = useState('selling')
  const [expanded, setExpanded] = useState(() => new Set(['shipping', 'inland', 'customs', 'insurance', 'other']))
  const [sectionVendorChoice, setSectionVendorChoice] = useState({})
  const [pendingOtherByBucket, setPendingOtherByBucket] = useState({})
  const [batchSavingBucket, setBatchSavingBucket] = useState(null)
  const [finBanner, setFinBanner] = useState(null)
  const [notifySending, setNotifySending] = useState(false)
  const [groupDraftByKey, setGroupDraftByKey] = useState({})
  const [deletedIdsByBucket, setDeletedIdsByBucket] = useState({})
  const bucketSaveModelsRef = useRef({})

  const [clientInvoice, setClientInvoice] = useState(null)
  const [clientInvoicesList, setClientInvoicesList] = useState([])
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [pricingSaving, setPricingSaving] = useState(false)
  const [tabBRows, setTabBRows] = useState([])
  const [handlingRow, setHandlingRow] = useState({ sell: '', include: true })

  const [activityRows, setActivityRows] = useState([])
  const [activityLoading, setActivityLoading] = useState(false)

  const [currencies, setCurrencies] = useState([])
  const [renamingReceiptId, setRenamingReceiptId] = useState(null)
  const [renamingReceiptValue, setRenamingReceiptValue] = useState('')
  const [receiptActionId, setReceiptActionId] = useState(null)
  const pendingRowSeqRef = useRef(0)
  const [savingAllDraft, setSavingAllDraft] = useState(false)
  const editMode = Boolean(token && canManageExpenses && shipment?.bl_number?.trim() && shipment?.id)

  useEffect(() => {
    if (open && shipment?.id != null) {
      setTab(isAccountingUser ? 'expenses' : 'selling')
      setExpanded(new Set(['shipping', 'inland', 'customs', 'insurance', 'other']))
      setSectionVendorChoice({})
      setPendingOtherByBucket({})
      setGroupDraftByKey({})
      setDeletedIdsByBucket({})
      setFinBanner(null)
      setClientInvoice(null)
      setClientInvoicesList([])
      setTabBRows([])
      setHandlingRow({ sell: '', include: true })
      setActivityRows([])
      setRenamingReceiptId(null)
      setRenamingReceiptValue('')
      setReceiptActionId(null)

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
    for (const key of Object.keys(buckets)) {
      buckets[key] = buckets[key].slice().sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0))
    }
    return buckets
  }, [expenses])

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

  const netBreakdownStr = useMemo(() => {
    const parts = Object.entries(totalsByCurrencyAll)
      .filter(([, v]) => v !== 0)
      .map(([c, v]) => `${c} ${formatMoney(v, numberLocale)}`)
    return parts.length ? parts.join(' · ') : '—'
  }, [totalsByCurrencyAll])

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
              vendor_id: sectionVendorChoice[bucketId] || model.vendorId || undefined,
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
              vendor_id: sectionVendorChoice[bucketId] || undefined,
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
            vendor_id: sectionVendorChoice[bucketId] || undefined,
          })
        }
        setPendingOtherByBucket((prev) => ({ ...prev, [bucketId]: [] }))

        setDeletedIdsByBucket((prev) => ({ ...prev, [bucketId]: new Set() }))
        onExpensesChanged?.()
        setFinBanner({ type: 'success', message: t('shipments.fin.batchSaved') })
      } catch (e) {
        setFinBanner({ type: 'error', message: e?.message || t('shipments.fin.errorSaveLine') })
      } finally {
        setBatchSavingBucket(null)
      }
    },
    [deletedIdsByBucket, groupDraftByKey, onExpensesChanged, sectionVendorChoice, shipment?.id, t, token, pendingOtherByBucket, categoriesByCode]
  )

  const addPendingOtherLine = useCallback((bucketId) => {
    setPendingOtherByBucket((prev) => {
      const list = [...(prev[bucketId] || [])]
      pendingRowSeqRef.current += 1
      list.push({ tempId: `t-${Date.now()}-${pendingRowSeqRef.current}`, desc: '', amount: '', currency: 'USD' })
      return { ...prev, [bucketId]: list }
    })
  }, [])

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

  const handleSaveAllDraft = useCallback(async () => {
    if (!editMode || savingAllDraft || !token || !shipment?.id) return
    setSavingAllDraft(true)
    try {
      const sections = [...BUCKET_DEFS.map((d) => d.id), 'other']
      const items = []
      let orderIndex = 0

      for (const sectionId of sections) {
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
          if (Number.isNaN(amount) || amount < 0) {
            throw new Error(t('shipments.fin.errorInvalidAmount'))
          }
          if (amount <= 0) continue
          const rowParts = String(model.rowKey || '').split('::')
          const templateId = rowParts[1] || null
          const expenseIdNum = Number(model.expenseId)
          items.push({
            line_id: Number.isFinite(expenseIdNum) && expenseIdNum > 0 ? expenseIdNum : undefined,
            bucket_id: sectionId,
            template_id: templateId,
            description: desc,
            amount,
            currency_code: (draft.currency || 'USD').toUpperCase(),
            vendor_id: sectionVendorChoice[sectionId] || model.vendorId || undefined,
            expense_category_id: model.categoryId || undefined,
            expense_date: model.expenseDate || new Date().toISOString().slice(0, 10),
            order_index: orderIndex++,
          })
        }

        const pendingRows = pendingOtherByBucket[sectionId] || []
        for (const line of pendingRows) {
          const desc = String(line.desc || '').trim()
          const amount = Number(line.amount)
          if (desc === '' && String(line.amount ?? '').trim() === '') continue
          if (Number.isNaN(amount) || amount < 0) {
            throw new Error(t('shipments.fin.errorInvalidAmount'))
          }
          if (amount <= 0) continue
          items.push({
            bucket_id: sectionId,
            template_id: 'other',
            description: desc,
            amount,
            currency_code: (line.currency || 'USD').toUpperCase(),
            vendor_id: sectionVendorChoice[sectionId] || undefined,
            expense_date: new Date().toISOString().slice(0, 10),
            order_index: orderIndex++,
          })
        }
      }

      await updateShipmentCostInvoice(token, shipment.id, {
        status: 'draft',
        items,
      })

      setPendingOtherByBucket({})
      setDeletedIdsByBucket({})
      setGroupDraftByKey({})
      onExpensesChanged?.()
      onShipmentTotalsRefresh?.()
      setFinBanner({ type: 'success', message: t('shipments.fin.batchSaved') })
    } catch (e) {
      setFinBanner({ type: 'error', message: e?.message || t('shipments.fin.errorSaveLine') })
    } finally {
      setSavingAllDraft(false)
    }
  }, [editMode, savingAllDraft, token, shipment?.id, deletedIdsByBucket, groupDraftByKey, pendingOtherByBucket, sectionVendorChoice, t, onExpensesChanged, onShipmentTotalsRefresh])

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
        setClientInvoicesList(list)
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
        if (!cancelled) setClientInvoicesList([])
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

  if (!open || !shipment) return null

  const bl = shipment.bl_number?.trim() || `—`
  const hasBl = Boolean(shipment.bl_number?.trim())
  const isReefer = Boolean(shipment?.is_reefer)
  const invCurrency = clientInvoice?.currency_code || 'USD'

  const patchTabBRow = (idx, patch) => {
    setTabBRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

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
    const bucketEditing = editMode
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
          {editMode ? <th>{t('shipments.actions')}</th> : null}
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
          {editMode ? <th>{t('shipments.actions')}</th> : null}
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
        </div>
      ) : null

      bodyContent = (
        <>
          {otherToolbar}
          {rows.length === 0 && pendingOthers.length === 0 ? (
            <p className="shipment-fin-empty-inline">{t('shipments.fin.bucketOtherEmpty')}</p>
          ) : (
            <div className="shipment-fin-table-wrap shipment-fin-draft-table-wrap">
              <table className="shipment-fin-line-table">
                {otherTableHead}
                <tbody>
                  {rows.map((ex) => (
                    <tr key={ex.id}>
                      <td>—</td>
                      <td>{ex.description?.trim() || ex.invoice_number || '—'}</td>
                      <td className="shipment-fin-num">{formatMoney(Number(ex.amount) || 0, numberLocale)}</td>
                      <td>{ex.currency_code || '—'}</td>
                      {bucketEditing ? (
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
                                  <Trash2 size={14} />
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
                      <td>—</td>
                      <td>
                        <input
                          type="text"
                          className="shipment-fin-input"
                          value={line.desc}
                          onChange={(e) => patchPendingOtherLine('other', line.tempId, { desc: e.target.value })}
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
                          onChange={(e) => patchPendingOtherLine('other', line.tempId, { amount: e.target.value })}
                        />
                      </td>
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
                            >
                              {t('shipments.delete')}
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {editMode ? (
            <div className="shipment-fin-draft-add-row">
              <button type="button" className="shipment-fin-btn shipment-fin-btn--secondary" onClick={() => addPendingOtherLine('other')}>
                + {t('shipments.fin.addRow')}
              </button>
            </div>
          ) : null}
          {editMode ? (
            <div className="shipment-fin-draft-upload-area" onClick={() => document.getElementById(`fin-upload-${bucketId}`)?.click()}>
              <input
                id={`fin-upload-${bucketId}`}
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => handleSectionUpload(bucketId, e)}
                disabled={batchSavingBucket === bucketId}
              />
              <div className="shipment-fin-draft-upload-icon">📎</div>
              <div className="shipment-fin-draft-upload-title">{t('shipments.fin.uploadReceipt')}</div>
              <div className="shipment-fin-draft-upload-sub">{t('shipments.fin.attachmentsLabel')}</div>
            </div>
          ) : null}
        </>
      )
    } else {
      const { sections, orphans } = partitionBucketRows(bucketId, rows, isReefer)
      const sectionRows = []
      const saveModels = []
      const deletedSet = deletedIdsByBucket[bucketId] || new Set()
      for (const { tpl, matched } of sections) {
        const rowsForTpl = matched.length > 0 ? matched : [null]
        rowsForTpl.forEach((ex, idx) => {
          const rowKey = expenseRowIdentity(bucketId, tpl.id, ex, idx)
          const descPrefix = LINE_DESC_PREFIX[tpl.id] || tpl.id
          const categoryCode = categoryCodeForTemplate(bucketId, tpl.id)
          const categoryMeta = categoriesByCode[categoryCode]
          const initialDesc = normalizeTemplateEditableDescription(ex?.description, bucketId, tpl.id)
          const initialAmount = ex?.amount != null ? String(ex.amount) : ''
          const initialCurrency = ex?.currency_code || 'USD'
          const draft = { desc: initialDesc, amount: initialAmount, currency: initialCurrency, ...(groupDraftByKey[rowKey] || {}) }

          if (ex?.id && deletedSet.has(ex.id)) return

          saveModels.push({
            rowKey,
            tplId: tpl.id,
            expenseId: ex?.id || null,
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
                  <td>{idx === 0 ? renderLineLabelCell(tpl) : null}</td>
                  <td>—</td>
                  <td className="shipment-fin-num">—</td>
                  <td>—</td>
                </tr>
              )
            } else {
              sectionRows.push(
                <tr key={rowKey}>
                  <td>{idx === 0 ? renderLineLabelCell(tpl) : null}</td>
                  <td>{ex?.description?.trim() || '—'}</td>
                  <td className="shipment-fin-num">{formatMoney(Number(ex?.amount) || 0, numberLocale)}</td>
                  <td>{ex?.currency_code || '—'}</td>
                </tr>
              )
            }
            return
          }

          sectionRows.push(
            <tr key={rowKey}>
              <td>{idx === 0 ? renderLineLabelCell(tpl) : null}</td>
              <td>
                <input
                  type="text"
                  className="shipment-fin-input"
                  value={draft.desc}
                  onChange={(e) => patchGroupDraft(rowKey, { desc: e.target.value })}
                  placeholder={t('shipments.fin.descPlaceholder')}
                  disabled={!bucketEditing || batchSavingBucket === bucketId}
                />
              </td>
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
                  {ex?.id ? (
                    <button
                      type="button"
                      className="shipment-fin-btn shipment-fin-btn--danger shipment-fin-btn--sm"
                      disabled={!bucketEditing || batchSavingBucket === bucketId}
                      onClick={() =>
                        setDeletedIdsByBucket((prev) => {
                          const next = new Set(prev[bucketId] || [])
                          next.add(ex.id)
                          return { ...prev, [bucketId]: next }
                        })
                      }
                    >
                      {t('shipments.delete')}
                    </button>
                  ) : null}
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
            <td>—</td>
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
                  >
                    {t('shipments.delete')}
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
            <td colSpan={bucketEditing ? 5 : 4}>{t('shipments.fin.otherPosted')}</td>
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
            <td colSpan={bucketEditing ? 5 : 4}>📎 {t('shipments.fin.attachmentsLabel')}</td>
          </tr>
        )
        rows.filter((r) => r.has_receipt).forEach((ex) => {
          sectionRows.push(
            <tr key={`receipt-${ex.id}`} className="shipment-fin-receipt-row">
              <td colSpan={2}>
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
                  receiptNameFromExpense(ex)
                )}
              </td>
              <td colSpan={2}>
                <div className="shipment-fin-actions__inner">
                  <button type="button" className="shipment-fin-btn shipment-fin-btn--secondary shipment-fin-btn--sm" onClick={() => handleViewReceipt(ex.id)} title={t('shipments.fin.viewReceipt')}>
                    <Eye size={14} />
                  </button>
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
          </div>
        ) : null

      bodyContent = (
        <>
          {sectionToolbar}
          <div className="shipment-fin-table-wrap shipment-fin-draft-table-wrap">
            <table className="shipment-fin-line-table">
              {tableHead}
              <tbody>{sectionRows}</tbody>
            </table>
          </div>
          {editMode ? (
            <div className="shipment-fin-draft-add-row">
              <button type="button" className="shipment-fin-btn shipment-fin-btn--secondary" onClick={() => addPendingOtherLine(bucketId)}>
                + {t('shipments.fin.addRow')}
              </button>
            </div>
          ) : null}
          {editMode ? (
            <div className="shipment-fin-draft-upload-area" onClick={() => document.getElementById(`fin-upload-${bucketId}`)?.click()}>
              <input
                id={`fin-upload-${bucketId}`}
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => handleSectionUpload(bucketId, e)}
                disabled={batchSavingBucket === bucketId}
              />
              <div className="shipment-fin-draft-upload-icon">📎</div>
              <div className="shipment-fin-draft-upload-title">{t('shipments.fin.uploadReceipt')}</div>
              <div className="shipment-fin-draft-upload-sub">{t('shipments.fin.attachmentsLabel')}</div>
            </div>
          ) : null}
          <div className="shipment-fin-draft-sec-total">
            <span>{t('shipments.fin.netCostLabel')}</span>
            <strong>{subtotalLabel}</strong>
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
    if (isSalesUser) {
      items.push({
        id: 'invoices',
        label: t('shipments.financialsTab.invoices'),
        icon: <FileType className="w-4 h-4" aria-hidden />,
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
    <div className="client-detail-modal shipments-no-print shipment-fin-modal-root" role="dialog" aria-modal="true" aria-labelledby="shipment-fin-modal-title">
      <div className="client-detail-modal__backdrop" onClick={onClose} />
      <div className="client-detail-modal__box client-detail-modal__box--form shipment-fin-modal__box">
        <header className="client-detail-modal__header client-detail-modal__header--form shipment-fin-modal__header">
          <div className="client-detail-modal__header-inner">
            <span className="client-detail-modal__header-label">{t('shipments.fin.shipmentCostDetails', { defaultValue: 'Shipment Cost Details' })}</span>
            <h2 id="shipment-fin-modal-title" className="client-detail-modal__title shipment-fin-modal__title-bl">
              {bl}
            </h2>
            <div className="sd-form-modal-preview__hint">{clientLabel(shipment)}</div>
            <div className="shipment-fin-draft-header-grid">
              <div><span>{t('shipments.fin.shipmentNumber', { defaultValue: 'Shipment Number' })}</span><strong>{bl}</strong></div>
              <div><span>{t('shipments.fin.clientName', { defaultValue: 'Client Name' })}</span><strong>{clientLabel(shipment)}</strong></div>
              <div><span>POL</span><strong>{shipment?.origin_port?.name || shipment?.originPort?.name || '—'}</strong></div>
              <div><span>POD</span><strong>{shipment?.destination_port?.name || shipment?.destinationPort?.name || '—'}</strong></div>
              <div><span>Shipping Line</span><strong>{shipment?.shipping_line?.name || shipment?.shippingLine?.name || '—'}</strong></div>
              <div><span>Container Type</span><strong>{shipment?.container_type || '—'}</strong></div>
              <div><span>Date</span><strong>{new Date().toISOString().slice(0, 10)}</strong></div>
            </div>
          </div>
          <button type="button" className="client-detail-modal__close" onClick={onClose} aria-label={t('shipments.close')}>
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
                  {BUCKET_DEFS.map((d) => renderBucketCard(d.id, d))}
                  {renderBucketCard('other', otherDef)}
                  <div className="shipment-fin-draft-grand-total">
                    <div className="shipment-fin-draft-total-row"><span>Shipping line cost</span><strong>{Object.entries(bucketTotalsLive('shipping')).map(([c,v]) => `${c} ${formatMoney(v, 'en-US')}`).join(' · ') || '—'}</strong></div>
                    <div className="shipment-fin-draft-total-row"><span>Internal transport</span><strong>{Object.entries(bucketTotalsLive('inland')).map(([c,v]) => `${c} ${formatMoney(v, 'en-US')}`).join(' · ') || '—'}</strong></div>
                    <div className="shipment-fin-draft-total-row"><span>Customs clearance</span><strong>{Object.entries(bucketTotalsLive('customs')).map(([c,v]) => `${c} ${formatMoney(v, 'en-US')}`).join(' · ') || '—'}</strong></div>
                    <div className="shipment-fin-draft-total-row"><span>Insurance</span><strong>{Object.entries(bucketTotalsLive('insurance')).map(([c,v]) => `${c} ${formatMoney(v, 'en-US')}`).join(' · ') || '—'}</strong></div>
                    <div className="shipment-fin-draft-total-row"><span>Additional cost types</span><strong>{Object.entries(bucketTotalsLive('other')).map(([c,v]) => `${c} ${formatMoney(v, 'en-US')}`).join(' · ') || '—'}</strong></div>
                    <div className="shipment-fin-draft-total-row shipment-fin-draft-total-row--final">
                      <span>{t('shipments.fin.netCostLabel')}</span>
                      <strong>
                        {netBreakdownStr}
                      </strong>
                    </div>
                    <div className="shipment-fin-draft-actions-footer">
                      <button
                        type="button"
                        className="client-detail-modal__btn client-detail-modal__btn--secondary"
                        disabled={savingAllDraft}
                        onClick={handleSaveAllDraft}
                      >
                        {savingAllDraft ? t('shipments.saving') : 'حفظ كمسودة'}
                      </button>
                      <button
                        type="button"
                        className="client-detail-modal__btn client-detail-modal__btn--primary"
                        disabled={notifySending}
                        onClick={handleNotifySales}
                      >
                        {notifySending ? t('shipments.saving') : 'حفظ إشعار مبيعات'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'selling' && isSalesUser && (
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
                </>
              )}
            </div>
          )}

          {tab === 'invoices' && isSalesUser && (
            <div key="invoices" className="shipment-fin-panel shipment-fin-panel--enter">
              {!hasBl ? (
                <p className="client-detail-modal__empty">{t('shipments.financialsNoBl')}</p>
              ) : invoiceLoading ? (
                <ShipmentFinLoadingSkeleton variant="invoice" />
              ) : (
                <>
                  <div className="shipment-fin-table-wrap">
                    <table className="shipment-fin-invoice-table">
                      <thead>
                        <tr>
                          <th>{t('shipments.fin.invoiceNumberLabel')}</th>
                          <th>{t('shipments.expColDate')}</th>
                          <th>{t('shipments.fin.invoiceStatus')}</th>
                          <th>{t('shipments.fin.invoiceNet')}</th>
                          <th>{t('shipments.fin.paidAmount')}</th>
                          <th>{t('shipments.fin.remainingAmount')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientInvoicesList.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center text-muted py-4">
                              {t('shipments.fin.noClientInvoiceYet')}
                            </td>
                          </tr>
                        ) : (
                          clientInvoicesList.map((inv) => {
                            const invNet = Number(inv.net_amount) || 0
                            const invPaid = Number(inv.paid_amount) || 0
                            const invRemaining = Math.max(0, invNet - invPaid)
                            const statusClass =
                              inv.status === 'paid'
                                ? 'shipment-fin-badge--ok'
                                : inv.status === 'partial'
                                  ? 'shipment-fin-badge--partial'
                                  : 'shipment-fin-badge--draft'
                            return (
                              <tr key={inv.id}>
                                <td>{inv.invoice_number || `#${inv.id}`}</td>
                                <td>{inv.issue_date ? String(inv.issue_date).slice(0, 10) : '—'}</td>
                                <td>
                                  <span className={`shipment-fin-badge ${statusClass}`}>
                                    {inv.status
                                      ? t(`shipments.fin.invoiceStatusValue.${inv.status}`, { defaultValue: inv.status })
                                      : t('shipments.fin.noClientInvoiceYet')}
                                  </span>
                                </td>
                                <td className="shipment-fin-num">{formatMoney(invNet, numberLocale)}</td>
                                <td className="shipment-fin-num">{formatMoney(invPaid, numberLocale)}</td>
                                <td className="shipment-fin-num">{formatMoney(invRemaining, numberLocale)}</td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
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
                                    <td className="fs-xs">{ex.expense_date || '—'}</td>
                                    <td className="fw-500">{ex.description?.trim() || t('shipments.fin.unnamedReceipt')}</td>
                                    <td className="fs-xs">{ex.vendor?.name || '—'}</td>
                                    <td className="shipment-fin-num no-wrap">
                                      {formatMoney(Number(ex.amount) || 0, numberLocale)} <span className="fs-xxs">{ex.currency_code}</span>
                                    </td>
                                    <td className="text-center">
                                      {renamingReceiptId === ex.id ? (
                                        <div className="flex items-center justify-center gap-2">
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
                                        </div>
                                      ) : (
                                        <div className="shipment-fin-actions__inner">
                                          <button type="button" className="shipment-fin-btn shipment-fin-btn--secondary shipment-fin-btn--sm" onClick={() => handleViewReceipt(ex.id)} title={t('shipments.fin.viewReceipt')}>
                                            <Eye size={12} />
                                          </button>
                                          <button type="button" className="shipment-fin-btn shipment-fin-btn--secondary shipment-fin-btn--sm" onClick={() => handleDownloadReceipt(ex.id)} title={t('shipments.fin.downloadReceipt')}>
                                            <FileDown size={12} />
                                          </button>
                                          <button type="button" className="shipment-fin-btn shipment-fin-btn--secondary shipment-fin-btn--sm" onClick={() => startRenameReceipt(ex)} title={t('shipments.fin.renameReceipt')}>
                                            <Pencil size={12} />
                                          </button>
                                          <button type="button" className="shipment-fin-btn shipment-fin-btn--danger shipment-fin-btn--sm" onClick={() => handleDeleteReceipt(ex.id)} title={t('shipments.fin.deleteReceipt')}>
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      )}
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
