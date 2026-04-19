import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, Plus, Trash2, Check, X, Shield, HardDrive, Cloud } from 'lucide-react';
import api from '../../services/api';

const StorageSettings = () => {
  const { t } = useTranslation();
  const [disks, setDisks] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingDisk, setEditingDisk] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    driver: 'local',
    label: '',
    config: {},
    is_active: true,
    is_default: false,
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [disksRes, driversRes] = await Promise.all([
        api.get('/v1/storage/disks/admin'),
        api.get('/v1/storage/disks')
      ]);
      setDisks(disksRes.data.data);
      setAvailableDrivers(driversRes.data.disks);
    } catch (err) {
      console.error('Failed to fetch storage settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingDisk) {
        await api.put(`/v1/storage/disks/admin/${editingDisk.id}`, formData);
      } else {
        await api.post('/v1/storage/disks/admin', formData);
      }
      setEditingDisk(null);
      setIsAdding(false);
      fetchSettings();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving disk');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('confirmDelete'))) return;
    try {
      await api.delete(`/v1/storage/disks/admin/${id}`);
      fetchSettings();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting disk');
    }
  };

  const startEdit = (disk) => {
    setEditingDisk(disk);
    setFormData({
      ...disk,
      config: disk.config || {},
    });
    setIsAdding(true);
  };

  if (loading) return <div className="p-4 text-center">Loading...</div>;

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <div className="settings-section__title">
          <Database size={20} className="settings-section__icon" />
          <h3>{t('settings.storage.title', 'Storage Management')}</h3>
        </div>
        {!isAdding && (
          <button className="settings-btn settings-btn--primary" onClick={() => setIsAdding(true)}>
            <Plus size={16} />
            {t('settings.storage.addDisk', 'Add Disk')}
          </button>
        )}
      </div>

      {isAdding ? (
        <form onSubmit={handleSave} className="settings-form">
          <div className="settings-grid">
            <div className="settings-field">
              <label className="settings-label">{t('settings.storage.name', 'Disk Name (Slug)')}</label>
              <input 
                className="settings-input" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="e.g. google_drive_main"
                required
              />
            </div>
            <div className="settings-field">
              <label className="settings-label">{t('settings.storage.label', 'Label')}</label>
              <input 
                className="settings-input" 
                value={formData.label} 
                onChange={e => setFormData({...formData, label: e.target.value})} 
                placeholder="Google Drive (Archives)"
              />
            </div>
            <div className="settings-field">
              <label className="settings-label">{t('settings.storage.driver', 'Driver')}</label>
              <select 
                className="settings-input" 
                value={formData.driver} 
                onChange={e => setFormData({...formData, driver: e.target.value})}
              >
                {availableDrivers.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="settings-checkbox-wrap mt-4">
            <label className="checkbox-container">
              <input 
                type="checkbox" 
                checked={formData.is_active} 
                onChange={e => setFormData({...formData, is_active: e.target.checked})} 
              />
              <span className="checkmark"></span>
              {t('settings.storage.isActive', 'Active')}
            </label>
            <label className="checkbox-container ml-6">
              <input 
                type="checkbox" 
                checked={formData.is_default} 
                onChange={e => setFormData({...formData, is_default: e.target.checked})} 
              />
              <span className="checkmark"></span>
              {t('settings.storage.isDefault', 'Default Storage')}
            </label>
          </div>

          <div className="settings-form__actions mt-6">
            <button type="button" className="settings-btn settings-btn--secondary" onClick={() => setIsAdding(false)}>
              <X size={16} /> {t('cancel')}
            </button>
            <button type="submit" className="settings-btn settings-btn--primary">
              <Check size={16} /> {t('save')}
            </button>
          </div>
        </form>
      ) : (
        <div className="storage-disks-list">
          {disks.length === 0 ? (
            <p className="settings-empty">{t('settings.storage.noDisks', 'No custom disks configured. Using system defaults.')}</p>
          ) : (
            <div className="settings-table-wrapper">
              <table className="settings-table">
                <thead>
                  <tr>
                    <th>{t('settings.storage.disk', 'Disk')}</th>
                    <th>{t('settings.storage.driver', 'Driver')}</th>
                    <th>{t('settings.storage.status', 'Status')}</th>
                    <th>{t('settings.storage.default', 'Default')}</th>
                    <th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {disks.map(disk => (
                    <tr key={disk.id}>
                      <td>
                        <div className="disk-info">
                          <span className="disk-label">{disk.label || disk.name}</span>
                          <span className="disk-slug">{disk.name}</span>
                        </div>
                      </td>
                      <td>
                        <div className="disk-driver">
                          {disk.driver === 'local' ? <HardDrive size={14} /> : <Cloud size={14} />}
                          {disk.driver}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge status-badge--${disk.is_active ? 'active' : 'inactive'}`}>
                          {disk.is_active ? t('active') : t('inactive')}
                        </span>
                      </td>
                      <td>
                        {disk.is_default && <span className="default-indicator"><Check size={14} /> Default</span>}
                      </td>
                      <td className="actions-cell">
                        <button className="btn-icon" onClick={() => startEdit(disk)} title={t('edit')}>
                          <Plus size={16} /> {/* Replace with Edit icon if available */}
                        </button>
                        <button className="btn-icon btn-icon--danger" onClick={() => handleDelete(disk.id)} title={t('delete')}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StorageSettings;
