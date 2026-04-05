import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ChevronDown, X, Loader2 } from 'lucide-react';
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
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
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

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setInputValue('');
  };

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      <div
        className={`flex items-center justify-between px-3 py-2 border rounded-lg cursor-pointer ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-blue-400'
        } ${isOpen ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-300'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex-1 truncate">
          {value ? (
            <span className="text-gray-900">{value.label}</span>
          ) : (
            <span className="text-gray-400">{placeholder || t('common.select')}</span>
          )}
        </div>
        <div className="flex items-center space-x-1 ml-2 rtl:mr-2 rtl:ml-0">
          {isClearable && value && !disabled && (
            <X
              className="h-4 w-4 text-gray-400 hover:text-gray-600"
              onClick={handleClear}
            />
          ) }
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl animate-in fade-in zoom-in duration-150">
          <div className="p-2 border-bottom">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                autoFocus
                type="text"
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
                placeholder={t('common.searchPlaceholder') || 'Search...'}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              </div>
            ) : options.length > 0 ? (
              options.map((option) => (
                <div
                  key={option.value}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${
                    value?.value === option.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                  onClick={() => handleSelect(option)}
                >
                  {option.label}
                  {option.sublabel && (
                    <div className="text-xs text-gray-400">{option.sublabel}</div>
                  )}
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-center text-gray-500">
                {t('common.noResults') || 'No results found'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AsyncSelect;
