import { useState, useCallback, useEffect } from 'react'
import { getStoredToken } from '../pages/Login'
import {
  listOffers,
  createOffer,
  updateOffer,
  activateOffer,
  archiveOffer,
  listQuotes,
  getQuote,
  createQuote,
  updateQuote,
  acceptQuote,
  rejectQuote,
} from '../api/pricing'

export function useOffers(params) {
  const [data, setData] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Use stringified params for dependency tracking
  const paramsString = JSON.stringify(params)

  const fetchOffers = useCallback(() => {
    const token = getStoredToken()
    if (!token) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const parsedParams = paramsString ? JSON.parse(paramsString) : {}
    listOffers(token, parsedParams)
      .then((res) => {
        setData(res.data ?? [])
        setMeta(res.meta ?? null)
      })
      .catch((err) => {
        setError(err.message || 'Failed to load offers')
        setData([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [paramsString])

  useEffect(() => {
    fetchOffers()
  }, [fetchOffers])

  return { data, meta, loading, error, refetch: fetchOffers }
}

export function useMutateOffer() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleMutation = async (mutationFn, ...args) => {
    const token = getStoredToken()
    if (!token) {
      const err = new Error('Not authenticated')
      setError(err.message)
      throw err
    }

    setLoading(true)
    setError(null)
    try {
      const result = await mutationFn(token, ...args)
      setLoading(false)
      return result
    } catch (err) {
      setError(err.message || 'Mutation failed')
      setLoading(false)
      throw err
    }
  }

  return {
    create: (data) => handleMutation(createOffer, data),
    update: (id, data) => handleMutation(updateOffer, id, data),
    activate: (id) => handleMutation(activateOffer, id),
    archive: (id) => handleMutation(archiveOffer, id),
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

  const handleMutation = async (mutationFn, ...args) => {
    const token = getStoredToken()
    if (!token) {
      const err = new Error('Not authenticated')
      setError(err.message)
      throw err
    }

    setLoading(true)
    setError(null)
    try {
      const result = await mutationFn(token, ...args)
      setLoading(false)
      return result
    } catch (err) {
      setError(err.message || 'Mutation failed')
      setLoading(false)
      throw err
    }
  }

  return {
    get: (id) => handleMutation(getQuote, id),
    create: (data) => handleMutation(createQuote, data),
    update: (id, data) => handleMutation(updateQuote, id, data),
    accept: (id) => handleMutation(acceptQuote, id),
    reject: (id) => handleMutation(rejectQuote, id),
    loading,
    error,
  }
}
