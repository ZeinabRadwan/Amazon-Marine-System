import { FileDown, MessageCircle, Printer, Save } from 'lucide-react'
import LoaderDots from '../../components/LoaderDots'

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

function toDatetimeLocalValue(isoOrEmpty) {
  if (!isoOrEmpty || typeof isoOrEmpty !== 'string') return ''
  const d = new Date(isoOrEmpty)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocalToIso(val) {
  if (!val || typeof val !== 'string') return ''
  const d = new Date(val)
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
  const cnt = shipment?.container_count ?? '—'
  const ctype = shipment?.container_type ?? '—'
  const csize = shipment?.container_size ?? '—'
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
    return Number.isNaN(d.getTime()) ? String(ti.customer_arrival_at) : d.toLocaleString()
  })()
  const lines = [
    t('shipments.transportInstructions.whatsappTitle', { id: shipment?.id ?? '' }),
    '',
    `${t('shipments.transportInstructions.summaryBooking')}: ${booking}`,
    `${t('shipments.transportInstructions.summaryLine')}: ${line}`,
    `${t('shipments.transportInstructions.summaryCount')}: ${cnt}`,
    `${t('shipments.transportInstructions.summaryType')}: ${ctype}`,
    `${t('shipments.transportInstructions.summarySize')}: ${csize}`,
    '',
    `${t('shipments.transportInstructions.arrival')}: ${arrivalStr}`,
    `${t('shipments.transportInstructions.loadingPlace')}: ${ti.loading_place_name || '—'}`,
    `${t('shipments.transportInstructions.loadingAddress')}: ${ti.loading_address || '—'}`,
    `${t('shipments.transportInstructions.mapsUrl')}: ${ti.loading_maps_url || '—'}`,
    `${t('shipments.transportInstructions.contactName')}: ${ti.loading_contact_name || '—'}`,
    `${t('shipments.transportInstructions.contactPhone')}: ${ti.loading_contact_phone || '—'}`,
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

export default function ShipmentTransportInstructionsTab({
  shipment,
  opsData,
  setOpsData,
  canEditOps,
  onSave,
  opsSaving,
  opsError,
  customsVendorOptions,
  onGeneratePdf,
  tiPdfLoading,
  onWhatsAppShare,
  t,
  shipmentDisplayContainerType,
  shipmentDisplayContainerSize,
}) {
  const tip = opsData?.transport_instruction_profile || EMPTY_TRANSPORT_INSTRUCTION_PROFILE
  const shippingLineName = shipment?.shipping_line?.name ?? shipment?.shippingLine?.name ?? '—'

  return (
    <div className="shipment-transport-instructions space-y-6">
      <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/40 p-4">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">
          {t('shipments.transportInstructions.summaryTitle')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('shipments.transportInstructions.summaryBooking')}
            </div>
            <div className="font-medium text-slate-900 dark:text-slate-100">{shipment?.booking_number ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('shipments.transportInstructions.summaryLine')}
            </div>
            <div className="font-medium text-slate-900 dark:text-slate-100">{shippingLineName}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('shipments.transportInstructions.summaryCount')}
            </div>
            <div className="font-medium text-slate-900 dark:text-slate-100">{shipment?.container_count ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('shipments.transportInstructions.summaryType')}
            </div>
            <div className="font-medium text-slate-900 dark:text-slate-100">
              {shipmentDisplayContainerType(shipment?.container_type, t)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('shipments.transportInstructions.summarySize')}
            </div>
            <div className="font-medium text-slate-900 dark:text-slate-100">
              {shipmentDisplayContainerSize(shipment?.container_size, t)}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-600 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {t('shipments.transportInstructions.formTitle')}
        </h3>

        <div>
          <label className="client-detail-modal__label block mb-1">{t('shipments.transportInstructions.arrival')}</label>
          <input
            type="datetime-local"
            className="clients-input w-full max-w-md"
            value={toDatetimeLocalValue(tip.customer_arrival_at)}
            onChange={(e) => {
              const iso = fromDatetimeLocalToIso(e.target.value)
              setTipField(setOpsData, 'customer_arrival_at', iso || '')
            }}
            disabled={!canEditOps}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="client-detail-modal__label block mb-1">{t('shipments.transportInstructions.loadingPlace')}</label>
            <input
              type="text"
              className="clients-input w-full"
              value={tip.loading_place_name}
              onChange={(e) => setTipField(setOpsData, 'loading_place_name', e.target.value)}
              disabled={!canEditOps}
            />
          </div>
          <div>
            <label className="client-detail-modal__label block mb-1">{t('shipments.transportInstructions.mapsUrl')}</label>
            <input
              type="url"
              className="clients-input w-full"
              value={tip.loading_maps_url}
              onChange={(e) => setTipField(setOpsData, 'loading_maps_url', e.target.value)}
              disabled={!canEditOps}
              placeholder="https://"
            />
          </div>
        </div>

        <div>
          <label className="client-detail-modal__label block mb-1">{t('shipments.transportInstructions.loadingAddress')}</label>
          <textarea
            rows={3}
            className="clients-input w-full"
            value={tip.loading_address}
            onChange={(e) => setTipField(setOpsData, 'loading_address', e.target.value)}
            disabled={!canEditOps}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="client-detail-modal__label block mb-1">{t('shipments.transportInstructions.contactName')}</label>
            <input
              type="text"
              className="clients-input w-full"
              value={tip.loading_contact_name}
              onChange={(e) => setTipField(setOpsData, 'loading_contact_name', e.target.value)}
              disabled={!canEditOps}
            />
          </div>
          <div>
            <label className="client-detail-modal__label block mb-1">{t('shipments.transportInstructions.contactPhone')}</label>
            <input
              type="text"
              className="clients-input w-full"
              value={tip.loading_contact_phone}
              onChange={(e) => setTipField(setOpsData, 'loading_contact_phone', e.target.value)}
              disabled={!canEditOps}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="client-detail-modal__label block mb-1">{t('shipments.transportInstructions.customsDoc')}</label>
            <select
              className="clients-input w-full"
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
            <label className="client-detail-modal__label block mb-1">{t('shipments.transportInstructions.generator')}</label>
            <select
              className="clients-input w-full"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-600 pt-4">
            <div>
              <label className="client-detail-modal__label block mb-1">{t('shipments.transportInstructions.temperature')}</label>
              <input
                type="text"
                className="clients-input w-full"
                value={tip.generator_temperature}
                onChange={(e) => setTipField(setOpsData, 'generator_temperature', e.target.value)}
                disabled={!canEditOps}
              />
            </div>
            <div className="md:col-span-2">
              <label className="client-detail-modal__label block mb-1">{t('shipments.transportInstructions.driverInstructions')}</label>
              <textarea
                rows={4}
                className="clients-input w-full"
                value={tip.generator_driver_instructions}
                onChange={(e) => setTipField(setOpsData, 'generator_driver_instructions', e.target.value)}
                disabled={!canEditOps}
              />
            </div>
          </div>
        ) : null}

        <div>
          <label className="client-detail-modal__label block mb-1">{t('shipments.transportInstructions.approvedBroker')}</label>
          <select
            className="clients-input w-full"
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
          <label className="client-detail-modal__label block mb-1">{t('shipments.transportInstructions.customsNotes')}</label>
          <textarea
            rows={3}
            className="clients-input w-full"
            value={tip.customs_notes}
            onChange={(e) => setTipField(setOpsData, 'customs_notes', e.target.value)}
            disabled={!canEditOps}
          />
        </div>

        <div>
          <label className="client-detail-modal__label block mb-1">{t('shipments.ops.transportInstructionsTitle')}</label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('shipments.ops.transportInstructionsHint')}</p>
          <textarea
            rows={4}
            className="clients-input w-full"
            value={opsData?.transport_instructions || ''}
            onChange={(e) => setOpsData((prev) => (prev ? { ...prev, transport_instructions: e.target.value } : prev))}
            disabled={!canEditOps}
            placeholder={t('shipments.ops.transportInstructionsPlaceholder')}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {opsError ? <p className="text-sm text-red-600 font-medium">{opsError}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onGeneratePdf?.('download')}
            disabled={tiPdfLoading || !shipment?.id}
            className="clients-btn clients-btn--secondary inline-flex items-center gap-2 text-sm"
          >
            {tiPdfLoading ? <LoaderDots size={8} /> : <FileDown className="h-4 w-4" aria-hidden />}
            {t('shipments.transportInstructions.generatePdf')}
          </button>
          <button
            type="button"
            onClick={() => onGeneratePdf?.('print')}
            disabled={tiPdfLoading || !shipment?.id}
            className="clients-btn clients-btn--secondary inline-flex items-center gap-2 text-sm"
          >
            <Printer className="h-4 w-4" aria-hidden />
            {t('shipments.transportInstructions.printPdf')}
          </button>
          <button
            type="button"
            onClick={() => onWhatsAppShare?.()}
            className="clients-btn clients-btn--secondary inline-flex items-center gap-2 text-sm"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            {t('shipments.transportInstructions.whatsappShare')}
          </button>
        </div>
        {canEditOps ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onSave}
              disabled={opsSaving}
              className="client-detail-modal__btn client-detail-modal__btn--primary px-8 inline-flex items-center gap-2"
            >
              {opsSaving ? (
                <>
                  <LoaderDots className="h-4 w-4" />
                  {t('shipments.ops.savingOps')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" aria-hidden />
                  {t('shipments.ops.saveOps')}
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
