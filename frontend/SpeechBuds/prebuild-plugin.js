// prebuild-plugin.js
module.exports = function withDisabledFlipper(config) {
    // Set environment variables to disable Flipper
    process.env.NO_FLIPPER = '1';
    process.env.RCT_NO_FLIPPER = '1';
    process.env.USE_FLIPPER = '0';
    
    // Return the modified config
    return {
      ...config,
      ios: {
        ...config.ios,
        // Additional iOS config if needed
      }
    };
  };