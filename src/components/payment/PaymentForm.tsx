'use client';

import { useState } from 'react';
import { Tab } from '@headlessui/react';
import { QrCodeIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import PixForm from './PixForm';
import BoletoForm from './BoletoForm';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function PaymentForm() {
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <div className="w-full">
      <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
        <Tab.List className="flex space-x-4 rounded-xl bg-[#0F2B1B]/5 p-1">
          <Tab
            className={({ selected }) =>
              classNames(
                'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                'ring-white/60 ring-offset-2 ring-offset-[#0F2B1B] focus:outline-none focus:ring-2',
                selected
                  ? 'bg-white text-[#0F2B1B] shadow'
                  : 'text-[#0F2B1B]/60 hover:bg-white/[0.12] hover:text-[#0F2B1B]'
              )
            }
          >
            <div className="flex items-center justify-center space-x-2">
              <QrCodeIcon className="h-5 w-5" />
              <span>PIX</span>
            </div>
          </Tab>
          <Tab
            className={({ selected }) =>
              classNames(
                'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                'ring-white/60 ring-offset-2 ring-offset-[#0F2B1B] focus:outline-none focus:ring-2',
                selected
                  ? 'bg-white text-[#0F2B1B] shadow'
                  : 'text-[#0F2B1B]/60 hover:bg-white/[0.12] hover:text-[#0F2B1B]'
              )
            }
          >
            <div className="flex items-center justify-center space-x-2">
              <DocumentTextIcon className="h-5 w-5" />
              <span>Boleto</span>
            </div>
          </Tab>
        </Tab.List>
        <Tab.Panels className="mt-6">
          <Tab.Panel>
            <PixForm />
          </Tab.Panel>
          <Tab.Panel>
            <BoletoForm />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
} 