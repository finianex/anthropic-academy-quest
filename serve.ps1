<#
  serve.ps1 — 零安裝的本機靜態伺服器

  為什麼不用 python -m http.server 或 npx serve：這台機器沒有 Node 也沒有 Python。
  為什麼不用 System.Net.HttpListener：它走 HTTP.SYS，通常需要管理員權限或
  netsh http add urlacl 保留。TcpListener 只是在 loopback 上開一個 socket，
  不需要任何權限。

  用法：
    .\serve.ps1                 → http://localhost:8080
    .\serve.ps1 -Port 3000      → http://localhost:3000
    .\serve.ps1 -NoBrowser      → 不自動開瀏覽器

  Ctrl+C 停止。
#>
[CmdletBinding()]
param(
  [int]$Port = 8080,
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot

$Mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.htm'  = 'text/html; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'   # ES modules 必須是 JS MIME，否則瀏覽器拒絕執行
  '.mjs'  = 'text/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.svg'  = 'image/svg+xml; charset=utf-8'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.gif'  = 'image/gif'
  '.webp' = 'image/webp'
  '.ico'  = 'image/x-icon'
  '.woff' = 'font/woff'
  '.woff2'= 'font/woff2'
  '.txt'  = 'text/plain; charset=utf-8'
  '.map'  = 'application/json; charset=utf-8'
}

function Send-Response {
  param(
    [System.IO.Stream]$Stream,
    [int]$Status,
    [string]$StatusText,
    [string]$ContentType,
    [byte[]]$Body,
    [bool]$HeadOnly = $false
  )
  $len = if ($Body) { $Body.Length } else { 0 }
  $head = "HTTP/1.1 $Status $StatusText`r`n" +
          "Content-Type: $ContentType`r`n" +
          "Content-Length: $len`r`n" +
          "Cache-Control: no-store`r`n" +
          "Connection: close`r`n`r`n"
  $hb = [System.Text.Encoding]::ASCII.GetBytes($head)
  $Stream.Write($hb, 0, $hb.Length)
  if (-not $HeadOnly -and $len -gt 0) { $Stream.Write($Body, 0, $len) }
  $Stream.Flush()
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
try {
  $listener.Start()
} catch {
  Write-Host "無法在 port $Port 啟動：$($_.Exception.Message)" -ForegroundColor Red
  Write-Host "試試別的 port：  .\serve.ps1 -Port 8081" -ForegroundColor Yellow
  exit 1
}

$url = "http://localhost:$Port/"
Write-Host ""
Write-Host "  Anthropic Academy 學習地圖 — 本機伺服器" -ForegroundColor Green
Write-Host "  $url" -ForegroundColor Cyan
Write-Host "  根目錄 $Root" -ForegroundColor DarkGray
Write-Host "  Ctrl+C 停止" -ForegroundColor DarkGray
Write-Host ""

if (-not $NoBrowser) { Start-Process $url | Out-Null }

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $client.NoDelay = $true
      $stream = $client.GetStream()
      # 讀取超時：瀏覽器常開「投機性」連線但不送資料，沒有超時會讓迴圈卡死
      $stream.ReadTimeout = 5000

      # 讀 request 直到空行（只需要 request line，header 讀掉就好）
      $sb = [System.Text.StringBuilder]::new()
      $buf = [byte[]]::new(4096)
      $deadline = [datetime]::UtcNow.AddSeconds(5)
      while ($sb.ToString() -notmatch "`r`n`r`n" -and [datetime]::UtcNow -lt $deadline) {
        $n = $stream.Read($buf, 0, $buf.Length)
        if ($n -le 0) { break }
        [void]$sb.Append([System.Text.Encoding]::ASCII.GetString($buf, 0, $n))
      }
      $raw = $sb.ToString()
      if ([string]::IsNullOrWhiteSpace($raw)) { continue }

      $requestLine = ($raw -split "`r`n")[0]
      $parts = $requestLine -split ' '
      $method = $parts[0]
      $target = if ($parts.Count -gt 1) { $parts[1] } else { '/' }

      if ($method -ne 'GET' -and $method -ne 'HEAD') {
        Send-Response $stream 405 'Method Not Allowed' 'text/plain; charset=utf-8' `
          ([System.Text.Encoding]::UTF8.GetBytes('只支援 GET / HEAD'))
        continue
      }

      # 去掉 query / fragment，解碼百分號（中文檔名也能過）
      $path = ($target -split '[?#]')[0]
      $path = [System.Uri]::UnescapeDataString($path)
      if ($path -eq '/' -or $path.EndsWith('/')) { $path += 'index.html' }
      $rel = $path.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)

      $full = [System.IO.Path]::GetFullPath((Join-Path $Root $rel))
      # 防目錄穿越：解析後的絕對路徑必須還在根目錄底下
      if (-not $full.StartsWith([System.IO.Path]::GetFullPath($Root), [StringComparison]::OrdinalIgnoreCase)) {
        Send-Response $stream 403 'Forbidden' 'text/plain; charset=utf-8' `
          ([System.Text.Encoding]::UTF8.GetBytes('403'))
        continue
      }

      if (Test-Path -LiteralPath $full -PathType Container) {
        $full = Join-Path $full 'index.html'
      }

      if (Test-Path -LiteralPath $full -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
        $ct = if ($Mime.ContainsKey($ext)) { $Mime[$ext] } else { 'application/octet-stream' }
        $bytes = [System.IO.File]::ReadAllBytes($full)
        Send-Response $stream 200 'OK' $ct $bytes ($method -eq 'HEAD')
        Write-Host ("  200  {0}" -f $path) -ForegroundColor DarkGray
      } else {
        $msg = [System.Text.Encoding]::UTF8.GetBytes("404 — 找不到 $path")
        Send-Response $stream 404 'Not Found' 'text/plain; charset=utf-8' $msg ($method -eq 'HEAD')
        Write-Host ("  404  {0}" -f $path) -ForegroundColor Yellow
      }
    } catch {
      # 單一連線出錯不該讓伺服器倒
      Write-Host ("  err  {0}" -f $_.Exception.Message) -ForegroundColor DarkRed
    } finally {
      if ($client) { $client.Close() }
    }
  }
} finally {
  $listener.Stop()
  Write-Host "`n  伺服器已停止。" -ForegroundColor DarkGray
}
