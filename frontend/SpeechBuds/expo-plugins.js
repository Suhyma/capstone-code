module.exports = config => {
    // Original modifications for Podfile properties
    const currentIos = config.ios || {};
    const modifiedConfig = {
      ...config,
      ios: {
        ...currentIos,
        podfileProperties: {
          ...currentIos.podfileProperties,
          skipFlipperConfigPreprocessing: true,
          useFrameworks: false
        }
      },
      // Add the mods section to directly modify the Podfile content
      mods: {
        ...config.mods,
        ios: {
          ...config.mods?.ios,
          podfile: async (config) => {
            // Get the current Podfile content
            const contents = config.modResults.contents;
            
            // Fix the use_react_native! configuration to remove flipper_configuration
            let modifiedContents = contents.replace(
              /use_react_native!\([^)]*flipper_configuration[^)]*\)/gs,
              'use_react_native!(:path => config[:reactNativePath])'
            );
            
            // Also remove any FlipperConfiguration references
            modifiedContents = modifiedContents.replace(
              /flipper_config = .*\n/g,
              '# Flipper disabled\n'
            );
            
            // Fix for react-native-vision-camera RCTBlockGuard issue
            if (!modifiedContents.includes('pod "React-RCTBlockGuard"')) {
              modifiedContents = modifiedContents.replace(
                'pod "React-RCTBackground"',
                'pod "React-RCTBackground"\n  pod "React-RCTBlockGuard"'
              );
            }
            
            config.modResults.contents = modifiedContents;
            return config;
          }
        }
      }
    };
    
    return modifiedConfig;
  };