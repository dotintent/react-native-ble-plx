const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const libraryRoot = path.resolve(__dirname, '..');
const exampleNodeModules = path.resolve(__dirname, 'node_modules');

// Packages that must resolve from the example app's node_modules so that there
// is only a single copy at runtime (avoids version mismatches between the
// library's devDependencies and the example app's dependencies).
const forcedModules = ['react', 'react-native'];

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [libraryRoot],
  resolver: {
    // Make sure Metro can resolve modules from the library root
    // Only resolve from the example app's node_modules — the library root
    // should NOT have its own node_modules installed (prevents duplicate
    // react-native versions causing TurboModule resolution failures).
    nodeModulesPaths: [
      exampleNodeModules,
    ],
    // Force react and react-native to always resolve from the example app's
    // node_modules. Without this, files under libraryRoot (e.g. src/) would
    // pick up the library's devDependency versions which may differ from the
    // versions the native binary was built against.
    resolveRequest: (context, moduleName, platform) => {
      if (forcedModules.includes(moduleName)) {
        return context.resolveRequest(
          { ...context, originModulePath: path.join(exampleNodeModules, 'react-native', 'dummy.js') },
          moduleName,
          platform,
        );
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
