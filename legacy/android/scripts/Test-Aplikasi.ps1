param([string]$SdkPath = '', [int]$BootTimeoutSeconds = 900)

$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
$previewPath = Join-Path $projectPath '.preview'
$avdName = 'BukuServisPreview'
$serial = 'emulator-5580'
$apkPath = Join-Path $projectPath 'dist\Buku-Servis-Motor-1.0.0-debug.apk'

try {
    if (-not (Test-Path -LiteralPath $apkPath)) { throw "APK tidak ditemukan: $apkPath" }
    if (-not $SdkPath) {
        $candidates = @($env:ANDROID_HOME, $env:ANDROID_SDK_ROOT, (Join-Path $env:LOCALAPPDATA 'Android\Sdk'))
        $SdkPath = $candidates | Where-Object { $_ -and (Test-Path -LiteralPath (Join-Path $_ 'emulator\emulator.exe')) } | Select-Object -First 1
    }
    if (-not $SdkPath) { throw 'Android SDK belum ditemukan. Pasang Android Emulator melalui SDK Manager di Android Studio, lalu jalankan kembali.' }
    $adbPath = Join-Path $SdkPath 'platform-tools\adb.exe'
    $emulatorPath = Join-Path $SdkPath 'emulator\emulator.exe'
    if (-not (Test-Path -LiteralPath $adbPath)) { throw 'Android SDK Platform-Tools belum terpasang.' }

    $avdRoot = Join-Path $previewPath 'avd'
    $devicePath = Join-Path $avdRoot "$avdName.avd"
    $androidHome = Join-Path $previewPath 'android'
    $emulatorHome = Join-Path $previewPath 'emulator'
    foreach ($directory in @($previewPath, $avdRoot, $devicePath, $androidHome, $emulatorHome)) {
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }
    $env:ANDROID_AVD_HOME = $avdRoot
    $env:ANDROID_USER_HOME = $androidHome
    $env:ANDROID_EMULATOR_HOME = $emulatorHome

    # Keep this device's configuration and data inside the project.
    $configPath = Join-Path $devicePath 'config.ini'
    if (-not (Test-Path -LiteralPath $configPath)) {
        $imageRoot = Join-Path $SdkPath 'system-images'
        $images = @(Get-ChildItem -LiteralPath $imageRoot -Filter 'source.properties' -Recurse -ErrorAction SilentlyContinue | Where-Object {
            $_.Directory.Name -eq 'x86_64' -and
            ((Get-Content -LiteralPath $_.FullName -Raw) -match 'AndroidVersion.ApiLevel=(\d+)' -and [int]$Matches[1] -ge 29)
        } | Sort-Object { [int]($_.Directory.Parent.Parent.Name -replace '\D', '') } -Descending)
        if ($images.Count -eq 0) { throw 'System image Android x86_64 (Android 10+) belum terpasang. Tambahkan melalui Device Manager / SDK Manager Android Studio.' }
        $imagePath = $images[0].Directory.FullName.Replace('\', '/') + '/'
        $target = $images[0].Directory.Parent.Parent.Name
        $tag = $images[0].Directory.Parent.Name
        @"
AvdId=$avdName
avd.ini.displayname=Buku Servis - Preview
avd.ini.encoding=UTF-8
abi.type=x86_64
hw.cpu.arch=x86_64
hw.cpu.ncore=2
hw.ramSize=4096
hw.lcd.width=720
hw.lcd.height=1600
hw.lcd.density=320
hw.keyboard=yes
hw.mainKeys=no
hw.gpu.enabled=yes
hw.gpu.mode=swiftshader_indirect
hw.audioInput=no
hw.camera.back=none
hw.camera.front=none
hw.battery=yes
hw.initialOrientation=portrait
hw.sdCard=no
disk.dataPartition.size=6442450944
image.sysdir.1=$imagePath
tag.id=$tag
target=$target
skin.name=720x1600
showDeviceFrame=no
fastboot.forceColdBoot=no
fastboot.forceFastBoot=yes
"@ | Set-Content -LiteralPath $configPath -Encoding ascii
        @"
avd.ini.encoding=UTF-8
path=$devicePath
target=$target
"@ | Set-Content -LiteralPath (Join-Path $avdRoot "$avdName.ini") -Encoding utf8
    }

    Write-Host 'Menyiapkan HP virtual Buku Servis...' -ForegroundColor Cyan
    & $adbPath start-server
    if ($LASTEXITCODE -ne 0) { throw 'ADB gagal dimulai. Coba jalankan kembali atau buka Android Studio terlebih dahulu.' }
    $devices = & $adbPath devices
    if (-not ($devices -match "^$serial\s")) {
        # Refuse to reuse ports belonging to an unrelated process.
        foreach ($port in @(5580, 5581)) {
            $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $port)
            try { $listener.Start() } catch { throw "Port $port sedang dipakai. Tutup emulator preview sebelumnya lalu coba lagi." } finally { $listener.Stop() }
        }
        $process = Start-Process -FilePath $emulatorPath -ArgumentList @(
            '-avd', $avdName, '-port', '5580', '-no-audio', '-no-boot-anim',
            '-gpu', 'swiftshader_indirect', '-feature', '-Vulkan',
            '-skin', '720x1600', '-memory', '4096', '-cores', '2', '-no-metrics'
        ) -WindowStyle Normal -RedirectStandardOutput (Join-Path $previewPath 'emulator.log') -RedirectStandardError (Join-Path $previewPath 'emulator-error.log') -PassThru
    }

    Write-Host 'Tunggu sampai Android siap. Pembukaan pertama dapat memerlukan beberapa menit.'
    $timer = [Diagnostics.Stopwatch]::StartNew()
    $ready = $false
    $lastNotice = -10
    while ($timer.Elapsed.TotalSeconds -lt $BootTimeoutSeconds) {
        $previousErrorAction = $ErrorActionPreference
        try {
            $ErrorActionPreference = 'Continue'
            $bootOutput = & $adbPath -s $serial shell getprop sys.boot_completed 2>&1
        } finally { $ErrorActionPreference = $previousErrorAction }
        if (($bootOutput | Out-String).Trim() -eq '1') { $ready = $true; break }
        if ($process -and $process.HasExited) { throw "Emulator berhenti sebelum siap. Periksa log di $previewPath" }
        if ($timer.Elapsed.TotalSeconds - $lastNotice -ge 10) {
            Write-Host ('Android sedang menyala... {0} detik' -f [int]$timer.Elapsed.TotalSeconds)
            $lastNotice = $timer.Elapsed.TotalSeconds
        }
        Start-Sleep -Seconds 2
    }
    if (-not $ready) { throw "Android belum siap setelah $BootTimeoutSeconds detik. Biarkan jendela emulator terbuka, lalu jalankan Test-Aplikasi.bat kembali." }
    $runningAvd = & $adbPath -s $serial emu avd name
    if (@($runningAvd | ForEach-Object { $_.Trim() }) -notcontains $avdName) { throw 'Perangkat pada port preview berbeda. Pemasangan dibatalkan agar tidak mengenai perangkat lain.' }

    & $adbPath -s $serial shell wm density 320
    & $adbPath -s $serial shell settings put system accelerometer_rotation 0
    & $adbPath -s $serial shell settings put system user_rotation 0
    & $adbPath -s $serial shell wm user-rotation lock 0
    & $adbPath -s $serial shell svc bluetooth disable
    Write-Host 'Memasang Buku Servis. Data percobaan sebelumnya tetap disimpan.'
    $installOutput = & $adbPath -s $serial install -r $apkPath
    if ($LASTEXITCODE -ne 0 -or $installOutput -notcontains 'Success') { throw "Pemasangan APK gagal: $installOutput" }
    & $adbPath -s $serial shell input keyevent KEYCODE_WAKEUP
    & $adbPath -s $serial shell wm dismiss-keyguard
    & $adbPath -s $serial shell am start -W -n 'id.riyan.bukuservis/.MainActivity'
    if ($LASTEXITCODE -ne 0) { throw 'Aplikasi gagal dibuka. Periksa jendela emulator.' }
    Write-Host ''
    Write-Host 'SIAP. Coba aplikasi langsung pada jendela HP virtual.' -ForegroundColor Green
    Write-Host 'Mulai dari Tambah kendaraan, lalu Catat servis dan cari OLI di Riwayat.'
    Write-Host 'Untuk menutup, klik X pada jendela emulator. Jalankan Test-Aplikasi.bat untuk membukanya lagi.'
} catch {
    Write-Host "Gagal: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
