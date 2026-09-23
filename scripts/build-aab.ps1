# Builds the signed Google Play app bundle.
#
# With the upload key configured in ~/.gradle/gradle.properties this runs start
# to finish without asking anything. If the passwords aren't there it asks once
# and passes them to Gradle for that build only, never writing them to disk.
#
#   powershell -ExecutionPolicy Bypass -File scripts\build-aab.ps1
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$props = Join-Path $env:USERPROFILE '.gradle\gradle.properties'
$javaHome = if ($env:JAVA_HOME) { $env:JAVA_HOME } else { 'C:\Program Files\Android\Android Studio\jbr' }
$bundle = Join-Path $root 'android\app\build\outputs\bundle\release\app-release.aab'

function Test-Prop($name) {
    (Test-Path $props) -and
    (Select-String -Path $props -Pattern "^$name=.+" -ErrorAction SilentlyContinue)
}

$configured = (Test-Prop 'GAME4096_UPLOAD_STORE_PASSWORD') -and (Test-Prop 'GAME4096_UPLOAD_KEY_PASSWORD')
if ($configured) {
    Write-Output 'Upload key configured; signing automatically.'
} else {
    Write-Output "No password in $props, asking for this build only."
    $secure = Read-Host 'Upload keystore password' -AsSecureString
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
    # PKCS12 keystores use one password for the store and the key.
    # Gradle reads ORG_GRADLE_PROJECT_* variables as project properties.
    $env:ORG_GRADLE_PROJECT_GAME4096_UPLOAD_STORE_PASSWORD = $plain
    $env:ORG_GRADLE_PROJECT_GAME4096_UPLOAD_KEY_PASSWORD = $plain
}

Push-Location $root
try {
    # --no-clean updates android/ in place; the default deletes it and throws
    # away every compiled native library.
    & npx expo prebuild --platform android --no-install --no-clean
    if ($LASTEXITCODE -ne 0) { throw "prebuild failed ($LASTEXITCODE)" }

    Push-Location (Join-Path $root 'android')
    try {
        # All four architectures: a bundle costs users nothing for the extra
        # ones, because Play sends each device only the code it needs, and x86
        # keeps Chromebooks and emulators supported. Cap the parallel tasks
        # though: compiling four at once can exhaust a 16 GB machine.
        # Passed as an array: PowerShell mangles "a,b" and "app:task" written inline.
        $gradleArgs = @(
            'app:bundleRelease',
            '--max-workers=2'
        )
        & .\gradlew.bat @gradleArgs
        if ($LASTEXITCODE -ne 0) { throw "gradle failed ($LASTEXITCODE)" }
    } finally { Pop-Location }
} finally {
    Pop-Location
    $env:ORG_GRADLE_PROJECT_GAME4096_UPLOAD_STORE_PASSWORD = $null
    $env:ORG_GRADLE_PROJECT_GAME4096_UPLOAD_KEY_PASSWORD = $null
}

# Never announce success without checking: an unsigned or debug-signed bundle
# looks finished here and is only rejected once it reaches Play.
$cert = & "$javaHome\bin\keytool.exe" -printcert -jarfile $bundle 2>&1 | Out-String
if ($LASTEXITCODE -ne 0 -or $cert -notmatch 'SHA1:') {
    Write-Output 'FAILED: the bundle carries no signature.'
    Write-Output $cert
    exit 1
}
if ($cert -match 'CN=Android Debug') {
    Write-Output 'FAILED: the bundle is signed with the DEBUG key; Play will reject it.'
    Write-Output 'Check GAME4096_UPLOAD_* in ~/.gradle/gradle.properties.'
    exit 1
}

Write-Output ''
Write-Output "Signed bundle: $bundle"
Write-Output 'Upload that file to Google Play.'
Write-Output ''
Write-Output 'Check this against Play Console > App integrity > Upload key certificate:'
($cert -split "`n" | Select-String -Pattern 'SHA1:|Owner:' | Select-Object -First 2) -join "`n"
