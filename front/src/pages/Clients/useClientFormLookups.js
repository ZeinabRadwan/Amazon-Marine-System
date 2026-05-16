import { useEffect, useState } from 'react'
import { getStoredToken } from '../Login'
import {
  listClientStatuses,
  listCompanyTypes,
  listPreferredCommMethods,
  listLeadSources,
  listInterestLevels,
  listDecisionMakerTitles,
} from '../../api/clientLookups'

export function useClientFormLookups(enabled = true) {
  const [companyTypes, setCompanyTypes] = useState([])
  const [commMethods, setCommMethods] = useState([])
  const [leadSources, setLeadSources] = useState([])
  const [interestLevels, setInterestLevels] = useState([])
  const [decisionMakerTitles, setDecisionMakerTitles] = useState([])
  const [clientStatuses, setClientStatuses] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled) return
    const token = getStoredToken()
    if (!token) return

    let cancelled = false
    setLoading(true)

    Promise.all([
      listClientStatuses(token).then((data) => data.data ?? data ?? []),
      listCompanyTypes(token).then((data) => data.data ?? data ?? []),
      listPreferredCommMethods(token).then((data) => data.data ?? data ?? []),
      listLeadSources(token).then((data) => data.data ?? data ?? []),
      listInterestLevels(token).then((data) => data.data ?? data ?? []),
      listDecisionMakerTitles(token).then((data) => data.data ?? data ?? []),
    ])
      .then(([statuses, types, comms, leads, interests, titles]) => {
        if (cancelled) return
        setClientStatuses(statuses)
        setCompanyTypes(types)
        setCommMethods(comms)
        setLeadSources(leads)
        setInterestLevels(interests)
        setDecisionMakerTitles(titles)
      })
      .catch(() => {
        if (cancelled) return
        setClientStatuses([])
        setCompanyTypes([])
        setCommMethods([])
        setLeadSources([])
        setInterestLevels([])
        setDecisionMakerTitles([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [enabled])

  return {
    companyTypes,
    commMethods,
    leadSources,
    interestLevels,
    decisionMakerTitles,
    clientStatuses,
    loading,
  }
}
