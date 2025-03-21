import Image from 'next/image';

export default function WhatsAppButton() {
  const whatsappUrl = "https://api.whatsapp.com/send?phone=5547989214925&text=Ol%C3%A1!%20%F0%9F%91%8B%20Gostaria%20de%20obter%20suporte%20com%20minha%20compra.%20Poderia%20me%20ajudar?";

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-50 transition-transform duration-300 hover:scale-110 active:scale-95"
      title="Suporte via WhatsApp"
    >
      <div className="bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <Image
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/512px-WhatsApp.svg.png"
          alt="WhatsApp"
          width={50}
          height={50}
          className="w-12 h-12"
        />
      </div>
    </a>
  );
} 