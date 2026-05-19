import { useEffect, useMemo, useState } from 'react'
import LoaderDots from '../../components/LoaderDots'
import i18n from '../../i18n'
import { latinDateTimeFormat } from '../../utils/westernNumerals'

export const EMPTY_TRANSPORT_INSTRUCTION_PROFILE = {
  customer_arrival_at: '',
  loading_place_name: '',
  loading_address: '',
  loading_maps_url: '',
  loading_contact_name: '',
  loading_contact_phone: '',
  customs_document_type: '',
  generator: 'no',
  generator_temperature: '',
  generator_driver_instructions: '',
  approved_customs_broker_id: '',
  customs_notes: '',
}

function formatLocalTime(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function arrivalPartsFromIso(isoOrEmpty) {
  if (!isoOrEmpty || typeof isoOrEmpty !== 'string') {
    return { day: '', month: '', year: new Date().getFullYear(), time: '' }
  }
  const d = new Date(isoOrEmpty)
  if (Number.isNaN(d.getTime())) {
    return { day: '', month: '', year: new Date().getFullYear(), time: '' }
  }
  return {
    day: d.getDate(),
    month: d.getMonth() + 1,
    year: d.getFullYear(),
    time: formatLocalTime(d),
  }
}

function buildArrivalIso(day, month, year, time) {
  if (day === '' || month === '' || year === '' || time === '') return ''
  const di = Number(day)
  const mi = Number(month)
  const yi = Number(year)
  const [hStr, mStr] = String(time).split(':')
  const hi = Number(hStr)
  const min = Number(mStr ?? 0)
  if (!Number.isFinite(di) || !Number.isFinite(mi) || !Number.isFinite(yi) || !Number.isFinite(hi) || !Number.isFinite(min)) {
    return ''
  }
  const d = new Date(yi, mi - 1, di, hi, min, 0, 0)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString()
}

export function mergeTransportInstructionProfileFromApi(raw) {
  const base = { ...EMPTY_TRANSPORT_INSTRUCTION_PROFILE }
  if (raw && typeof raw === 'object') {
    for (const k of Object.keys(base)) {
      if (Object.prototype.hasOwnProperty.call(raw, k) && raw[k] != null && raw[k] !== '') {
        base[k] = raw[k]
      }
    }
  }
  if (base.approved_customs_broker_id !== '' && base.approved_customs_broker_id != null) {
    base.approved_customs_broker_id = String(base.approved_customs_broker_id)
  } else {
    base.approved_customs_broker_id = ''
  }
  base.generator = base.generator === 'yes' ? 'yes' : 'no'
  if (!['certificate', 'bill_of_lading', 'manifest'].includes(base.customs_document_type)) {
    base.customs_document_type = ''
  }
  if (base.customer_arrival_at && typeof base.customer_arrival_at === 'string') {
    const iso = new Date(base.customer_arrival_at)
    if (!Number.isNaN(iso.getTime())) {
      base.customer_arrival_at = iso.toISOString()
    }
  }
  return base
}

export function buildTransportInstructionProfilePayload(tip) {
  if (!tip || typeof tip !== 'object') {
    return {}
  }
  const gen = tip.generator === 'yes' ? 'yes' : 'no'
  const brokerRaw = tip.approved_customs_broker_id
  const brokerId =
    brokerRaw !== '' && brokerRaw != null && !Number.isNaN(Number(brokerRaw)) ? Number(brokerRaw) : null

  const tStr = (v) => {
    if (v == null) return null
    const s = String(v).trim()
    return s === '' ? null : s
  }

  return {
    customer_arrival_at: tStr(tip.customer_arrival_at),
    loading_place_name: tStr(tip.loading_place_name),
    loading_address: tStr(tip.loading_address),
    loading_maps_url: tStr(tip.loading_maps_url),
    loading_contact_name: tStr(tip.loading_contact_name),
    loading_contact_phone: tStr(tip.loading_contact_phone),
    customs_document_type: ['certificate', 'bill_of_lading', 'manifest'].includes(tip.customs_document_type)
      ? tip.customs_document_type
      : null,
    generator: gen,
    generator_temperature: gen === 'yes' ? tStr(tip.generator_temperature) : null,
    generator_driver_instructions: gen === 'yes' ? tStr(tip.generator_driver_instructions) : null,
    approved_customs_broker_id: brokerId,
    customs_notes: tStr(tip.customs_notes),
  }
}

export function buildTransportInstructionsWhatsAppText(shipment, tip, t) {
  const ti = tip && typeof tip === 'object' ? tip : EMPTY_TRANSPORT_INSTRUCTION_PROFILE
  const booking = shipment?.booking_number ?? '—'
  const line = shipment?.shipping_line?.name ?? shipment?.shippingLine?.name ?? '—'
  const cnt = shipment?.container_count
  const ctype = shipment?.container_type
  const csize = shipment?.container_size
  const hasC = cnt != null && String(cnt).trim() !== ''
  const combined =
    hasC && csize && ctype
      ? `${cnt} × ${`${String(csize).trim()} ${String(ctype).trim()}`.trim()}`
      : hasC
        ? String(cnt)
        : '—'
  const doc = (() => {
    if (!ti.customs_document_type) return '—'
    const key =
      ti.customs_document_type === 'certificate'
        ? 'shipments.transportInstructions.docCertificate'
        : ti.customs_document_type === 'bill_of_lading'
          ? 'shipments.transportInstructions.docBl'
          : ti.customs_document_type === 'manifest'
            ? 'shipments.transportInstructions.docManifest'
            : null
    return key ? t(key) : String(ti.customs_document_type)
  })()
  const gen = ti.generator === 'yes' ? t('shipments.transportInstructions.genYes') : t('shipments.transportInstructions.genNo')
  const arrivalStr = (() => {
    if (!ti.customer_arrival_at) return '—'
    const d = new Date(ti.customer_arrival_at)
    if (Number.isNaN(d.getTime())) return String(ti.customer_arrival_at)
    return latinDateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' }).format(d)
  })()
  const lines = [
    t('shipments.transportInstructions.whatsappTitle', { id: shipment?.id ?? '' }),
    '',
    `${t('shipments.transportInstructions.bookingLineCombined')}: ${booking} / ${line}`,
    `${t('shipments.transportInstructions.containerCombinedLabel')}: ${combined}`,
    '',
    `${t('shipments.transportInstructions.arrival')}: ${arrivalStr}`,
    `${t('shipments.transportInstructions.placeOfLoadingTitle')}: ${ti.loading_place_name || '—'}`,
    `${t('shipments.transportInstructions.loadingAddress')}: ${ti.loading_address || '—'}`,
    `${t('shipments.transportInstructions.mapsUrl')}: ${ti.loading_maps_url || '—'}`,
    `${t('shipments.transportInstructions.loadingContactTitle')}: ${ti.loading_contact_name || '—'} · ${ti.loading_contact_phone || '—'}`,
    `${t('shipments.transportInstructions.customsDoc')}: ${doc}`,
    `${t('shipments.transportInstructions.generator')}: ${gen}`,
    `${t('shipments.transportInstructions.customsNotes')}: ${ti.customs_notes || '—'}`,
    '',
    t('shipments.transportInstructions.whatsappPdfHint'),
  ]
  return lines.join('\n')
}

function setTipField(setOpsData, field, value) {
  setOpsData((prev) => {
    if (!prev) return prev
    const cur = { ...(prev.transport_instruction_profile || EMPTY_TRANSPORT_INSTRUCTION_PROFILE), [field]: value }
    if (field === 'generator' && value !== 'yes') {
      cur.generator_temperature = ''
      cur.generator_driver_instructions = ''
    }
    return { ...prev, transport_instruction_profile: cur }
  })
}

function rangeSelectOptions(from, to) {
  const o = []
  for (let i = from; i <= to; i += 1) o.push(i)
  return o
}

export default function ShipmentTransportInstructionsTab({
  shipment,
  opsData,
  setOpsData,
  canEditOps,
  opsError,
  customsVendorOptions,
  onGenerateTiPdf,
  tiPdfLoading,
  tiBookingDraft,
  setTiBookingDraft,
  shippingLineOptions,
  t,
  shipmentDisplayContainerType,
  shipmentDisplayContainerSize,
}) {
  const tip = opsData?.transport_instruction_profile || EMPTY_TRANSPORT_INSTRUCTION_PROFILE

  const [arrivalDay, setArrivalDay] = useState('')
  const [arrivalMonth, setArrivalMonth] = useState('')
  const [arrivalYear, setArrivalYear] = useState(() => new Date().getFullYear())
  const [arrivalTime, setArrivalTime] = useState('')

  useEffect(() => {
    const p = arrivalPartsFromIso(tip.customer_arrival_at)
    setArrivalDay(p.day === '' ? '' : p.day)
    setArrivalMonth(p.month === '' ? '' : p.month)
    setArrivalYear(p.year)
    setArrivalTime(p.time)
  }, [tip.customer_arrival_at])

  const commitArrival = (next) => {
    const { day, month, year, time } = next
    const iso = buildArrivalIso(day, month, year, time)
    setTipField(setOpsData, 'customer_arrival_at', iso || '')
  }

  const combinedContainerLabel = useMemo(() => {
    const cnt = shipment?.container_count
    const sz = shipment?.container_size
    const tp = shipment?.container_type
    if (cnt == null || cnt === '' || !sz || !tp) return '—'
    const typeStr = shipmentDisplayContainerType(tp, t)
    const sizeStr = shipmentDisplayContainerSize(sz, t)
    return `${cnt} × ${`${sizeStr} ${typeStr}`.trim()}`
  }, [shipment, shipmentDisplayContainerType, shipmentDisplayContainerSize, t])

  const req = (s) => (s ? ` ${s}` : '')

  return (
    <div className="shipment_key_single rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/30 p-4 space-y-3">
      {opsError ? (
        <p className="text-sm text-red-600 dark:text-red-400 font-medium" role="alert">
          {opsError}
        </p>
      ) : null}

      {/* Booking + line */}
      <div className="shipment-ti-row shipment-ti-row--2">
        <div>
          <label className="client-detail-modal__label block mb-0.5 text-xs">
            {t('shipments.transportInstructions.bookingNumberLabel')}
            <span className="text-red-600">{req(t('shipments.transportInstructions.requiredMark'))}</span>
          </label>
          <input
            type="text"
            className="clients-input w-full text-sm"
            value={tiBookingDraft?.booking_number ?? ''}
            onChange={(e) => setTiBookingDraft((d) => ({ ...d, booking_number: e.target.value }))}
            disabled={!canEditOps}
            autoComplete="off"
          />
        </div>
        <div>
          <label className="client-detail-modal__label block mb-0.5 text-xs">
            {t('shipments.transportInstructions.shippingLineLabel')}
            <span className="text-red-600">{req(t('shipments.transportInstructions.requiredMark'))}</span>
          </label>
          <select
            className="clients-input w-full text-sm"
            value={tiBookingDraft?.shipping_line_id ?? ''}
            onChange={(e) => setTiBookingDraft((d) => ({ ...d, shipping_line_id: e.target.value }))}
            disabled={!canEditOps}
          >
            <option value="">{t('shipments.transportInstructions.selectPlaceholder')}</option>
            {(shippingLineOptions || []).map((sl) => (
              <option key={sl.id} value={String(sl.id)}>
                {sl.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Combined container */}
      <div className="shipment-ti-group">
        <div className="shipment-ti-group-label">
          {t('shipments.transportInstructions.containerCombinedLabel')}
          <span className="text-red-600">{req(t('shipments.transportInstructions.requiredMark'))}</span>
        </div>
        <div className="shipment-ti-combined-value text-sm font-medium text-slate-900 dark:text-slate-100">
          {combinedContainerLabel}
        </div>
      </div>

      {/* Arrival */}
      <div className="shipment-ti-group">
        <div className="shipment-ti-group-label">
          {t('shipments.transportInstructions.arrival')}
          <span className="text-red-600">{req(t('shipments.transportInstructions.requiredMark'))}</span>
        </div>
        <div className="shipment-ti-arrival-grid shipment-ti-arrival-grid--3">
          <div>
            <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">{t('common.day')}</label>
            <select
              className="clients-input w-full text-sm py-1.5"
              value={arrivalDay === '' ? '' : String(arrivalDay)}
              onChange={(e) => {
                const v = e.target.value === '' ? '' : Number(e.target.value)
                setArrivalDay(v)
                commitArrival({ day: v, month: arrivalMonth, year: arrivalYear, time: arrivalTime })
              }}
              disabled={!canEditOps}
            >
              <option value="">{t('shipments.transportInstructions.selectPlaceholder')}</option>
              {rangeSelectOptions(1, 31).map((d) => (
                <option key={d} value={String(d)}>
                  {String(d).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">{t('common.month')}</label>
            <select
              className="clients-input w-full text-sm py-1.5"
              value={arrivalMonth === '' ? '' : String(arrivalMonth)}
              onChange={(e) => {
                const v = e.target.value === '' ? '' : Number(e.target.value)
                setArrivalMonth(v)
                commitArrival({ day: arrivalDay, month: v, year: arrivalYear, time: arrivalTime })
              }}
              disabled={!canEditOps}
            >
              <option value="">{t('shipments.transportInstructions.selectPlaceholder')}</option>
              {rangeSelectOptions(1, 12).map((m) => (
                <option key={m} value={String(m)}>
                  {String(m).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">
              {t('shipments.transportInstructions.arrivalHour')}
            </label>
            <input
              type="time"
              className="clients-input w-full text-sm py-1.5"
              value={arrivalTime}
              onChange={(e) => {
                const v = e.target.value
                setArrivalTime(v)
                commitArrival({ day: arrivalDay, month: arrivalMonth, year: arrivalYear, time: v })
              }}
              disabled={!canEditOps}
            />
          </div>
        </div>
      </div>

      {/* Place of loading */}
      <div className="shipment-ti-group">
        <div className="shipment-ti-group-label">
          {t('shipments.transportInstructions.placeOfLoadingTitle')}
          <span className="text-red-600">{req(t('shipments.transportInstructions.requiredMark'))}</span>
        </div>
        <div className="space-y-2">
          <div>
            <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">
              {t('shipments.transportInstructions.placeNameLabel')}
              <span className="text-red-600">{req(t('shipments.transportInstructions.requiredMark'))}</span>
            </label>
            <input
              type="text"
              className="clients-input w-full text-sm py-1.5"
              value={tip.loading_place_name}
              onChange={(e) => setTipField(setOpsData, 'loading_place_name', e.target.value)}
              disabled={!canEditOps}
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">
              {t('shipments.transportInstructions.fullAddressLabel')}
              <span className="text-red-600">{req(t('shipments.transportInstructions.requiredMark'))}</span>
            </label>
            <textarea
              rows={2}
              className="clients-input w-full text-sm py-1.5"
              value={tip.loading_address}
              onChange={(e) => setTipField(setOpsData, 'loading_address', e.target.value)}
              disabled={!canEditOps}
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">
              {t('shipments.transportInstructions.mapsUrl')}
            </label>
            <input
              type="url"
              className="clients-input w-full text-sm py-1.5"
              value={tip.loading_maps_url}
              onChange={(e) => setTipField(setOpsData, 'loading_maps_url', e.target.value)}
              disabled={!canEditOps}
              placeholder="https://"
            />
          </div>
        </div>
      </div>

      {/* Loading contact */}
      <div className="shipment-ti-group">
        <div className="shipment-ti-group-label">{t('shipments.transportInstructions.loadingContactTitle')}</div>
        <div className="shipment-ti-row shipment-ti-row--2">
          <div>
            <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">
              {t('shipments.transportInstructions.contactName')}
              <span className="text-red-600">{req(t('shipments.transportInstructions.requiredMark'))}</span>
            </label>
            <input
              type="text"
              className="clients-input w-full text-sm py-1.5"
              value={tip.loading_contact_name}
              onChange={(e) => setTipField(setOpsData, 'loading_contact_name', e.target.value)}
              disabled={!canEditOps}
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">
              {t('shipments.transportInstructions.contactPhone')}
              <span className="text-red-600">{req(t('shipments.transportInstructions.requiredMark'))}</span>
            </label>
            <input
              type="text"
              className="clients-input w-full text-sm py-1.5"
              value={tip.loading_contact_phone}
              onChange={(e) => setTipField(setOpsData, 'loading_contact_phone', e.target.value)}
              disabled={!canEditOps}
            />
          </div>
        </div>
      </div>

      {/* Customs doc + generator */}
      <div className="shipment-ti-row shipment-ti-row--2">
        <div>
          <label className="client-detail-modal__label block mb-0.5 text-xs">
            {t('shipments.transportInstructions.customsDoc')}
            <span className="text-red-600">{req(t('shipments.transportInstructions.requiredMark'))}</span>
          </label>
          <select
            className="clients-input w-full text-sm py-1.5"
            value={tip.customs_document_type}
            onChange={(e) => setTipField(setOpsData, 'customs_document_type', e.target.value)}
            disabled={!canEditOps}
          >
            <option value="">{t('shipments.transportInstructions.selectPlaceholder')}</option>
            <option value="certificate">{t('shipments.transportInstructions.docCertificate')}</option>
            <option value="bill_of_lading">{t('shipments.transportInstructions.docBl')}</option>
            <option value="manifest">{t('shipments.transportInstructions.docManifest')}</option>
          </select>
        </div>
        <div>
          <label className="client-detail-modal__label block mb-0.5 text-xs">{t('shipments.transportInstructions.generator')}</label>
          <select
            className="clients-input w-full text-sm py-1.5"
            value={tip.generator}
            onChange={(e) => setTipField(setOpsData, 'generator', e.target.value)}
            disabled={!canEditOps}
          >
            <option value="no">{t('shipments.transportInstructions.genNo')}</option>
            <option value="yes">{t('shipments.transportInstructions.genYes')}</option>
          </select>
        </div>
      </div>

      {tip.generator === 'yes' ? (
        <div className="shipment-ti-generator-block rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50/90 dark:bg-slate-800/40 p-2.5 space-y-2">
          <div>
            <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">
              {t('shipments.transportInstructions.temperature')}
              <span className="text-red-600">{req(t('shipments.transportInstructions.requiredMark'))}</span>
            </label>
            <input
              type="text"
              className="clients-input w-full text-sm py-1.5"
              value={tip.generator_temperature}
              onChange={(e) => setTipField(setOpsData, 'generator_temperature', e.target.value)}
              disabled={!canEditOps}
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">{t('shipments.transportInstructions.driverInstructions')}</label>
            <textarea
              rows={3}
              className="clients-input w-full text-sm py-1.5"
              value={tip.generator_driver_instructions}
              onChange={(e) => setTipField(setOpsData, 'generator_driver_instructions', e.target.value)}
              disabled={!canEditOps}
            />
          </div>
        </div>
      ) : null}

      <div>
        <label className="client-detail-modal__label block mb-0.5 text-xs">{t('shipments.transportInstructions.approvedBrokerOptional')}</label>
        <select
          className="clients-input w-full text-sm py-1.5"
          value={tip.approved_customs_broker_id}
          onChange={(e) => setTipField(setOpsData, 'approved_customs_broker_id', e.target.value)}
          disabled={!canEditOps}
        >
          <option value="">{t('shipments.transportInstructions.brokerPlaceholder')}</option>
          {(customsVendorOptions || []).map((v) => (
            <option key={v.id} value={String(v.id)}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="client-detail-modal__label block mb-0.5 text-xs">{t('shipments.transportInstructions.customsNotesOptional')}</label>
        <textarea
          rows={2}
          className="clients-input w-full text-sm py-1.5"
          value={tip.customs_notes}
          onChange={(e) => setTipField(setOpsData, 'customs_notes', e.target.value)}
          disabled={!canEditOps}
        />
      </div>

      <button
        type="button"
        onClick={() => onGenerateTiPdf?.()}
        disabled={tiPdfLoading || !shipment?.id || !canEditOps}
        className="shipment-ti-pdf-btn disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {tiPdfLoading ? <LoaderDots size={8} /> : t('shipments.transportInstructions.generatePdf')}
      </button>
    </div>
  )
}
