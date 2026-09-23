#!/usr/bin/env bash
# Signs an already-built app bundle with the Play upload key.
#
# jarsigner asks for the keystore password itself, so it is never stored.
# The keystore path and alias come from ~/.gradle/gradle.properties.
#
#   bash scripts/sign-aab.sh
set -euo pipefail
cd "$(dirname "$0")/.."

bundle="android/app/build/outputs/bundle/release/app-release.aab"
signed="app-release-signed.aab"
props="$HOME/.gradle/gradle.properties"
java_home="${JAVA_HOME:-/c/Program Files/Android/Android Studio/jbr}"

if [ ! -f "$bundle" ]; then
  echo "No bundle at $bundle."
  echo "Build it first:  cd android && ./gradlew app:bundleRelease -PGAME4096_UNSIGNED_BUNDLE"
  exit 1
fi

store=$(sed -n 's/^GAME4096_UPLOAD_STORE_FILE=//p' "$props" | head -1)
alias_name=$(sed -n 's/^GAME4096_UPLOAD_KEY_ALIAS=//p' "$props" | head -1)
if [ -z "$store" ] || [ -z "$alias_name" ]; then
  echo "Set GAME4096_UPLOAD_STORE_FILE and GAME4096_UPLOAD_KEY_ALIAS in $props"
  exit 1
fi

echo "Signing with $store (alias $alias_name)"
"$java_home/bin/jarsigner" -keystore "$store" -signedjar "$signed" "$bundle" "$alias_name"

echo
echo "Signed bundle: $(pwd)/$signed"
echo "Upload that file to Google Play."
echo
echo "Check this against Play Console > App integrity > Upload key certificate:"
"$java_home/bin/keytool" -printcert -jarfile "$signed" | grep -E "SHA1:|Owner:" | head -2
