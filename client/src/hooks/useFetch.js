import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'

/**
 * Hook per fetch dati con loading e error state
 * @param {string} url - URL endpoint
 * @param {object} options - { params, enabled, deps }
 */
export function useFetch(url, options = {}) {
  const { params = {}, enabled = true, deps = [] } = options

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!enabled || !url) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const res = await api.get(url, { params })
      setData(res.data)
    } catch (err) {
      setError(err.response?.data?.messaggio || err.message || 'Errore nel caricamento')
    } finally {
      setLoading(false)
    }
  }, [url, JSON.stringify(params), enabled])

  useEffect(() => {
    fetchData()
  }, [fetchData, ...deps])

  return { data, loading, error, refetch: fetchData }
}
