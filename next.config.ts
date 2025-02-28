/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['azehnvauhzzvoflkxskp.supabase.co'],
  },
  eslint: {
    ignoreDuringBuilds: true, // Temporariamente ignorar erros do ESLint durante o build
  },
};

export default nextConfig;
