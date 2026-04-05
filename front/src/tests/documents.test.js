import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDocuments } from '../pages/Documents/hooks/useDocuments'
import * as api from '../api/documents'

// Mock the API module
vi.mock('../api/documents', () => ({
  getDocuments: vi.fn(),
  uploadDocument: vi.fn(),
  deleteDocument: vi.fn(),
  downloadDocumentFromUrl: vi.fn(),
}))

describe('useDocuments hook', () => {
  const token = 'fake-token'
  const type = 'company'
  const mockDocs = [
    { id: 1, name: 'Doc 1', type: 'company', created_at: '2026-01-01' },
    { id: 2, name: 'Doc 2', type: 'company', created_at: '2026-01-02' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches documents on mount', async () => {
    api.getDocuments.mockResolvedValueOnce({ data: mockDocs })

    const { result } = renderHook(() => useDocuments(token, type))

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.documents).toEqual(mockDocs)
    expect(api.getDocuments).toHaveBeenCalledWith(token, type)
  })

  it('handles fetch error', async () => {
    const errorMsg = 'Failed to fetch'
    api.getDocuments.mockRejectedValueOnce(new Error(errorMsg))

    const { result } = renderHook(() => useDocuments(token, type))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe(errorMsg)
    expect(result.current.documents).toEqual([])
  })

  it('uploads a new document and refetches the list', async () => {
    const newDoc = {
      id: 3,
      name: 'New Doc',
      type: 'company',
      created_at: '2026-01-03',
      preview_url: 'https://api.example/preview/3',
      download_url: 'https://api.example/dl/3',
    }
    const listAfterUpload = [newDoc, ...mockDocs]
    api.getDocuments.mockResolvedValueOnce({ data: mockDocs })
    api.getDocuments.mockResolvedValueOnce({ data: listAfterUpload })
    api.uploadDocument.mockResolvedValueOnce({ data: { id: 3, name: 'New Doc', type: 'company' } })

    const { result } = renderHook(() => useDocuments(token, type))

    await waitFor(() => expect(result.current.loading).toBe(false))

    let uploaded
    await waitFor(async () => {
      uploaded = await result.current.upload('New Doc', 'company', new File([], 'test.pdf'))
    })

    expect(uploaded).toEqual({ id: 3, name: 'New Doc', type: 'company' })
    expect(result.current.documents).toEqual(listAfterUpload)
    expect(api.getDocuments).toHaveBeenCalledTimes(2)
  })

  it('deletes a document and removes it from the list', async () => {
    api.getDocuments.mockResolvedValueOnce({ data: mockDocs })
    api.deleteDocument.mockResolvedValueOnce({ message: 'Deleted' })

    const { result } = renderHook(() => useDocuments(token, type))

    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.remove(1)

    await waitFor(() => {
      expect(result.current.documents).toHaveLength(1)
    })

    expect(api.deleteDocument).toHaveBeenCalledWith(token, 1)
    expect(result.current.documents.find(d => d.id === 1)).toBeUndefined()
  })
})
