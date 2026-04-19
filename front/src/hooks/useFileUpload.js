import { useState } from 'react';
import axiosClient from '../api/axiosClient'; // your existing axios instance

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
      const response = await axiosClient.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 100) / e.total);
          setProgress(pct);
        },
      });

      setResult(response.data);
      onSuccess?.(response.data);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Upload failed.';
      setError(msg);
      onError?.(err);
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, progress, error, result };
}
