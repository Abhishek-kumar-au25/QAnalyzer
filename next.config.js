/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Suppress require.extensions warning from handlebars
    config.ignoreWarnings = [
      {
        message: /require\.extensions is not supported by webpack/,
      },
    ];
    return config;
  },
};

module.exports = nextConfig;
