import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ChevronDown, X, Loader2, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * A lightweight AsyncSelect component for searching and selecting items.
 * 
 * @param {Object} props
 * @param {Function} props.loadOptions - function(query) => Promise<Array<{value, label}>>
 * @param {Object} props.value - {value, label} or null
 * @param {Function} props.onChange - function({value, label})
 * @param {string} props.placeholder - placeholder text
 * @param {boolean} props.isClearable - if true, shows X button
 * @param {string} props.className - additional classes
 */
const AsyncSelect = ({
  loadOptions,
  value,
  onChange,
  placeholder,
  isClearable = true,
  className = '',
  disabled = false,
  onCreate, // New: function(name) => Promise<{value, label}>
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchOptions = useCallback(async (query) => {
    setIsLoading(true);
    try {
      const results = await loadOptions(query);
      setOptions(results || []);
    } catch (error) {
      console.error('AsyncSelect load error:', error);
      setOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [loadOptions]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      fetchOptions(inputValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, isOpen, fetchOptions]);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setInputValue('');
  };

  const handleCreate = async (e) => {
    e.stopPropagation();
    if (!onCreate || !inputValue.trim()) return;
    
    setIsCreating(true);
    try {
      const newOption = await onCreate(inputValue.trim());
      if (newOption) {
        handleSelect(newOption);
      }
    } catch (error) {
      console.error('AsyncSelect create error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setInputValue('');
  };

  const showCreateOption = onCreate && 
    inputValue.trim() && 
    !isLoading && 
    !options.some(opt => opt.label.toLowerCase() === inputValue.trim().toLowerCase());

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      <div
        className={`flex items-center justify-between px-3 py-2 border rounded-lg cursor-pointer ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-blue-400'
        } ${isOpen ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-300'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex-1 truncate text-start">
          {value ? (
            <span className="text-gray-900">{value.label}</span>
          ) : (
            <span className="text-gray-400">{placeholder || t('common.select') || 'Select...'}</span>
          )}
        </div>
        <div className="flex items-center space-x-1 rtl:space-x-reverse ms-2">
          {isClearable && value && !disabled && !isLoading && !isCreating && (
            <button
              type="button"
              className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
            </button>
          )}
          {(isLoading || isCreating) && (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl animate-in fade-in zoom-in duration-150">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                autoFocus
                type="text"
                dir="rtl"
                style={{ direction: 'rtl', textAlign: 'right' }}
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-500 text-right"
                placeholder="Search..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              </div>
            ) : (
              <>
                {options.map((option) => (
                  <div
                    key={option.value}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 text-start ${
                      String(value?.value) === String(option.value) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                    }`}
                    onClick={() => handleSelect(option)}
                  >
                    {option.label}
                    {option.sublabel && (
                      <div className="text-xs text-gray-400">{option.sublabel}</div>
                    )}
                  </div>
                ))}
                
                {showCreateOption && (
                  <div
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 text-blue-600 font-medium border-t border-gray-100"
                    onClick={handleCreate}
                  >
                    <div className="flex items-center">
                      <Plus className="h-4 w-4 me-2" />
                      {t('common.create') || 'Create'}: "{inputValue}"
                    </div>
                  </div>
                )}

                {options.length === 0 && !showCreateOption && (
                  <div className="px-3 py-4 text-sm text-center text-gray-500">
                    {t('common.noResults') || 'No results found'}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AsyncSelect;
