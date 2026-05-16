export const LINK_FIELD_KEYS = ['website_url', 'facebook_url', 'linkedin_url']

export function defaultClientForm() {
  return {
    name: '',
    company_name: '',
    company_type_id: '',
    business_activity: '',
    target_markets: '',
    tax_id: '',
    email: '',
    phone: '',
    preferred_comm_method_id: '',
    address: '',
    website_url: '',
    facebook_url: '',
    linkedin_url: '',
    client_type: 'lead',
    status_id: '',
    lead_source_id: '',
    lead_source_other: '',
    interest_level_id: '',
    decision_maker_name: '',
    decision_maker_title_id: '',
    decision_maker_title_other: '',
    notes: '',
    shipping_problems: '',
    current_need: '',
    pain_points: '',
    opportunity: '',
    special_requirements: '',
    pricing_tier: '',
    pricing_discount_pct: '',
    pricing_updated_at: '',
    assigned_sales_id: '',
  }
}

export function buildClientFormSections(lookups) {
  const {
    companyTypes = [],
    commMethods = [],
    leadSources = [],
    interestLevels = [],
    decisionMakerTitles = [],
    clientStatuses = [],
  } = lookups

  return [
    {
      titleKey: 'clients.sections.basic',
      fields: [
        { key: 'name', type: 'text', required: true },
        { key: 'company_name', type: 'text', required: true },
        { key: 'company_type_id', type: 'select', options: companyTypes },
        { key: 'business_activity', type: 'text' },
        { key: 'target_markets', type: 'text' },
        { key: 'shipping_problems', type: 'textarea', rows: 2 },
        { key: 'preferred_comm_method_id', type: 'select', options: commMethods },
        { key: 'phone', type: 'text' },
        { key: 'email', type: 'email' },
        { key: 'interest_level_id', type: 'select', options: interestLevels },
        { key: 'address', type: 'text' },
        { key: 'website_url', type: 'url' },
        { key: 'tax_id', type: 'text' },
        { key: 'facebook_url', type: 'url' },
        { key: 'linkedin_url', type: 'url' },
      ],
    },
    {
      titleKey: 'clients.sections.decisionMaker',
      fields: [
        { key: 'decision_maker_name', type: 'text' },
        { key: 'decision_maker_title_id', type: 'select', options: decisionMakerTitles },
        { key: 'decision_maker_title_other', type: 'text' },
      ],
    },
    {
      titleKey: 'clients.sections.sourceSales',
      fields: [
        { key: 'client_type', type: 'client_type', required: true },
        { key: 'lead_source_id', type: 'select', options: leadSources },
        { key: 'lead_source_other', type: 'text' },
        { key: 'status_id', type: 'select', options: clientStatuses },
      ],
    },
    {
      titleKey: 'clients.sections.notesGuidance',
      fields: [
        { key: 'current_need', type: 'textarea', rows: 2 },
        { key: 'pain_points', type: 'textarea', rows: 2 },
        { key: 'opportunity', type: 'textarea', rows: 2 },
        { key: 'special_requirements', type: 'textarea', rows: 2 },
        { key: 'notes', type: 'textarea', rows: 4 },
      ],
    },
  ]
}

export function normalizeUrlForSubmit(value, fieldKey, t) {
  const raw = value != null ? String(value).trim() : ''
  if (!raw) return null

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw) ? raw : `https://${raw}`

  let parsed
  try {
    parsed = new URL(withProtocol)
  } catch {
    const err = new Error(t('clients.invalidUrl', { field: t(`clients.fields.${fieldKey}`) }))
    err.isValidation = true
    throw err
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    const err = new Error(t('clients.invalidUrl', { field: t(`clients.fields.${fieldKey}`) }))
    err.isValidation = true
    throw err
  }

  return parsed.toString()
}

export function buildClientPayload(form, { includeAssignedSales = false, assignedSalesId = null } = {}, t) {
  const num = (v) => (v !== '' && v != null ? Number(v) : null)
  const str = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : null)
  const normalizedLinks = LINK_FIELD_KEYS.reduce((acc, key) => {
    acc[key] = normalizeUrlForSubmit(form[key], key, t)
    return acc
  }, {})
  const payload = {
    name: form.name?.trim() || '',
    company_name: str(form.company_name),
    company_type_id: num(form.company_type_id),
    business_activity: str(form.business_activity),
    target_markets: str(form.target_markets),
    tax_id: str(form.tax_id),
    email: str(form.email),
    phone: str(form.phone),
    preferred_comm_method_id: num(form.preferred_comm_method_id),
    address: str(form.address),
    website_url: normalizedLinks.website_url,
    facebook_url: normalizedLinks.facebook_url,
    linkedin_url: normalizedLinks.linkedin_url,
    client_type: form.client_type === 'client' || form.client_type === 'lead' ? form.client_type : 'client',
    status_id: num(form.status_id),
    lead_source_id: num(form.lead_source_id),
    lead_source_other: str(form.lead_source_other),
    interest_level_id: num(form.interest_level_id),
    decision_maker_name: str(form.decision_maker_name),
    decision_maker_title_id: num(form.decision_maker_title_id),
    decision_maker_title_other: str(form.decision_maker_title_other),
    notes: str(form.notes),
    shipping_problems: str(form.shipping_problems),
    current_need: str(form.current_need),
    pain_points: str(form.pain_points),
    opportunity: str(form.opportunity),
    special_requirements: str(form.special_requirements),
    pricing_tier: str(form.pricing_tier),
    pricing_discount_pct:
      form.pricing_discount_pct !== '' && form.pricing_discount_pct != null ? Number(form.pricing_discount_pct) : null,
    pricing_updated_at: str(form.pricing_updated_at) || null,
  }
  if (includeAssignedSales) {
    payload.assigned_sales_id = assignedSalesId != null ? Number(assignedSalesId) : null
  }
  return payload
}
