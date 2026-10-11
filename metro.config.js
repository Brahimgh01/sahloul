// Default Expo Metro config, plus one tweak: the browser build of expo-sqlite
// loads a WebAssembly file, so `.wasm` must be a known asset extension.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

module.exports = config;
