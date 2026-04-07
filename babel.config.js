module.exports = function(api) {
  api.cache(true);
  return {
    // `babel-preset-expo` debe existir en devDependencies.
    // Si se elimina, Metro falla con "Cannot find module 'babel-preset-expo'".
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
