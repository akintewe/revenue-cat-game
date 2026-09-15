const { withAndroidManifest } = require('@expo/config-plugins');
const packages = require('../assets/data/android-packages.json');

/**
 * Declares every package name in assets/data/android-packages.json inside a <queries>
 * block in AndroidManifest.xml. Android 11+ blocks an app from checking whether any
 * other app is installed unless it's declared upfront — this is that declaration.
 * The list comes straight from the backend's catalog (see Tunde's android-manifest-packages
 * files) so it can't drift from what /android-import actually resolves against; if it
 * ever needs to grow, ask for a regenerated file rather than hand-editing this one.
 */
function withAndroidPackageQueries(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    if (!manifest.queries) {
      manifest.queries = [{}];
    } else if (!Array.isArray(manifest.queries)) {
      manifest.queries = [manifest.queries];
    }

    const queriesBlock = manifest.queries[0];
    const existingPackages = Array.isArray(queriesBlock.package) ? queriesBlock.package : [];
    const existingNames = new Set(existingPackages.map((entry) => entry.$?.['android:name']));
    const newPackages = packages
      .filter((name) => !existingNames.has(name))
      .map((name) => ({ $: { 'android:name': name } }));

    queriesBlock.package = [...existingPackages, ...newPackages];

    return config;
  });
}

module.exports = withAndroidPackageQueries;
