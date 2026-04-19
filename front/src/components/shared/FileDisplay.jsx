import { useState } from 'react';
import axiosClient from '../../api/axiosClient';

export default function FileDisplay({ file, onDelete }) {
  const [url, setUrl]         = useState(file.url);
  const [deleting, setDeleting] = useState(false);

  // Refresh URL if it might have expired (for signed URLs)
  const refreshUrl = async () => {
    const res = await axiosClient.get(`/files/${file.id}/url`);
    setUrl(res.data.url);
    window.open(res.data.url, '_blank');
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this file?')) return;
    setDeleting(true);
    await axiosClient.delete(`/files/${file.id}`);
    onDelete?.(file.id);
  };

  const isImage = file.category === 'image';

  return (
    <div className="file-display">
      {isImage && <img src={url} alt={file.original_name} style={{ maxWidth: 120 }} />}

      <div className="file-info">
        <span>{file.original_name}</span>
        <span style={{ fontSize: 11, color: '#888' }}>
          {(file.size / 1024).toFixed(1)} KB — {file.disk}
        </span>
      </div>

      <div className="file-actions">
        <button onClick={refreshUrl}>View / Download</button>
        <button onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
