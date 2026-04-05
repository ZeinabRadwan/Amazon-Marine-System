import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Search, UploadCloud, FileText } from 'lucide-react'
import { getStoredToken } from '../Login'
import { useDocuments } from './hooks/useDocuments'
import DocumentCard from './components/DocumentCard'
import DocumentModal from './DocumentModal'
import DocumentPreviewDialog from './DocumentPreviewDialog'
import Tabs from '../../components/Tabs'
import { Container } from '../../components/Container'
import './Documents.css'

export default function Documents() {
  const { t } = useTranslation()
  const token = getStoredToken()

  const [activeTab, setActiveTab] = useState('company')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [previewDoc, setPreviewDoc] = useState(null)

  const listType = activeTab === 'templates' ? 'template' : 'company'
  const { documents, loading, error, upload, remove, download } = useDocuments(token, listType)

  const handleUpload = useCallback(
    async (name, uploadType, file) => {
      await upload(name, uploadType, file)
      setActiveTab(uploadType === 'template' ? 'templates' : 'company')
    },
    [upload]
  )

  const tabs = useMemo(() => [
    { id: 'company', label: t('documents.companyDocs', 'Company Documents') },
    { id: 'templates', label: t('documents.templates', 'Templates') }
  ], [t])

  const filteredDocuments = useMemo(() => {
    if (!searchQuery) return documents
    return documents.filter(doc => 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [documents, searchQuery])

  return (
    <Container size="xl" className="documents-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('documents.title', 'Official Documents')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('documents.subtitle', 'Manage and access all official company records and templates.')}
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus size={20} />
          {t('documents.uploadAction', 'Upload Document')}
        </button>
      </div>

      <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <Tabs 
            tabs={tabs} 
            activeTab={activeTab} 
            onChange={setActiveTab} 
            className="flex-shrink-0"
          />
          
          <div className="relative flex-grow max-w-md">
            <Search className="documents-search__icon" size={18} aria-hidden />
            <input 
              type="text" 
              placeholder={t('documents.searchPlaceholder', 'Search documents...')}
              className="documents-search__input w-full py-2.5 bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-blue-500 transition-all text-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="documents-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="document-shimmer">
              <div className="w-12 h-12 rounded-lg shimmer-line" />
              <div className="h-6 w-3/4 shimmer-line" />
              <div className="h-4 w-1/2 shimmer-line" />
              <div className="mt-auto h-10 w-full shimmer-line" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full text-red-500 mb-4">
                <FileText size={48} />
            </div>
            <h3 className="text-lg font-bold text-red-500">{t('common.error')}</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto mt-1">{error}</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl">
            <div className="p-4 bg-gray-100 dark:bg-gray-800/50 rounded-full text-gray-400 mb-4">
                <UploadCloud size={48} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('documents.noFilesTitle', 'No documents found')}</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto mt-2">
                {searchQuery ? t('documents.noSearchMatch', 'No documents match your search criteria.') : t('documents.noFilesSubtitle', 'Start by uploading your first official document.')}
            </p>
        </div>
      ) : (
        <div className="documents-grid">
          {filteredDocuments.map(doc => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onDelete={remove}
              onDownload={download}
              onView={setPreviewDoc}
            />
          ))}
        </div>
      )}

      <DocumentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onUpload={handleUpload} />

      <DocumentPreviewDialog
        open={!!previewDoc}
        token={token}
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />
    </Container>
  )
}
