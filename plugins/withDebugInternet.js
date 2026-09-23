const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

// The release build blocks INTERNET: the game is offline, and its Play listing
// was removed under the Device and Network Abuse policy, so it should not ask
// for network access at all. Development builds still need it to reach Metro,
// so it is declared in the debug manifest, which outranks the main manifest's
// removal (the same way the template handles SYSTEM_ALERT_WINDOW).
const PERMISSION = '<uses-permission android:name="android.permission.INTERNET"/>';

module.exports = function withDebugInternet(config) {
  return withDangerousMod(config, [
    'android',
    (modConfig) => {
      const file = path.join(
        modConfig.modRequest.platformProjectRoot,
        'app',
        'src',
        'debug',
        'AndroidManifest.xml'
      );
      if (!fs.existsSync(file)) {
        throw new Error(`withDebugInternet: ${file} not found`);
      }
      const xml = fs.readFileSync(file, 'utf8');
      if (!xml.includes('android.permission.INTERNET')) {
        const patched = xml.replace(/(<manifest[^>]*>)/, `$1\n\n    ${PERMISSION}`);
        if (patched === xml) {
          throw new Error('withDebugInternet: no <manifest> tag to patch');
        }
        fs.writeFileSync(file, patched);
      }
      return modConfig;
    },
  ]);
};
