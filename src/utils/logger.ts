type SensitiveData = {
  email?: string;
  whatsApp?: string;
  cpfCnpj?: string;
  mobilePhone?: string;
  phone?: string;
  [key: string]: any;
};

function maskSensitiveData(data: SensitiveData): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const maskedData = { ...data };

  // Mascara emails
  if (maskedData.email) {
    const [localPart, domain] = maskedData.email.split('@');
    maskedData.email = `${localPart.slice(0, 3)}***@${domain}`;
  }

  // Mascara números de telefone/WhatsApp
  ['whatsApp', 'mobilePhone', 'phone'].forEach(field => {
    if (maskedData[field]) {
      maskedData[field] = maskedData[field].replace(/(\d{2})(\d{4,5})(\d{4})/, '$1****$3');
    }
  });

  // Mascara CPF/CNPJ
  if (maskedData.cpfCnpj) {
    maskedData.cpfCnpj = maskedData.cpfCnpj.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.$3-**');
  }

  return maskedData;
}

export function safeLog(message: string, data?: any): void {
  if (process.env.NODE_ENV === 'development') {
    if (data) {
      console.log(message, maskSensitiveData(data));
    } else {
      console.log(message);
    }
  }
} 