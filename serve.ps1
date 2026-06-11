$root = $PSScriptRoot
$port = 8080
$prefix = "http://localhost:$port/"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()

Write-Host "Servidor en $prefix (Ctrl+C para detener)"

$mimes = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
  '.woff' = 'font/woff'
  '.woff2'= 'font/woff2'
}

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $path = [System.Uri]::UnescapeDataString($request.Url.LocalPath)
    if ($path -eq '/' -or $path -eq '') { $path = '/index.html' }

    $file = Join-Path $root ($path.TrimStart('/'))
    $file = [System.IO.Path]::GetFullPath($file)

    if (-not $file.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) {
      $response.StatusCode = 403
      $bytes = [System.Text.Encoding]::UTF8.GetBytes('403 Forbidden')
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
      $response.Close()
      continue
    }

    if (Test-Path $file -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      $contentType = $mimes[$ext]
      if (-not $contentType) { $contentType = 'application/octet-stream' }
      $response.ContentType = $contentType
      $response.StatusCode = 200
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $response.StatusCode = 404
      $bytes = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
    }

    $response.Close()
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
