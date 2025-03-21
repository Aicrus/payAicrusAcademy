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
    const taxaTransacao = 0.0399; // 3.99%
    const taxaTransacaoFixa = 0.49; // R$ 0.49
    const taxaJurosMensal = 0.017; // 1.70% ao mês
    
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