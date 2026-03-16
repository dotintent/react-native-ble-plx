const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const libraryRoot = path.resolve(__dirname, '..');
const exampleNodeModules = path.resolve(projectRoot, 'node_modules');

const forcedModules = ['react', 'react-native'];

const config = getDefaultConfig(projectRoot);

// Watch the parent library source for live editing
config.watchFolders = [libraryRoot];

// Only resolve from example-expo's node_modules — NOT the library root
config.resolver.nodeModulesPaths = [exampleNodeModules];

// Force react and react-native to resolve from this app's node_modules
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (forcedModules.includes(moduleName)) {
    return context.resolveRequest(
      { ...context, originModulePath: path.join(exampleNodeModules, 'react-native', 'dummy.js') },
      moduleName,
      platform,
    );
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
