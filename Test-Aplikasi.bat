@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js belum terpasang. Pasang Node.js versi 22.13 atau lebih baru.
  pause
  exit /b 1
)
if not exist node_modules\vite\package.json (
 if not exist web-dist\index.html (
  echo Menyiapkan dependency aplikasi web untuk pertama kali...
  call npm.cmd ci --offline=false --cache .npm-cache
  if errorlevel 1 (
    echo Pemasangan dependency gagal. Periksa koneksi internet lalu coba lagi.
    pause
    exit /b 1
  )
 )
)
if /I "%~1"=="android" (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Buka-Web.ps1" -Android
) else (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Buka-Web.ps1"
)
if errorlevel 1 pause
