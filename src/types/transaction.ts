export interface Transaction {
  id: string;
  created_at: string;
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'RECEIVED_IN_CASH';
  paymentMethod: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  amount: number;
  userId: string;
  productId: string;
  idCustomerAsaas: string;
  idPayAsaas?: string;
  metaData: {
    email: string;
    whatsapp: string;
    produto: {
      preco: number;
    };
    parcelas?: number;
  };
} 