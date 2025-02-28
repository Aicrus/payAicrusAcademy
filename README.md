This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Integração com Asaas

Este projeto utiliza a [API do Asaas](https://api.asaas.com/v3) para processamento de pagamentos. A integração está organizada da seguinte forma:

### Estrutura da API

```
/src
  /services
    /asaas           # Serviços relacionados ao Asaas
      /customer.ts   # Gerenciamento de clientes
      /payment.ts    # Gerenciamento de pagamentos
  /config
    /asaas.ts       # Configurações da API
```

### Variáveis de Ambiente

O projeto requer as seguintes variáveis de ambiente:

```env
NEXT_PUBLIC_ASAAS_API_URL=https://api.asaas.com/v3
ASAAS_ACCESS_TOKEN=seu_token_aqui
```

> ⚠️ **Importante**: Nunca compartilhe ou comite seu token de acesso. Use variáveis de ambiente.

### Deploy na Vercel

1. Configure as variáveis de ambiente no projeto da Vercel
2. Certifique-se de que o token não está exposto no código
3. Use a API Routes do Next.js para chamadas seguras ao Asaas

### Segurança

- Todas as chamadas à API são feitas pelo servidor usando API Routes
- Dados sensíveis não são expostos no cliente
- O token de acesso é gerenciado apenas no ambiente do servidor

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
