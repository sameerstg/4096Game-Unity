#!/usr/bin/env bash
# Builds the signed Google Play app bundle.
#
# Asks for the upload-key password rather than reading it from a file, so it is
# never stored on disk. The keystore path and alias come from
# GAME4096_UPLOAD_STORE_FILE / GAME4096_UPLOAD_KEY_ALIAS in
# ~/.gradle/gradle.properties (see README).
set -euo pipefail
cd "$(dirname "$0")/.."

props="$HOME/.gradle/gradle.properties"
if grep -qE '^GAME4096_UPLOAD_STORE_PASSWORD=.+' "$props" 2>/dev/null &&
   grep -qE '^GAME4096_UPLOAD_KEY_PASSWORD=.+' "$props" 2>/dev/null; then
  echo "Upload key configured; signing automatically."
else
  echo "No password in $props, asking for this build only."
  read -rsp "Upload keystore password: " password
  echo
  # PKCS12 keystores use one password for the store and the key.
  # Gradle reads ORG_GRADLE_PROJECT_* variables as project properties.
  export ORG_GRADLE_PROJECT_GAME4096_UPLOAD_STORE_PASSWORD="$password"
  export ORG_GRADLE_PROJECT_GAME4096_UPLOAD_KEY_PASSWORD="$password"
fi

# --no-clean updates android/ in place; the default would delete it and throw
# away all the compiled native code.
npx expo prebuild --platform android --no-install --no-clean
# All four architectures: a bundle costs users nothing for the extra ones,
# because Play sends each device only the code it needs, and x86 keeps
# Chromebooks and emulators supported. Cap the parallel tasks though:
# compiling four at once can exhaust a 16 GB machine.
(cd android && ./gradlew app:bundleRelease --max-workers=2)

aab="android/app/build/outputs/bundle/release/app-release.aab"
keytool="${JAVA_HOME:-/c/Program Files/Android/Android Studio/jbr}/bin/keytool"

echo
echo "Built $aab"
echo "Compare this with Play Console > App integrity > Upload key certificate:"
"$keytool" -printcert -jarfile "$aab" | grep -E "SHA1:"
