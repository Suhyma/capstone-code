// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix resolution for idb package
config.resolver = {
  ...config.resolver,
  sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs'],
  assetExts: [...config.resolver.assetExts.filter(ext => ext !== 'svg'), 'db', 'sqlite'],
};

module.exports = config;