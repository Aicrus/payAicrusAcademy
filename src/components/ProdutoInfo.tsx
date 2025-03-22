import { ShieldCheckIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { formatarMoeda } from '@/utils/formatters';

interface ProdutoInfoProps {
  valor: number;
}

export default function ProdutoInfo({ valor }: ProdutoInfoProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900">
          Acesso Por 2 anos
        </h1>
        <div className="mt-2 sm:mt-3">
          <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
            R$ {formatarMoeda(valor)}
          </div>
          <p className="text-sm sm:text-base lg:text-lg text-gray-500">
            Pagamento anual
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-base sm:text-lg lg:text-xl font-medium text-gray-900">
          Valor total
        </h2>
        <div className="mt-1 sm:mt-2 text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900">
          R$ {formatarMoeda(valor)}
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-start space-x-3">
          <ShieldCheckIcon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-gray-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg sm:text-xl lg:text-2xl font-medium text-gray-900">
              Garantia de 7 dias
            </h3>
            <p className="mt-1 text-sm sm:text-lg lg:text-xl text-gray-500">
              Experimente sem risco e descubra como essa oportunidade pode transformar sua vida de maneira positiva.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <ChatBubbleLeftRightIcon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-gray-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg sm:text-xl lg:text-2xl font-medium text-gray-900">
              Suporte premium
            </h3>
            <p className="mt-1 text-sm sm:text-lg lg:text-xl text-gray-500">
              Aproveite o suporte personalizado 1 a 1 para acelerar o aprendizado. Estamos aqui para ajudá-lo a alcançar seus objetivos com sucesso.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 