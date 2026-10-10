// Babel config for Expo SDK 57 (Reanimated 4 runs through react-native-worklets).
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // The worklets plugin must be last.
    plugins: ['react-native-worklets/plugin'],
  };
};
