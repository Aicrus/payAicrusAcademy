import Image from 'next/image';
import { ShieldCheckIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

export default function OrderSummary() {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="flex items-center justify-between mb-8">
        <Image
          src="/LogoMaratona.png"
          alt="Logo Maratona FlutterFlow"
          width={180}
          height={40}
          className="h-10 w-auto"
        />
        <span className="text-sm text-gray-500">Assinatura Premium</span>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Maratona FlutterFlow</h2>
          <p className="mt-1 text-sm text-gray-500">Acesso completo ao curso</p>
        </div>

        <div className="border-t border-b border-gray-200 py-4">
          <div className="flex flex-col">
            <div className="flex justify-between items-baseline">
              <p className="text-gray-500 line-through">R$ 1.497,00</p>
              <span className="bg-green-100 text-green-700 text-sm px-2 py-0.5 rounded">33% OFF</span>
            </div>
            <div className="flex justify-between text-base font-medium text-gray-900 mt-1">
              <p>Acesso por 1 ano</p>
              <p>R$ 997,00</p>
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-500">Pagamento anual</p>
        </div>

        <div className="flex justify-between text-base font-medium text-gray-900">
          <p>Total devido hoje</p>
          <p>R$ 997,00</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-green-700">
            <ShieldCheckIcon className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">Garantia de 7 dias</span>
          </div>
          <div className="flex items-center space-x-3 text-green-700">
            <AcademicCapIcon className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">Suporte premium</span>
          </div>
        </div>

        <div className="text-xs text-gray-500 text-center pt-4 border-t">
          ©2025 Todos os direitos reservados · Aicrus Academy
        </div>
      </div>
    </div>
  );
} 