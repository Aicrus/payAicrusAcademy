'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { countryCodes, CountryCode, getDefaultCountry } from '@/utils/countryCodes';

interface CountryCodeSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function CountryCodeSelect({ value, onChange, disabled = false }: CountryCodeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(getDefaultCountry());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Inicializar o país com base no valor (dial_code) fornecido
  useEffect(() => {
    if (value) {
      const country = countryCodes.find(c => c.dial_code === value);
      if (country) {
        setSelectedCountry(country);
      }
    }
  }, [value]);

  // Fechar o dropdown quando clicar fora dele
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (country: CountryCode) => {
    setSelectedCountry(country);
    onChange(country.dial_code);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`inline-flex items-center px-2.5 rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 text-gray-700 h-11 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F2B1B] ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
        }`}
      >
        <span className="text-base mr-1">{selectedCountry.flag}</span>
        <span className="font-medium">{selectedCountry.dial_code}</span>
        <ChevronDownIcon className="ml-1 h-4 w-4" />
      </button>

      {isOpen && (
        <div className="origin-top-left absolute left-0 mt-1 w-52 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none z-10">
          <div className="py-1 max-h-60 overflow-y-auto">
            {countryCodes.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => handleSelect(country)}
                className={`${
                  selectedCountry.code === country.code ? 'bg-gray-100 text-[#0F2B1B]' : 'text-gray-700'
                } flex items-center w-full px-3 py-2 text-sm hover:bg-gray-50`}
              >
                <span className="text-base mr-2">{country.flag}</span>
                <span>{country.name}</span>
                <span className="ml-auto text-gray-500">{country.dial_code}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 