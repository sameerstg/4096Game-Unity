#!/usr/bin/env bash
# Builds the signed Google Play app bundle.
#
# Asks for the upload-key password rather than reading it from a file, so it is
# never stored on disk. The keystore path and alias come from
# GAME4096_UPLOAD_STORE_FILE / GAME4096_UPLOAD_KEY_ALIAS in
# ~/.gradle/gradle.properties (see README).
set -euo pipefail
cd "$(dirname "$0")/.."

read -rsp "Upload keystore password: " password
echo

# PKCS12 keystores use one password for the store and the key.
# Gradle reads ORG_GRADLE_PROJECT_* variables as project properties.
export ORG_GRADLE_PROJECT_GAME4096_UPLOAD_STORE_PASSWORD="$password"
export ORG_GRADLE_PROJECT_GAME4096_UPLOAD_KEY_PASSWORD="$password"

# --no-clean updates android/ in place; the default would delete it and throw
# away all the compiled native code.
npx expo prebuild --platform android --no-install --no-clean
# ARM covers every Android phone; x86 only matters for emulators and a few
# Chromebooks, and the Unity build shipped 64-bit ARM alone. Leaving x86 out
# also halves the native compile, which can run a 16 GB machine out of memory,
# as can running too many build tasks at once.
(cd android && ./gradlew app:bundleRelease --max-workers=2 \
  -PreactNativeArchitectures=armeabi-v7a,arm64-v8a)

aab="android/app/build/outputs/bundle/release/app-release.aab"
keytool="${JAVA_HOME:-/c/Program Files/Android/Android Studio/jbr}/bin/keytool"

echo
echo "Built $aab"
echo "Compare this with Play Console > App integrity > Upload key certificate:"
"$keytool" -printcert -jarfile "$aab" | grep -E "SHA1:"
