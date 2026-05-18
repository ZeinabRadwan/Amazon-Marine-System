/**
 * Operations tab vendors → financial cost-invoice section_meta (read-only source of truth).
 */

function vendorPartnerFromOperation(ops, idKey, relationSnake, relationCamel) {
  if (!ops || ops[idKey] == null || ops[idKey] === '') return null
  const vendorId = Number(ops[idKey])
  if (!Number.isFinite(vendorId) || vendorId <= 0) return null
  const rel = ops[relationSnake] || ops[relationCamel]
  const name = String(rel?.name || '').trim()
  return { vendorId, name }
}

/** @returns {{ inland: { vendorId: number, name: string }|null, customs: ..., insurance: ... }} */
export function parseOpsPartnersFromOperation(ops) {
  return {
    inland: vendorPartnerFromOperation(
      ops,
      'transport_contractor_id',
      'transport_contractor',
      'transportContractor'
    ),
    customs: vendorPartnerFromOperation(ops, 'customs_broker_id', 'customs_broker', 'customsBroker'),
    insurance: vendorPartnerFromOperation(
      ops,
      'insurance_company_id',
      'insurance_company',
      'insuranceCompany'
    ),
  }
}

export function mergeOpsPartnersIntoSectionMeta(sectionMeta, opsPartners) {
  const meta = { ...(sectionMeta || {}) }

  if (opsPartners?.inland?.vendorId) {
    meta.inland = {
      ...(meta.inland || {}),
      contractor_vendor_id: opsPartners.inland.vendorId,
      contractor_name: opsPartners.inland.name || meta.inland?.contractor_name || '',
    }
  }
  if (opsPartners?.customs?.vendorId) {
    meta.customs = {
      ...(meta.customs || {}),
      customs_broker_vendor_id: opsPartners.customs.vendorId,
      customs_broker_name: opsPartners.customs.name || meta.customs?.customs_broker_name || '',
    }
  }
  if (opsPartners?.insurance?.vendorId) {
    meta.insurance = {
      ...(meta.insurance || {}),
      insurance_company_vendor_id: opsPartners.insurance.vendorId,
      insurance_company_name: opsPartners.insurance.name || meta.insurance?.insurance_company_name || '',
    }
  }

  return meta
}

export function opsPartnerForBucket(opsPartners, bucketId) {
  if (bucketId === 'inland') return opsPartners?.inland ?? null
  if (bucketId === 'customs') return opsPartners?.customs ?? null
  if (bucketId === 'insurance') return opsPartners?.insurance ?? null
  return null
}
