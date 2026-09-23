const { withAppBuildGradle } = require('expo/config-plugins');

// Namespaced so a key another project keeps in the shared
// ~/.gradle/gradle.properties can never be picked up by mistake.
const PROPS = [
  'GAME4096_UPLOAD_STORE_FILE',
  'GAME4096_UPLOAD_STORE_PASSWORD',
  'GAME4096_UPLOAD_KEY_ALIAS',
  'GAME4096_UPLOAD_KEY_PASSWORD',
];

const MARKER = '// game4096: upload-key signing';

const SETUP = `${MARKER}
def uploadKeyProps = [${PROPS.map((name) => `'${name}'`).join(', ')}]
def hasUploadKey = uploadKeyProps.every { project.hasProperty(it) }
// -PGAME4096_UNSIGNED_BUNDLE builds the bundle without signing it, to be signed
// afterwards with jarsigner. Unsigned is safe: Play refuses it outright, where a
// debug-signed bundle looks finished and is rejected on upload.
def unsignedBundle = project.hasProperty('GAME4096_UNSIGNED_BUNDLE')
// An app bundle only ever goes to Google Play, which rejects the debug key, so
// never let one fall back to it. APKs for testing on your own phone still can.
def buildingBundle = gradle.startParameter.taskNames.any { it.toLowerCase().endsWith('bundlerelease') }
if (buildingBundle && !hasUploadKey && !unsignedBundle) {
    def missing = uploadKeyProps.findAll { !project.hasProperty(it) }
    throw new GradleException("A Google Play app bundle must be signed with the upload key. Add \${missing.join(', ')} to ~/.gradle/gradle.properties, or pass -PGAME4096_UNSIGNED_BUNDLE to build it unsigned and sign it yourself.")
}

`;

const RELEASE_SIGNING = `
        release {
            if (hasUploadKey) {
                storeFile file(project.property('GAME4096_UPLOAD_STORE_FILE'))
                storePassword project.property('GAME4096_UPLOAD_STORE_PASSWORD')
                keyAlias project.property('GAME4096_UPLOAD_KEY_ALIAS')
                keyPassword project.property('GAME4096_UPLOAD_KEY_PASSWORD')
            }
        }`;

function patch(contents) {
  if (contents.includes(MARKER)) {
    return contents;
  }
  // Order matters: the release build type is matched before a second
  // `release {` block exists inside signingConfigs.
  const steps = [
    [
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      (_match, before) =>
        `${before}signingConfig unsignedBundle ? null : (hasUploadKey ? signingConfigs.release : signingConfigs.debug)`,
    ],
    [/signingConfigs\s*\{/, (match) => `${match}${RELEASE_SIGNING}`],
    [/^android\s*\{/m, (match) => `${SETUP}${match}`],
  ];
  for (const [pattern, replace] of steps) {
    // A changed template must fail loudly rather than silently ship the debug key.
    if (!pattern.test(contents)) {
      throw new Error(`withReleaseSigning: ${pattern} not found in android/app/build.gradle`);
    }
    contents = contents.replace(pattern, replace);
  }
  return contents;
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language !== 'groovy') {
      throw new Error('withReleaseSigning expects a Groovy android/app/build.gradle');
    }
    modConfig.modResults.contents = patch(modConfig.modResults.contents);
    return modConfig;
  });
};
