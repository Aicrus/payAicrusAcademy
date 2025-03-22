import { motion } from 'framer-motion';
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface PaymentStatusProps {
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'RECEIVED_IN_CASH';
  onVerifyClick?: () => void;
  isVerifying?: boolean;
}

const statusConfig = {
  PENDING: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    text: 'Aguardando pagamento',
    icon: null
  },
  RECEIVED: {
    color: 'text-green-600',
    bgColor: 'bg-white',
    text: 'Pagamento recebido',
    icon: CheckCircleIcon
  },
  CONFIRMED: {
    color: 'text-green-600',
    bgColor: 'bg-white',
    text: 'Pagamento confirmado',
    icon: CheckCircleIcon
  },
  OVERDUE: {
    color: 'text-red-600',
    bgColor: 'bg-white',
    text: 'Pagamento vencido',
    icon: XCircleIcon
  },
  REFUNDED: {
    color: 'text-gray-600',
    bgColor: 'bg-white',
    text: 'Pagamento estornado',
    icon: XCircleIcon
  },
  RECEIVED_IN_CASH: {
    color: 'text-green-600',
    bgColor: 'bg-white',
    text: 'Pagamento recebido',
    icon: CheckCircleIcon
  }
};

const spinTransition = {
  repeat: Infinity,
  duration: 2,
  ease: "linear"
};

export default function PaymentStatus({ status, onVerifyClick, isVerifying }: PaymentStatusProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const isPaid = status === 'RECEIVED' || status === 'CONFIRMED' || status === 'RECEIVED_IN_CASH';

  // Status sempre visível
  return (
    <>
      <motion.div
        className={`${config.bgColor} rounded-lg p-3 relative overflow-hidden border border-gray-100 shadow-sm`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Fundo animado para status pendente */}
        {status === 'PENDING' && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-50 to-transparent"
            animate={{
              x: ['-100%', '100%']
            }}
            transition={{
              repeat: Infinity,
              duration: 3,
              ease: "linear"
            }}
          />
        )}

        <div className="flex items-center justify-between relative">
          <div className="flex items-center space-x-2">
            {status === 'PENDING' ? (
              <div className="relative">
                <motion.div
                  className="w-4 h-4"
                  animate={{ rotate: 360 }}
                  transition={spinTransition}
                >
                  <ArrowPathIcon className="w-4 h-4 text-gray-400" />
                </motion.div>
              </div>
            ) : (
              Icon && <Icon className={`h-4 w-4 ${config.color}`} />
            )}
            <div className="flex flex-col">
              <span className={`text-sm font-medium ${config.color}`}>
                {config.text}
              </span>
              {status === 'PENDING' && (
                <span className="text-xs text-gray-400">
                  Verificação automática em andamento
                </span>
              )}
            </div>
          </div>

          {status === 'PENDING' && onVerifyClick && (
            <button
              onClick={onVerifyClick}
              disabled={isVerifying}
              className="text-xs text-gray-500 hover:text-gray-700 focus:outline-none disabled:opacity-50 transition-colors flex items-center space-x-1"
            >
              {isVerifying ? (
                <>
                  <motion.div
                    className="w-3 h-3"
                    animate={{ rotate: 360 }}
                    transition={spinTransition}
                  >
                    <ArrowPathIcon className="w-3 h-3" />
                  </motion.div>
                  <span>Verificando</span>
                </>
              ) : (
                <>
                  <ArrowPathIcon className="w-3 h-3" />
                  <span>Verificar</span>
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>

      {/* Dialog modal para pagamento confirmado */}
      {isPaid && (
        <div className="fixed inset-0 z-50 min-h-screen">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <motion.div
              className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ 
                duration: 0.3,
                ease: [0.16, 1, 0.3, 1]
              }}
            >
              <div className="p-6 flex flex-col items-center justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: 0.1
                  }}
                >
                  <div className="rounded-full bg-green-50 p-3">
                    <CheckCircleIcon className="h-16 w-16 text-green-500" />
                  </div>
                </motion.div>

                <motion.div
                  className="mt-4 text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h3 className="text-xl font-semibold text-gray-900">
                    Pagamento confirmado!
                  </h3>
                  <p className="mt-2 text-gray-600">
                    Seu acesso será liberado em instantes.
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </>
  );
} 