import React, { useRef } from 'react';
import { useFileUpload } from '../../hooks/useFileUpload';

export default function FileUploadButton({
  collection,
  disk,
  fileableType,
  fileableId,
  accept,
  label = 'Upload File',
  onSuccess,
  onError,
  className = '',
}) {
  const inputRef = useRef();
  const { upload, uploading, progress, error } = useFileUpload({
    collection,
    disk,
    fileableType,
    fileableId,
    onSuccess,
    onError,
  });

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) upload(file);
    // Reset input so same file can be re-uploaded
    e.target.value = '';
  };

  return (
    <div className={`file-upload-container ${className}`}>
      <input
        type="file"
        ref={inputRef}
        onChange={handleChange}
        accept={accept}
        style={{ display: 'none' }}
      />
      
      <button
        type="button"
        onClick={() => inputRef.current.click()}
        disabled={uploading}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {uploading ? (
          <span className="flex items-center gap-2">
             <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
             {label} {progress}%
          </span>
        ) : label}
      </button>

      {uploading && (
        <div className="w-full bg-gray-200 h-1 mt-2 rounded overflow-hidden">
          <div 
            className="bg-indigo-600 h-full transition-all duration-300" 
            style={{ width: `${progress}%` }} 
          />
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
