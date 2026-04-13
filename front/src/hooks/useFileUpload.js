import { useState } from 'react';
import { apiFetch } from '../api/http';
import { getApiBaseUrl } from '../api/apiBaseUrl';

/**
 * Generic file upload hook.
 *
 * @param {Object} options
 * @param {string}  options.collection   - Backend collection name ('avatars', 'invoices', etc.)
 * @param {string}  [options.disk]       - Force a specific disk ('local' | 'google_drive' | null = default)
 * @param {string}  [options.fileableType] - e.g. 'App\\Models\\Invoice'
 * @param {number}  [options.fileableId]   - The owner model's ID
 * @param {Function} [options.onSuccess]   - Called with the FileRecord response
 * @param {Function} [options.onError]     - Called with the error
 */
export function useFileUpload({
  collection = 'general',
  disk = null,
  fileableType = null,
  fileableId = null,
  onSuccess,
  onError,
} = {}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]         = useState(null);
  const [result, setResult]       = useState(null);

  const upload = async (file) => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('collection', collection);

    if (disk)         formData.append('disk', disk);
    if (fileableType) formData.append('fileable_type', fileableType);
    if (fileableId)   formData.append('fileable_id', fileableId);

    try {
      const baseUrl = getApiBaseUrl();
      const response = await apiFetch(`${baseUrl}/files/upload`, {
        method: 'POST',
        body: formData,
        // Headers like Accept-Language and Authorization are handled by apiFetch / interceptors if any
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Upload failed.');
      }

      const data = await response.json();
      setResult(data);
      onSuccess?.(data);
      return data;
    } catch (err) {
      const msg = err.message || 'Upload failed.';
      setError(msg);
      onError?.(err);
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, progress, error, result };
}
