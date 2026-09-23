const { withAppBuildGradle } = require('expo/config-plugins');

// Namespaced so a key another project keeps in the shared
// ~/.gradle/gradle.properties can never be picked up by mistake.
const PROPS = [
  'GAME4096_UPLOAD_STORE_FILE',
  'GAME4096_UPLOAD_STORE_PASSWORD',
  'GAME4096_UPLOAD_KEY_ALIAS',
  'GAME4096_UPLOAD_KEY_PASSWORD',
];

// Delimited so an older block can be stripped and replaced. Returning early on
// a marker instead would freeze the generated build.gradle at whatever version
// of this plugin first patched it, and every later fix here would be a silent
// no-op for anyone running prebuild without --clean.
const BEGIN = '// game4096:signing:begin';
const END = '// game4096:signing:end';

// A property set to an empty string, or to false, must count as "off". Testing
// hasProperty() alone would let `GAME4096_UNSIGNED_BUNDLE=false` turn signing
// off, and an empty password would sail past the guard into a failed signature.
const SETUP = `${BEGIN}
def game4096Prop = { String name ->
    def value = project.findProperty(name)
    return value == null || value.toString().trim().isEmpty() ? null : value.toString().trim()
}
def uploadKeyProps = [${PROPS.map((name) => `'${name}'`).join(', ')}]
def hasUploadKey = uploadKeyProps.every { game4096Prop(it) != null }
// -PGAME4096_UNSIGNED_BUNDLE builds the bundle without signing it, to be signed
// afterwards with jarsigner. Unsigned is safe: Play refuses it outright, where a
// debug-signed bundle looks finished and is rejected only on upload.
// A bare -PGAME4096_UNSIGNED_BUNDLE (empty value) means on, as Gradle flags
// usually do, while an explicit =false means off rather than the reverse.
def unsignedRaw = project.findProperty('GAME4096_UNSIGNED_BUNDLE')
def unsignedBundle = unsignedRaw != null &&
    (unsignedRaw.toString().trim().isEmpty() || unsignedRaw.toString().trim().toBoolean())
// An app bundle only ever goes to Google Play, which rejects the debug key, so
// never let one fall back to it. APKs for testing on your own phone still can.
def buildingBundle = gradle.startParameter.taskNames.any { it.toLowerCase().endsWith('bundlerelease') }
if (buildingBundle && !hasUploadKey && !unsignedBundle) {
    def missing = uploadKeyProps.findAll { game4096Prop(it) == null }
    throw new GradleException("A Google Play app bundle must be signed with the upload key. Set \${missing.join(', ')} in ~/.gradle/gradle.properties, or pass -PGAME4096_UNSIGNED_BUNDLE to build it unsigned and sign it yourself.")
}
${END}

`;

const RELEASE_SIGNING = `
        ${BEGIN}
        release {
            if (hasUploadKey) {
                storeFile file(game4096Prop('GAME4096_UPLOAD_STORE_FILE'))
                storePassword game4096Prop('GAME4096_UPLOAD_STORE_PASSWORD')
                keyAlias game4096Prop('GAME4096_UPLOAD_KEY_ALIAS')
                keyPassword game4096Prop('GAME4096_UPLOAD_KEY_PASSWORD')
            }
        }
        ${END}`;

const SIGNING_LINE = 'signingConfig unsignedBundle ? null : (hasUploadKey ? signingConfigs.release : signingConfigs.debug)';

/** Removes a previously inserted block so the patch can be re-applied cleanly. */
function stripBlocks(contents) {
  const block = new RegExp(`[ \\t]*${BEGIN}[\\s\\S]*?${END}\\n?`, 'g');
  return contents.replace(block, '');
}

function patch(contents) {
  contents = stripBlocks(contents);
  const steps = [
    [
      // matches the pristine template line and the one a previous patch wrote
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig (?:signingConfigs\.debug|unsignedBundle \?[^\n]*)/,
      (_match, before) => `${before}${SIGNING_LINE}`,
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
