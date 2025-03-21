export interface CountryCode {
  code: string;
  name: string;
  flag: string;
  dial_code: string;
}

export const countryCodes: CountryCode[] = [
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', dial_code: '+55' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', dial_code: '+1' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', dial_code: '+351' },
  { code: 'ES', name: 'Espanha', flag: '🇪🇸', dial_code: '+34' },
  { code: 'DE', name: 'Alemanha', flag: '🇩🇪', dial_code: '+49' },
  { code: 'FR', name: 'França', flag: '🇫🇷', dial_code: '+33' },
  { code: 'IT', name: 'Itália', flag: '🇮🇹', dial_code: '+39' },
  { code: 'UK', name: 'Reino Unido', flag: '🇬🇧', dial_code: '+44' },
  { code: 'CA', name: 'Canadá', flag: '🇨🇦', dial_code: '+1' },
  { code: 'JP', name: 'Japão', flag: '🇯🇵', dial_code: '+81' },
  { code: 'AU', name: 'Austrália', flag: '🇦🇺', dial_code: '+61' },
  { code: 'NZ', name: 'Nova Zelândia', flag: '🇳🇿', dial_code: '+64' },
  { code: 'MX', name: 'México', flag: '🇲🇽', dial_code: '+52' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', dial_code: '+54' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', dial_code: '+56' },
  { code: 'CO', name: 'Colômbia', flag: '🇨🇴', dial_code: '+57' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', dial_code: '+51' },
  { code: 'UY', name: 'Uruguai', flag: '🇺🇾', dial_code: '+598' },
  { code: 'PY', name: 'Paraguai', flag: '🇵🇾', dial_code: '+595' },
  { code: 'BO', name: 'Bolívia', flag: '🇧🇴', dial_code: '+591' },
];

export const getCountryByDialCode = (dialCode: string): CountryCode | undefined => {
  return countryCodes.find(country => country.dial_code === dialCode);
};

export const getDefaultCountry = (): CountryCode => {
  return countryCodes.find(country => country.code === 'BR') || countryCodes[0];
}; 