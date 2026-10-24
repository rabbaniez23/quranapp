# Pasang server AI (ai_worker.py) di laptop Windows ber-GPU sebagai tugas Task Scheduler:
# menyala sendiri tiap login, tanpa jendela, dan dinyalakan ulang kalau berhenti karena error.
# Jalankan dari folder repo:  powershell -ExecutionPolicy Bypass -File deploy\pasang-ai-windows.ps1
#
# Matikan sementara (mis. mau main game):  Stop-ScheduledTask -TaskName TemanTahfidz-AI
# Nyalakan lagi:                          Start-ScheduledTask -TaskName TemanTahfidz-AI
# Hapus tugas:                            Unregister-ScheduledTask -TaskName TemanTahfidz-AI
# Log:                                    backend\ai_worker.log

$ErrorActionPreference = 'Stop'
$backend = Resolve-Path (Join-Path $PSScriptRoot '..\backend')
$pythonw = Join-Path $backend '.venv\Scripts\pythonw.exe'
if (-not (Test-Path $pythonw)) { throw "Tidak ada $pythonw. Buat venv backend dulu." }

$action = New-ScheduledTaskAction -Execute $pythonw `
    -Argument "ai_worker.py --log `"$backend\ai_worker.log`"" -WorkingDirectory $backend
# Tunggu sebentar setelah login supaya Tailscale sudah tersambung (AI_HOST = IP Tailscale)
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$trigger.Delay = 'PT30S'
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
    -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
    -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName 'TemanTahfidz-AI' -Action $action -Trigger $trigger -Settings $settings `
    -Principal $principal -Description 'Server AI cek hafalan TemanTahfidz (dipanggil hp-server lewat Tailscale)' -Force | Out-Null
Start-ScheduledTask -TaskName 'TemanTahfidz-AI'
Write-Host 'Tugas TemanTahfidz-AI terpasang dan dinyalakan.'
