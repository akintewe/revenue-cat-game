/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: 'widget',
  name: 'PrysmWidgets',
  displayName: 'Prysm',
  deploymentTarget: '17.0',
  bundleIdentifier: '.widgets',
  frameworks: ['SwiftUI', 'WidgetKit'],
  colors: {
    $accent: '#FD5021',
    $widgetBackground: '#000000',
  },
  images: {
    hourglass: '../../assets/widgets/hourglass.png',
    d20: '../../assets/widgets/d20.png',
    controller: '../../assets/widgets/controller.png',
  },
  // The same App Group the app writes the snapshot into (see src/features/widgets/snapshot/types.ts).
  entitlements: {
    'com.apple.security.application-groups': ['group.com.nathanakin.revenuecatgame'],
  },
});
