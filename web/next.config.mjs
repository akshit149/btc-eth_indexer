/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://query-api:8080/:path*', // Proxy to Docker service
            },
        ];
    },
};

export default nextConfig;
