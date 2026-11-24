param([switch]$Android)

$ErrorActionPreference='Stop'
$projectPath=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectPath
$url='http://localhost:3000'
if($Android){$url+='/?mode=android'}
$healthUrl='http://127.0.0.1:3000/api/health'
try {
    try {
        $existing=Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
        if($existing.app -eq 'buku-servis-web') {
            Start-Process $url
            Write-Host "Buku Servis sudah berjalan: $url" -ForegroundColor Green
            exit 0
        }
    } catch { }
    if([version]((& node -p "process.versions.node") | Out-String).Trim() -lt [version]'22.13.0') {
        throw 'Gunakan Node.js 22.13 atau lebih baru.'
    }
    if(Test-Path -LiteralPath 'node_modules/vite/package.json'){
        Write-Host 'Menyiapkan tampilan web...' -ForegroundColor Cyan
        & npm.cmd run build
        if($LASTEXITCODE -ne 0){throw 'Build gagal. Periksa pesan di atas.'}
    } elseif(Test-Path -LiteralPath 'web-dist/index.html'){
        Write-Host 'Menggunakan tampilan web siap pakai...' -ForegroundColor Cyan
    } else {
        throw 'Tampilan web belum tersedia. Jalankan npm.cmd ci lalu coba lagi.'
    }
    $runtimePath=Join-Path $projectPath '.web-runtime'
    New-Item -ItemType Directory -Force -Path $runtimePath | Out-Null
    $node=(Get-Command node.exe).Source
    $process=Start-Process -FilePath $node -ArgumentList @('--disable-warning=ExperimentalWarning','server/index.js') -WorkingDirectory $projectPath -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimePath 'server.log') -RedirectStandardError (Join-Path $runtimePath 'server-error.log')
    $process.Id | Set-Content -LiteralPath (Join-Path $runtimePath 'server.pid') -Encoding ascii
    $process.StartTime.ToUniversalTime().ToString('O') | Set-Content -LiteralPath (Join-Path $runtimePath 'server-start.txt') -Encoding ascii
    $ready=$false
    for($attempt=0;$attempt -lt 60;$attempt++){
        try { $health=Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2; if($health.app -eq 'buku-servis-web'){$ready=$true;break} } catch { }
        if($process.HasExited){throw 'Server berhenti. Periksa .web-runtime/server-error.log. Port 3000 mungkin sedang dipakai aplikasi lain.'}
        Start-Sleep -Milliseconds 500
    }
    if(-not $ready){throw 'Server belum siap. Periksa .web-runtime/server-error.log.'}
    Start-Process $url
    Write-Host "Siap digunakan di browser: $url" -ForegroundColor Green
    Write-Host 'Data tersimpan di data/buku-servis.sqlite.'
} catch {
    Write-Host "Gagal: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
