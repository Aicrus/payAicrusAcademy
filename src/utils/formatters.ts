export function formatarCPF(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2})$/);
  if (!match) return cleaned;
  
  const [, g1, g2, g3, g4] = match;
  let formatted = '';
  
  if (g1) formatted += g1;
  if (g2) formatted += `.${g2}`;
  if (g3) formatted += `.${g3}`;
  if (g4) formatted += `-${g4}`;
  
  return formatted;
}

export function formatarTelefone(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{0,2})(\d{0,5})(\d{0,4})$/);
  if (!match) return cleaned;
  
  const [, ddd, parte1, parte2] = match;
  let formatted = '';
  
  if (ddd) formatted += `(${ddd}`;
  if (parte1) formatted += `) ${parte1}`;
  if (parte2) formatted += `-${parte2}`;
  
  return formatted;
}

export function formatarCEP(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{0,5})(\d{0,3})$/);
  if (!match) return cleaned;
  
  const [, g1, g2] = match;
  let formatted = '';
  
  if (g1) formatted += g1;
  if (g2) formatted += `-${g2}`;
  
  return formatted;
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
} 