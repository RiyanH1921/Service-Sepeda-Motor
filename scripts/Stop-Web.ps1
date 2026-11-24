$ErrorActionPreference='Stop'
$projectPath=Split-Path -Parent $PSScriptRoot
$pidPath=Join-Path $projectPath '.web-runtime/server.pid'
if(-not (Test-Path -LiteralPath $pidPath)){
    Write-Host 'Server yang dijalankan launcher belum ditemukan. Jika memakai npm run dev, hentikan dengan Ctrl+C di terminal tersebut.'
    exit 0
}
$serverProcessId=[int](Get-Content -LiteralPath $pidPath)
$process=Get-Process -Id $serverProcessId -ErrorAction SilentlyContinue
if($process -and $process.ProcessName -eq 'node'){
    $stampPath=Join-Path $projectPath '.web-runtime/server-start.txt'
    if(-not (Test-Path -LiteralPath $stampPath) -or $process.StartTime.ToUniversalTime().ToString('O') -ne (Get-Content -LiteralPath $stampPath)){
        Write-Host 'Identitas proses tidak sesuai. Hentikan server melalui terminal yang menjalankannya.'
        exit 1
    }
    Stop-Process -Id $serverProcessId
    Write-Host 'Server Buku Servis dihentikan. Data tetap tersimpan.'
}
Remove-Item -LiteralPath $pidPath -ErrorAction SilentlyContinue
