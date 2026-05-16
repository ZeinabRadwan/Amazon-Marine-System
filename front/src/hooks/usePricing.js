import { useState, useEffect, useCallback } from 'react'
import { getStoredToken } from '../pages/Login'
import {
  listOffers,
  createOffer,
  updateOffer,
  activateOffer,
  archiveOffer,
  deleteOffer,
  listQuotes,
  getQuote,
  createQuote,
  updateQuote,
  acceptQuote,
  rejectQuote,
  downloadQuotePdf,
} from '../api/pricing'
import { notifyPricingError, PRICING_ACTIONS, runPricingAction } from '../pages/Pricing/utils/pricingFeedback'

export function useOffers(params) {
  const [data, setData] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refetchTick, setRefetchTick] = useState(0)

  // Use stringified params for dependency tracking
  const paramsString = JSON.stringify(params)

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      setError('Not authenticated')
      setLoading(false)
      setData([])
      setMeta(null)
      return undefined
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    const parsedParams = paramsString ? JSON.parse(paramsString) : {}
    listOffers(token, parsedParams, { signal: controller.signal })
      .then((res) => {
        setData(res.data ?? [])
        setMeta(res.meta ?? null)
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        setError(err.message || 'Failed to load offers')
        setData([])
        setMeta(null)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [paramsString, refetchTick])

  const refetch = useCallback(() => setRefetchTick((n) => n + 1), [])

  return { data, meta, loading, error, refetch }
}

export function useMutateOffer() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleMutation = async (action, mutationFn, args = [], options = {}) => {
    const token = getStoredToken()
    if (!token) {
      const err = new Error('Not authenticated')
      setError(err.message)
      notifyPricingError(action, err)
      throw err
    }

    setLoading(true)
    setError(null)
    try {
      const result = await runPricingAction(
        action,
        () => mutationFn(token, ...args),
        options,
      )
      setLoading(false)
      return result
    } catch (err) {
      setError(err.message || 'Mutation failed')
      setLoading(false)
      throw err
    }
  }

  return {
    create: (data) => handleMutation(PRICING_ACTIONS.OFFER_CREATE, createOffer, [data]),
    update: (id, data) => handleMutation(PRICING_ACTIONS.OFFER_UPDATE, updateOffer, [id, data]),
    activate: (id) => handleMutation(PRICING_ACTIONS.OFFER_ACTIVATE, activateOffer, [id]),
    archive: (id) => handleMutation(PRICING_ACTIONS.OFFER_ARCHIVE, archiveOffer, [id]),
    delete: (id) => handleMutation(PRICING_ACTIONS.OFFER_DELETE, deleteOffer, [id]),
    loading,
    error,
  }
}

export function useQuotes(params) {
  const [data, setData] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const paramsString = JSON.stringify(params)

  const fetchQuotes = useCallback(() => {
    const token = getStoredToken()
    if (!token) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const parsedParams = paramsString ? JSON.parse(paramsString) : {}
    listQuotes(token, parsedParams)
      .then((res) => {
        setData(res.data ?? [])
        setMeta(res.meta ?? null)
      })
      .catch((err) => {
        setError(err.message || 'Failed to load quotes')
        setData([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [paramsString])

  useEffect(() => {
    fetchQuotes()
  }, [fetchQuotes])

  return { data, meta, loading, error, refetch: fetchQuotes }
}

export function useMutateQuote() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleMutation = async (action, mutationFn, args = [], options = {}) => {
    const token = getStoredToken()
    if (!token) {
      const err = new Error('Not authenticated')
      setError(err.message)
      notifyPricingError(action, err)
      throw err
    }

    setLoading(true)
    setError(null)
    try {
      const result = await runPricingAction(
        action,
        () => mutationFn(token, ...args),
        options,
      )
      setLoading(false)
      return result
    } catch (err) {
      setError(err.message || 'Mutation failed')
      setLoading(false)
      throw err
    }
  }

  return {
    get: (id) =>
      handleMutation(PRICING_ACTIONS.QUOTE_GET, getQuote, [id], { notifySuccess: false }),
    create: (data) => handleMutation(PRICING_ACTIONS.QUOTE_CREATE, createQuote, [data]),
    update: (id, data) => handleMutation(PRICING_ACTIONS.QUOTE_UPDATE, updateQuote, [id, data]),
    accept: (id) => handleMutation(PRICING_ACTIONS.QUOTE_ACCEPT, acceptQuote, [id]),
    reject: (id) => handleMutation(PRICING_ACTIONS.QUOTE_REJECT, rejectQuote, [id]),
    downloadPdf: (id, options) =>
      handleMutation(PRICING_ACTIONS.QUOTE_PDF, downloadQuotePdf, [id, options]),
    loading,
    error,
  }
}
