import React, { useState } from 'react';
import { apiFetch } from '../../api/http';
import { getApiBaseUrl } from '../../api/apiBaseUrl';

export default function FileDisplay({ file, onDelete }) {
  const [url, setUrl]         = useState(file.url);
  const [deleting, setDeleting] = useState(false);

  const refreshUrl = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await apiFetch(`${baseUrl}/files/${file.id}/url`);
      const data = await res.json();
      setUrl(data.url);
      window.open(data.url, '_blank');
    } catch (err) {
      console.error('Failed to refresh URL', err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(window.i18next?.t('Delete this file?') || 'Delete this file?')) return;
    setDeleting(true);
    try {
      const baseUrl = getApiBaseUrl();
      await apiFetch(`${baseUrl}/files/${file.id}`, { method: 'DELETE' });
      onDelete?.(file.id);
    } catch (err) {
      console.error('Failed to delete file', err);
    } finally {
      setDeleting(false);
    }
  };

  const isImage = file.category === 'image';

  return (
    <div className="flex items-center gap-4 p-3 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
      {isImage ? (
        <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-gray-100 border">
          <img src={url} alt={file.original_name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-16 h-16 rounded flex-shrink-0 bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
      )}

      <div className="flex-grow min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate" title={file.original_name}>
          {file.original_name}
        </p>
        <p className="text-xs text-gray-500">
          {(file.size / 1024).toFixed(1)} KB — <span className="uppercase text-indigo-600 font-semibold">{file.disk}</span>
        </p>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={refreshUrl}
          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
          title="View / Download"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button 
          onClick={handleDelete} 
          disabled={deleting}
          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
          title="Delete"
        >
          {deleting ? (
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          )}
        </button>
      </div>
    </div>
  );
}
