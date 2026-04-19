import { useRef } from 'react';
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
  style = {},
  children,
  onFileSelect,
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
    if (file) {
      if (onFileSelect) {
        onFileSelect(file);
      } else {
        upload(file);
      }
    }
    // Reset input so same file can be re-uploaded
    e.target.value = '';
  };

  return (
    <div className={`file-upload-container ${className}`} style={style}>
      <input
        type="file"
        ref={inputRef}
        onChange={handleChange}
        accept={accept}
        style={{ display: 'none' }}
      />
      
      {children ? (
        <div onClick={() => !uploading && inputRef.current.click()} style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}>
          {typeof children === 'function' ? children({ uploading, progress }) : children}
        </div>
      ) : (
        <button
          className="file-upload-btn"
          onClick={() => inputRef.current.click()}
          disabled={uploading}
        >
          {uploading ? `Uploading... ${progress}%` : label}
        </button>
      )}

      {uploading && (
        <div className="file-upload-progress-bar" style={{ width: '100%', background: '#eee', height: 4, marginTop: 8, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, background: '#4f46e5', height: '100%', transition: 'width 0.3s ease' }} />
        </div>
      )}

      {error && <p className="file-upload-error" style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

