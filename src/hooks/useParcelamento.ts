import { useMemo } from 'react';

interface ParcelaInfo {
  numeroParcela: number;
  valorParcela: number;
  valorTotal: number;
  valorLiquido?: number;
}

export function useParcelamento(valor: number) {
  // Garantir que o valor seja arredondado para 2 casas decimais
  const valorArredondado = Number(valor.toFixed(2));
  const podeParcelar = valorArredondado >= 10;
  
  const parcelas = useMemo(() => {
    const parcelasDisponiveis: ParcelaInfo[] = [];
    
    // Taxas aplicadas no cálculo do parcelamento
    const taxaTransacao = 0.0399; // 3.99% - Taxa da operadora de cartão aplicada em todas as transações
    const taxaTransacaoFixa = 0.49; // R$ 0.49 - Taxa fixa aplicada em todas as transações
    const taxaJurosMensal = 0.0302; // 3,02% a.m. - Taxa de juros aplicada para parcelamentos
    
    /*
     * Cálculo de parcelamento:
     * 1. Para pagamento à vista (1x), não aplicamos taxa de juros, apenas a taxa de transação e taxa fixa
     * 2. Para pagamentos parcelados:
     *    a. Primeiro, aplicamos a taxa de transação e taxa fixa (valorComTaxaBase)
     *    b. Depois, aplicamos a taxa de juros compostos com base no número de parcelas
     *    c. Calculamos o valor total e dividimos pelo número de parcelas
     *    d. Ajustamos o valor total para garantir a precisão (evitar diferenças de centavos)
     */
    
    // Para pagamento à vista, usar o valor original sem taxas
    parcelasDisponiveis.push({
      numeroParcela: 1,
      valorParcela: valorArredondado,
      valorTotal: valorArredondado,
      valorLiquido: valorArredondado
    });
    
    // Define o número máximo de parcelas com base no valor
    let maxParcelas = 1;
    if (valorArredondado >= 10 && valorArredondado < 20) {
      maxParcelas = 2;
    } else if (valorArredondado >= 20 && valorArredondado < 50) {
      maxParcelas = 3;
    } else if (valorArredondado >= 50) {
      maxParcelas = 12;
    }

    if (podeParcelar && maxParcelas > 1) {
      // Calcula parcelas com juros compostos
      for (let i = 2; i <= maxParcelas; i++) {
        // Aplicar taxa de transação + taxa fixa
        const valorComTaxaBase = valorArredondado + (valorArredondado * taxaTransacao) + taxaTransacaoFixa;
        // Aplicar juros compostos
        const valorComJuros = valorComTaxaBase * Math.pow(1 + taxaJurosMensal, i - 1);
        // Calcular valor total
        const valorTotal = Number(valorComJuros.toFixed(2));
        // Valor da parcela (arredondado para 2 casas)
        const valorParcela = Number((valorTotal / i).toFixed(2));
        // Ajustar o valor total para que seja exatamente valorParcela * i
        const valorTotalAjustado = Number((valorParcela * i).toFixed(2));
        
        parcelasDisponiveis.push({
          numeroParcela: i,
          valorParcela,
          valorTotal: valorTotalAjustado,
          valorLiquido: valorArredondado
        });
      }
    }
    
    return parcelasDisponiveis;
  }, [valorArredondado, podeParcelar]);
  
  return {
    podeParcelar,
    parcelas
  };
} 