module.exports = function(api) {
    api.cache(true);
    return {
      presets: ['babel-preset-expo'],
      plugins: [
         'react-native-worklets-core/plugin',
          'expo-router/babel',
       
        [
          'react-native-reanimated/plugin',
          {
            globals: ['__frameProcessor'],
          },
        ],
        
      ],
    };
  };