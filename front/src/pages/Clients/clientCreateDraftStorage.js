const STORAGE_KEY = 'amazonMarine.clientCreateDraft.v1'

export function readClientCreateDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function writeClientCreateDraft(form) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, savedAt: Date.now() }))
  } catch {
    /* ignore quota */
  }
}

export function clearClientCreateDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function isClientCreateDraftMeaningful(draft) {
  if (!draft?.form) return false
  const f = draft.form
  return Boolean(
    String(f.name || '').trim() ||
      String(f.company_name || '').trim() ||
      String(f.phone || '').trim() ||
      String(f.email || '').trim() ||
      String(f.address || '').trim() ||
      String(f.notes || '').trim()
  )
}
