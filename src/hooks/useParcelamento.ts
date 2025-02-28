import { useMemo } from 'react';

interface ParcelaInfo {
  numeroParcela: number;
  valorParcela: number;
  valorTotal: number;
  valorLiquido?: number;
}

export function useParcelamento(valor: number) {
  const podeParcelar = valor >= 10;
  
  const parcelas = useMemo(() => {
    const parcelasDisponiveis: ParcelaInfo[] = [];
    const taxaTransacao = 0.0399; // 3.99%
    const taxaTransacaoFixa = 0.49; // R$ 0.49
    const taxaJurosMensal = 0.017; // 1.70% ao mês
    
    // Sempre adiciona opção à vista
    const valorTotalAVista = valor + (valor * taxaTransacao) + taxaTransacaoFixa;
    parcelasDisponiveis.push({
      numeroParcela: 1,
      valorParcela: valorTotalAVista,
      valorTotal: valorTotalAVista,
      valorLiquido: valor
    });
    
    // Define o número máximo de parcelas com base no valor
    let maxParcelas = 1;
    if (valor >= 10 && valor < 20) {
      maxParcelas = 2;
    } else if (valor >= 20 && valor < 50) {
      maxParcelas = 3;
    } else if (valor >= 50) {
      maxParcelas = 12;
    }

    if (podeParcelar && maxParcelas > 1) {
      // Calcula parcelas com juros compostos
      for (let i = 2; i <= maxParcelas; i++) {
        // Aplica taxa de transação + juros compostos
        const valorComTaxaTransacao = valor + (valor * taxaTransacao) + taxaTransacaoFixa;
        const valorTotal = valorComTaxaTransacao * Math.pow(1 + taxaJurosMensal, i);
        const valorParcela = valorTotal / i;
        
        // Calcula valor líquido (recebido antecipado)
        const valorLiquido = valor - (valor * taxaTransacao) - taxaTransacaoFixa;
        
        parcelasDisponiveis.push({
          numeroParcela: i,
          valorParcela,
          valorTotal,
          valorLiquido
        });
      }
    }
    
    return parcelasDisponiveis;
  }, [valor, podeParcelar]);
  
  return {
    podeParcelar,
    parcelas
  };
} 