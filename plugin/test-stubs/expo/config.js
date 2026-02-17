exports.getNameFromConfig = function(appJSON) {
  return { appName: appJSON?.name || 'App', webName: appJSON?.name || 'App' };
};
exports.getConfig = function(projectRoot) {
  return { exp: { name: 'App', slug: 'app', web: {}, ios: {}, android: {} } };
};
