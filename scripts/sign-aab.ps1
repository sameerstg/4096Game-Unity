# Signs an already-built app bundle with the Play upload key.
#
# jarsigner asks for the keystore password itself, so it is never stored.
# The keystore path and alias come from ~/.gradle/gradle.properties.
#
#   powershell -ExecutionPolicy Bypass -File scripts\sign-aab.ps1
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$bundle = Join-Path $root 'android\app\build\outputs\bundle\release\app-release.aab'
$signed = Join-Path $root 'app-release-signed.aab'
$props = Join-Path $env:USERPROFILE '.gradle\gradle.properties'
$javaHome = if ($env:JAVA_HOME) { $env:JAVA_HOME } else { 'C:\Program Files\Android\Android Studio\jbr' }

if (-not (Test-Path $bundle)) {
    Write-Output "No bundle at $bundle."
    Write-Output "Build it first:  cd android; .\gradlew app:bundleRelease -PGAME4096_UNSIGNED_BUNDLE"
    exit 1
}

function Get-Prop($name) {
    $line = Select-String -Path $props -Pattern "^$name=(.+)$" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($line) { $line.Matches[0].Groups[1].Value.Trim() } else { $null }
}

$store = Get-Prop 'GAME4096_UPLOAD_STORE_FILE'
$aliasName = Get-Prop 'GAME4096_UPLOAD_KEY_ALIAS'
if (-not $store -or -not $aliasName) {
    Write-Output "Set GAME4096_UPLOAD_STORE_FILE and GAME4096_UPLOAD_KEY_ALIAS in $props"
    exit 1
}

Write-Output "Signing with $store (alias $aliasName)"
& "$javaHome\bin\jarsigner.exe" -keystore $store -signedjar $signed $bundle $aliasName
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Output ""
Write-Output "Signed bundle: $signed"
Write-Output "Upload that file to Google Play."
Write-Output ""
Write-Output "Check this against Play Console > App integrity > Upload key certificate:"
& "$javaHome\bin\keytool.exe" -printcert -jarfile $signed | Select-String -Pattern 'SHA1:|Owner:' | Select-Object -First 2
