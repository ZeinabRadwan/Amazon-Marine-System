import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, HelpCircle } from 'lucide-react'
import { getStoredToken } from '../Login'
import { createSDForm } from '../../api/sdForms'
import { Container } from '../../components/Container'
import Alert from '../../components/Alert'
import './SDForms.css'
import {
  TextInput,
  TextareaInput,
  SelectInput,
  NumberInput,
  DateInput,
  PortField,
  ShippingLineField,
} from './components/SDDeclarationFormInputs'

const CONTAINER_TYPES = ['Dry', 'Reefer', 'Open Top', 'Flat Rack', 'High Cube (HQ)']
const CONTAINER_SIZES = ["20'", "40'"]

function emptyForm() {
  return {
    pol_id: '',
    pol_text: '',
    pod_id: '',
    pod_text: '',
    shipping_line: '',
    final_destination: '',
    shipment_direction: '',
    shipper_info: '',
    consignee_info: '',
    notify_party_mode: '',
    notify_party_details: '',
    freight_term: '',
    container_type: '',
    container_size: '',
    num_containers: '',
    requested_vessel_date: '',
    acid_number: '',
    cargo_description: '',
    hs_code: '',
    reefer_temp: '',
    reefer_vent: '',
    reefer_hum: '',
    total_gross_weight: '',
    total_net_weight: '',
    notes: '',
  }
}

function buildPayload(form) {
  const out = { status: 'draft' }
  if (form.pol_id !== '' && form.pol_id != null) out.pol_id = Number(form.pol_id)
  if (form.pol_text) out.pol_text = form.pol_text
  if (form.pod_id !== '' && form.pod_id != null) out.pod_id = Number(form.pod_id)
  if (form.pod_text) out.pod_text = form.pod_text
  out.shipping_line = String(form.shipping_line || '').trim()
  if (form.final_destination) out.final_destination = form.final_destination
  out.shipment_direction = form.shipment_direction
  if (form.shipper_info) out.shipper_info = form.shipper_info
  if (form.consignee_info) out.consignee_info = form.consignee_info
  if (form.notify_party_mode) out.notify_party_mode = form.notify_party_mode
  if (form.notify_party_details) out.notify_party_details = form.notify_party_details
  if (form.freight_term) out.freight_term = form.freight_term
  if (form.container_type) out.container_type = form.container_type
  if (form.container_size) out.container_size = form.container_size
  if (form.num_containers !== '' && form.num_containers != null) out.num_containers = Number(form.num_containers)
  if (form.requested_vessel_date) out.requested_vessel_date = form.requested_vessel_date
  if (form.acid_number) out.acid_number = form.acid_number
  if (form.cargo_description) out.cargo_description = form.cargo_description
  if (form.hs_code) out.hs_code = form.hs_code
  if (form.reefer_temp) out.reefer_temp = form.reefer_temp
  if (form.reefer_vent) out.reefer_vent = form.reefer_vent
  if (form.reefer_hum) out.reefer_hum = form.reefer_hum
  if (form.total_gross_weight !== '' && form.total_gross_weight != null) {
    out.total_gross_weight = Number(form.total_gross_weight)
  }
  if (form.total_net_weight !== '' && form.total_net_weight != null) {
    out.total_net_weight = Number(form.total_net_weight)
  }
  if (form.notes) out.notes = form.notes
  return out
}

function Section({ title, children }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/40 sm:p-6">
      <h2 className="mb-4 border-b border-gray-100 pb-2 text-base font-semibold text-gray-900 dark:border-gray-700 dark:text-gray-100">
        {title}
      </h2>
      {children}
    </section>
  )
}

export default function ShipmentDeclarationForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const token = getStoredToken()

  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [alert, setAlert] = useState(null)



  const showAcid = form.shipment_direction === 'Import'
  const showNotifyDetails = form.notify_party_mode === 'different'
  const showReefer = form.container_type === 'Reefer'

  function validateForm() {
    const e = {}
    if (!form.shipment_direction) {
      e.shipment_direction = t('sdForms.declaration.validation.shipmentDirection')
    }
    if (form.shipment_direction === 'Import' && !String(form.acid_number || '').trim()) {
      e.acid_number = t('sdForms.declaration.validation.acidNumber')
    }
    if (!String(form.shipping_line || '').trim()) {
      e.shipping_line = t('sdForms.declaration.validation.shippingLine')
    }
    return e
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    const e = validateForm()
    setErrors(e)
    if (Object.keys(e).length > 0) {
      setAlert({ type: 'error', message: t('sdForms.declaration.validation.fixErrors') })
      return
    }

    const payload = buildPayload(form)
    console.log('SD Form submission', payload)

    if (!token) {
      setAlert({ type: 'warning', message: t('sdForms.declaration.loginToSave') })
      return
    }

    setSubmitting(true)
    setAlert(null)
    try {
      await createSDForm(token, payload)
      setAlert({ type: 'success', message: t('sdForms.createSuccess') })
      setForm(emptyForm())
      setErrors({})
      navigate('/sd-forms')
    } catch (err) {
      setAlert({ type: 'error', message: err?.message || t('sdForms.errorCreate') })
    } finally {
      setSubmitting(false)
    }
  }

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }))
    setErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  return (
    <Container size="xl" className="max-w-5xl">
      {alert ? (
        <div className="mb-4">
          <Alert variant={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        </div>
      ) : null}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to="/sd-forms"
            className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t('sdForms.declaration.backToList', { lng: 'en' })}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
            {t('sdForms.declaration.pageTitle', { lng: 'en' })}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('sdForms.declaration.pageSubtitle', { lng: 'en' })}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        <Section title={t('sdForms.declaration.sections.basic', { lng: 'en' })}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <PortField
              id="sd-decl-pol"
              label={t('sdForms.form.pol', { lng: 'en' })}
              placeholder={t('sdForms.declaration.selectOrAddPort', { lng: 'en' })}
              portId={form.pol_id}
              portText={form.pol_text}
              onChange={({ portId, portText }) =>
                setForm((f) => ({ ...f, pol_id: portId, pol_text: portText }))
              }
              error={errors.pol_id}
              token={token}
            />
            <PortField
              id="sd-decl-pod"
              label={t('sdForms.form.pod', { lng: 'en' })}
              placeholder={t('sdForms.declaration.selectOrAddPort', { lng: 'en' })}
              portId={form.pod_id}
              portText={form.pod_text}
              onChange={({ portId, portText }) =>
                setForm((f) => ({ ...f, pod_id: portId, portText: portText }))
              }
              error={errors.pod_id}
              token={token}
            />
            <div className="md:col-span-2">
              <ShippingLineField
                id="sd-decl-shipping-line"
                label={t('sdForms.form.shippingLine', { lng: 'en' })}
                placeholder={t('sdForms.declaration.selectOrAddShippingLine', { lng: 'en' })}
                value={form.shipping_line}
                onChange={(name) => setField('shipping_line', name)}
                error={errors.shipping_line}
                token={token}
              />
            </div>
            <TextInput
              id="sd-decl-final-dest"
              label={t('sdForms.form.finalDestination', { lng: 'en' })}
              description={t('sdForms.declaration.finalDestinationHint', { lng: 'en' })}
              placeholder={t('sdForms.declaration.finalDestinationPlaceholder', { lng: 'en' })}
              value={form.final_destination}
              onChange={(e) => setField('final_destination', e.target.value)}
              className="md:col-span-2"
            />
            <SelectInput
              id="sd-decl-direction"
              label={t('sdForms.form.shipmentDirection', { lng: 'en' })}
              required
              value={form.shipment_direction}
              onChange={(e) => {
                const v = e.target.value
                setForm((f) => ({
                  ...f,
                  shipment_direction: v,
                  ...(v !== 'Import' ? { acid_number: '' } : {}),
                }))
                setErrors((prev) => {
                  const next = { ...prev }
                  delete next.shipment_direction
                  if (v !== 'Import') delete next.acid_number
                  return next
                })
              }}
              error={errors.shipment_direction}
            >
              <option value="">{t('sdForms.declaration.directionPlaceholder', { lng: 'en' })}</option>
              <option value="Export">{t('sdForms.declaration.exportDirection', { lng: 'en' })}</option>
              <option value="Import">{t('sdForms.declaration.importDirection', { lng: 'en' })}</option>
            </SelectInput>
          </div>

        </Section>

        <Section title={t('sdForms.declaration.sections.parties', { lng: 'en' })}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextareaInput
              id="sd-decl-shipper"
              label={t('sdForms.form.shipper', { lng: 'en' })}
              placeholder={t('sdForms.declaration.shipperPlaceholder', { lng: 'en' })}
              value={form.shipper_info}
              onChange={(e) => setField('shipper_info', e.target.value)}
            />
            <TextareaInput
              id="sd-decl-consignee"
              label={t('sdForms.form.consignee', { lng: 'en' })}
              placeholder={t('sdForms.declaration.consigneePlaceholder', { lng: 'en' })}
              value={form.consignee_info}
              onChange={(e) => setField('consignee_info', e.target.value)}
            />
            <div className="md:col-span-2">
              <SelectInput
                id="sd-decl-notify-mode"
                label={t('sdForms.form.notifyPartyMode', { lng: 'en' })}
                value={form.notify_party_mode}
                onChange={(e) => setField('notify_party_mode', e.target.value)}
              >
                <option value="">{t('sdForms.form.optional', { lng: 'en' })}</option>
                <option value="same">{t('sdForms.declaration.notifySameAsConsignee', { lng: 'en' })}</option>
                <option value="different">{t('sdForms.form.notifyDifferent', { lng: 'en' })}</option>
              </SelectInput>
            </div>
            {showNotifyDetails ? (
              <TextareaInput
                id="sd-decl-notify-details"
                className="md:col-span-2"
                label={t('sdForms.form.notifyPartyDetails', { lng: 'en' })}
                placeholder={t('sdForms.declaration.notifyDetailsPlaceholder', { lng: 'en' })}
                value={form.notify_party_details}
                onChange={(e) => setField('notify_party_details', e.target.value)}
              />
            ) : null}
          </div>
        </Section>

        <Section title={t('sdForms.declaration.sections.freight', { lng: 'en' })}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SelectInput
              id="sd-decl-freight"
              label={t('sdForms.form.freightTerm', { lng: 'en' })}
              description={t('sdForms.declaration.freightHint', { lng: 'en' })}
              value={form.freight_term}
              onChange={(e) => setField('freight_term', e.target.value)}
            >
              <option value="">{t('sdForms.form.optional', { lng: 'en' })}</option>
              <option value="Prepaid">{t('sdForms.declaration.prepaid', { lng: 'en' })}</option>
              <option value="Collect">{t('sdForms.declaration.collect', { lng: 'en' })}</option>
            </SelectInput>
          </div>
        </Section>

        <Section title={t('sdForms.declaration.sections.container', { lng: 'en' })}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SelectInput
              id="sd-decl-ctype"
              label={t('sdForms.form.containerType', { lng: 'en' })}
              value={form.container_type}
              onChange={(e) => setField('container_type', e.target.value)}
            >
              <option value="">{t('sdForms.form.optional', { lng: 'en' })}</option>
              {CONTAINER_TYPES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectInput>
            <SelectInput
              id="sd-decl-csize"
              label={t('sdForms.form.containerSize', { lng: 'en' })}
              value={form.container_size}
              onChange={(e) => setField('container_size', e.target.value)}
            >
              <option value="">{t('sdForms.form.optional', { lng: 'en' })}</option>
              {CONTAINER_SIZES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectInput>
          </div>
        </Section>

        <Section title={t('sdForms.declaration.sections.shipment', { lng: 'en' })}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {showAcid ? (
              <TextInput
                id="sd-decl-acid"
                label="14. ACID Number *"
                placeholder={t('sdForms.declaration.acidPlaceholder', { lng: 'en' })}
                value={form.acid_number}
                onChange={(e) => setField('acid_number', e.target.value)}
                error={errors.acid_number}
                required
              />
            ) : null}
            <DateInput
              id="sd-decl-vessel-date"
              label="15. Requested Vessel Date"
              value={form.requested_vessel_date}
              onChange={(e) => setField('requested_vessel_date', e.target.value)}
            />
            <NumberInput
              id="sd-decl-num-containers"
              label="16. Number of Containers"
              placeholder="0"
              min={1}
              value={form.num_containers}
              onChange={(e) => setField('num_containers', e.target.value)}
            />
          </div>
        </Section>

        <Section title={t('sdForms.declaration.sections.cargo', { lng: 'en' })}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextareaInput
              id="sd-decl-cargo"
              className="md:col-span-2"
              label={t('sdForms.form.cargo', { lng: 'en' })}
              placeholder={t('sdForms.declaration.cargoPlaceholder', { lng: 'en' })}
              value={form.cargo_description}
              onChange={(e) => setField('cargo_description', e.target.value)}
            />
            <TextInput
              id="sd-decl-hs"
              label={t('sdForms.form.hsCode', { lng: 'en' })}
              placeholder={t('sdForms.declaration.hsPlaceholder', { lng: 'en' })}
              value={form.hs_code}
              onChange={(e) => setField('hs_code', e.target.value)}
            />
          </div>
        </Section>

        {showReefer ? (
          <Section title={t('sdForms.declaration.sections.reefer', { lng: 'en' })}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <TextInput
                id="sd-decl-reefer-temp"
                label={t('sdForms.form.reeferTemp', { lng: 'en' })}
                placeholder={t('sdForms.declaration.reeferTempPlaceholder', { lng: 'en' })}
                value={form.reefer_temp}
                onChange={(e) => setField('reefer_temp', e.target.value)}
              />
              <TextInput
                id="sd-decl-reefer-vent"
                label={t('sdForms.form.reeferVent', { lng: 'en' })}
                placeholder={t('sdForms.declaration.reeferVentPlaceholder', { lng: 'en' })}
                value={form.reefer_vent}
                onChange={(e) => setField('reefer_vent', e.target.value)}
              />
              <TextInput
                id="sd-decl-reefer-hum"
                label={t('sdForms.form.reeferHum', { lng: 'en' })}
                placeholder={t('sdForms.declaration.reeferHumPlaceholder', { lng: 'en' })}
                value={form.reefer_hum}
                onChange={(e) => setField('reefer_hum', e.target.value)}
              />
            </div>
          </Section>
        ) : null}

        <Section title={t('sdForms.declaration.sections.weight', { lng: 'en' })}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <NumberInput
              id="sd-decl-gross"
              label={t('sdForms.declaration.grossWeightKg', { lng: 'en' })}
              placeholder="0"
              min={0}
              step="0.01"
              value={form.total_gross_weight}
              onChange={(e) => setField('total_gross_weight', e.target.value)}
            />
            <NumberInput
              id="sd-decl-net"
              label={t('sdForms.declaration.netWeightKg', { lng: 'en' })}
              placeholder="0"
              min={0}
              step="0.01"
              value={form.total_net_weight}
              onChange={(e) => setField('total_net_weight', e.target.value)}
            />
          </div>
        </Section>

        <Section 
          title={
            <div className="flex items-center gap-2">
              {t('sdForms.declaration.sections.notes', { lng: 'en' })}
              <span className="help-icon-wrapper">
                <HelpCircle className="h-4 w-4 text-gray-400" />
                <div className="help-icon-tooltip">
                  {t('sdForms.form.notesHint')}
                </div>
              </span>
            </div>
          }
        >
          <TextareaInput
            id="sd-decl-notes"
            placeholder={t('sdForms.form.notesHint', { lng: 'en' })}
            value={form.notes}
            onChange={(e) => setField('notes', e.target.value)}
            rows={4}
          />
        </Section>

        <div className="flex flex-col gap-3 border-t border-gray-200 pt-6 dark:border-gray-700 sm:flex-row sm:justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-gray-900 sm:w-auto"
          >
            {submitting ? t('sdForms.saving', { lng: 'en' }) : t('sdForms.declaration.submitDraft', { lng: 'en' })}
          </button>
        </div>
      </form>
    </Container>
  )
}
