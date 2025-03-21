export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    // Formato CPF: 000.000.000-00
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    // Formato CNPJ: 00.000.000/0000-00
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
}

export function formatPhone(value: string, isBrazilian: boolean = true): string {
  const digits = value.replace(/\D/g, '');
  
  if (isBrazilian) {
    // Formato brasileiro: (00) 00000-0000
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  } else {
    // Formato internacional mais genérico
    if (digits.length <= 7) {
      return digits;
    } else if (digits.length <= 10) {
      return digits
        .replace(/(\d{3})(\d{4,7})/, '$1 $2');
    } else {
      return digits
        .replace(/(\d{3})(\d{3})(\d{4,})/, '$1 $2 $3');
    }
  }
}

export function splitPhoneNumber(phoneWithCode: string): { dialCode: string; phoneNumber: string } {
  // Se o número já começar com +, extraímos o código
  if (phoneWithCode.startsWith('+')) {
    const match = phoneWithCode.match(/(\+\d+)\s*(.*)/);
    if (match) {
      return {
        dialCode: match[1],
        phoneNumber: match[2].trim()
      };
    }
  }
  
  // Se não tiver código internacional, assumimos que é brasileiro
  return {
    dialCode: '+55',
    phoneNumber: phoneWithCode.replace(/\D/g, '')
  };
}

export function joinPhoneWithDialCode(dialCode: string, phoneNumber: string): string {
  if (!dialCode || !phoneNumber) return phoneNumber;
  
  const isBrazilian = dialCode === '+55';
  const formattedPhone = formatPhone(phoneNumber, isBrazilian);
  
  return `${dialCode} ${formattedPhone}`;
} 