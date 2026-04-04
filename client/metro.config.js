const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Some packages (for example socket.io-client) expose ESM through
    // package exports that can break Metro resolution in RN.
    // Fall back to classic mainFields so CJS entrypoints are used.
    unstable_enablePackageExports: false,
    resolverMainFields: ['react-native', 'browser', 'main'],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
