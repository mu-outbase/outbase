param(
    [int]$Port = 41731,
    [string]$Root = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'
$resolvedRoot = [System.IO.Path]::GetFullPath($Root)
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()

$mimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.js'   = 'text/javascript; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.svg'  = 'image/svg+xml'
}

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        $stream = $null
        $reader = $null
        try {
            $stream = $client.GetStream()
            $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
            $requestLine = $reader.ReadLine()
            while ($reader.ReadLine()) { }
            $parts = $requestLine -split ' '
            $requestTarget = $parts[1]
            $uri = [System.Uri]::new("http://127.0.0.1$requestTarget")
            $relative = [System.Uri]::UnescapeDataString($uri.AbsolutePath.TrimStart('/'))
            if ([string]::IsNullOrWhiteSpace($relative)) {
                $relative = 'index.html'
            }
            $candidate = [System.IO.Path]::GetFullPath((Join-Path $resolvedRoot $relative))
            if (-not $candidate.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
                $body = [System.Text.Encoding]::UTF8.GetBytes('Forbidden')
                $header = [System.Text.Encoding]::ASCII.GetBytes("HTTP/1.1 403 Forbidden`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n")
                $stream.Write($header, 0, $header.Length)
                $stream.Write($body, 0, $body.Length)
                continue
            }
            if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
                $body = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
                $header = [System.Text.Encoding]::ASCII.GetBytes("HTTP/1.1 404 Not Found`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n")
                $stream.Write($header, 0, $header.Length)
                $stream.Write($body, 0, $body.Length)
                continue
            }
            $bytes = [System.IO.File]::ReadAllBytes($candidate)
            $extension = [System.IO.Path]::GetExtension($candidate).ToLowerInvariant()
            $contentType = $mimeTypes[$extension]
            if (-not $contentType) {
                $contentType = 'application/octet-stream'
            }
            $header = [System.Text.Encoding]::ASCII.GetBytes("HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n")
            $stream.Write($header, 0, $header.Length)
            $stream.Write($bytes, 0, $bytes.Length)
        }
        catch {
            if ($stream) {
                $body = [System.Text.Encoding]::UTF8.GetBytes('Internal Server Error')
                $header = [System.Text.Encoding]::ASCII.GetBytes("HTTP/1.1 500 Internal Server Error`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n")
                $stream.Write($header, 0, $header.Length)
                $stream.Write($body, 0, $body.Length)
            }
        }
        finally {
            if ($null -ne $reader) { $reader.Dispose() }
            if ($null -ne $stream) { $stream.Dispose() }
            $client.Dispose()
        }
    }
}
finally {
    $listener.Stop()
}
