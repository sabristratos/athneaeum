const { withAndroidManifest, withInfoPlist } = require('@expo/config-plugins');

function withShareIntentAndroid(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    const mainActivity = mainApplication.activity.find(
      (activity) => activity.$['android:name'] === '.MainActivity'
    );

    if (mainActivity) {
      if (!mainActivity['intent-filter']) {
        mainActivity['intent-filter'] = [];
      }

      const shareIntentFilter = {
        action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
        category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
        data: [
          { $: { 'android:mimeType': 'text/*' } },
        ],
      };

      const viewIntentFilter = {
        action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
        category: [
          { $: { 'android:name': 'android.intent.category.DEFAULT' } },
          { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
        ],
        data: [
          { $: { 'android:scheme': 'file' } },
          { $: { 'android:scheme': 'content' } },
          { $: { 'android:mimeType': 'text/*' } },
        ],
      };

      const hasShareFilter = mainActivity['intent-filter'].some(
        (filter) =>
          filter.action?.[0]?.$?.['android:name'] === 'android.intent.action.SEND'
      );

      if (!hasShareFilter) {
        mainActivity['intent-filter'].push(shareIntentFilter);
        mainActivity['intent-filter'].push(viewIntentFilter);
      }
    }

    return config;
  });
}

function withShareIntentIOS(config) {
  return withInfoPlist(config, (config) => {
    if (!config.modResults.CFBundleDocumentTypes) {
      config.modResults.CFBundleDocumentTypes = [];
    }

    const hasCSVType = config.modResults.CFBundleDocumentTypes.some(
      (type) => type.CFBundleTypeName === 'CSV Document'
    );

    if (!hasCSVType) {
      config.modResults.CFBundleDocumentTypes.push({
        CFBundleTypeName: 'CSV Document',
        CFBundleTypeRole: 'Viewer',
        LSHandlerRank: 'Alternate',
        LSItemContentTypes: [
          'public.comma-separated-values-text',
          'public.plain-text',
          'public.text',
        ],
      });
    }

    if (!config.modResults.UTImportedTypeDeclarations) {
      config.modResults.UTImportedTypeDeclarations = [];
    }

    return config;
  });
}

module.exports = function withShareIntent(config) {
  config = withShareIntentAndroid(config);
  config = withShareIntentIOS(config);
  return config;
};
