param(
    [Parameter(Mandatory = $true)]
    [string]$RunRoot,

    [Parameter(Mandatory = $true)]
    [string]$OldRoot,

    [Parameter(Mandatory = $true)]
    [string]$CurrentRoot,

    [Parameter(Mandatory = $true)]
    [ValidateRange(1024, 65535)]
    [int]$Port,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-f0-9]{64}$')]
    [string]$Token,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-zA-Z0-9-]{8,80}$')]
    [string]$RunId,

    [Parameter(Mandatory = $true)]
    [string]$ResultPath,

    [Parameter(Mandatory = $true)]
    [string]$ServerLogPath,

    [Parameter(Mandatory = $true)]
    [string]$ProgressPath
)

$ErrorActionPreference = 'Stop'
$script:ActiveMode = 'old'
$script:StopRequested = $false
$script:AllowedProgressStages = @(
    'page_loaded', 'js_started', 'identity_valid', 'fresh_storage_verified', 'metadata_received',
    'old_sw_register_called', 'old_sw_registered', 'old_sw_ready', 'old_controller', 'old_cache_verified',
    'old_home_ready', 'fixture_created', 'switching_source', 'update_called', 'updatefound',
    'controller_changed', 'current_sw_active', 'current_cache_verified', 'storage_verified',
    'cleanup_started', 'cleanup_completed', 'result_posting', 'result_posted', 'result_post_failed'
)

function Resolve-FullPath {
    param([Parameter(Mandatory = $true)][string]$Path)
    return [System.IO.Path]::GetFullPath($Path).TrimEnd('\')
}

function Assert-TestPathBoundary {
    param(
        [Parameter(Mandatory = $true)][string]$Candidate,
        [Parameter(Mandatory = $true)][string]$ExpectedParent,
        [Parameter(Mandatory = $true)][string]$Label
    )

    $candidateFull = Resolve-FullPath $Candidate
    $parentFull = Resolve-FullPath $ExpectedParent
    $prefix = $parentFull + '\'
    if (-not $candidateFull.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "$Label is outside the dedicated run root: $candidateFull"
    }
    return $candidateFull
}

function Write-TestLog {
    param([Parameter(Mandatory = $true)][string]$Message)
    $line = '{0:o} {1}' -f [DateTimeOffset]::Now, $Message
    [System.IO.File]::AppendAllText($script:SafeServerLogPath, $line + [Environment]::NewLine)
}

function Write-ProgressEntry {
    param(
        [Parameter(Mandatory = $true)][string]$Stage,
        [Parameter(Mandatory = $true)][string]$Timestamp,
        [AllowNull()]$Detail
    )
    $entry = [ordered]@{
        stage = $Stage
        timestamp = $Timestamp
        receivedAt = [DateTimeOffset]::Now.ToString('o')
        detail = $Detail
    }
    $json = $entry | ConvertTo-Json -Depth 20 -Compress
    [System.IO.File]::AppendAllText(
        $script:SafeProgressPath,
        $json + [Environment]::NewLine,
        (New-Object Text.UTF8Encoding($false))
    )
}

function Get-Sha256 {
    param([Parameter(Mandatory = $true)][string]$Path)
    $stream = [System.IO.File]::OpenRead($Path)
    try {
        $sha = [System.Security.Cryptography.SHA256]::Create()
        try {
            return ([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-', '').ToLowerInvariant()
        }
        finally {
            $sha.Dispose()
        }
    }
    finally {
        $stream.Dispose()
    }
}

function Read-HttpRequest {
    param([Parameter(Mandatory = $true)][System.Net.Sockets.NetworkStream]$Stream)

    $headerBytes = New-Object System.Collections.Generic.List[byte]
    $tail = New-Object System.Collections.Generic.Queue[byte]
    while ($true) {
        $value = $Stream.ReadByte()
        if ($value -lt 0) { throw 'Client disconnected before request headers completed.' }
        $headerBytes.Add([byte]$value)
        $tail.Enqueue([byte]$value)
        if ($tail.Count -gt 4) { [void]$tail.Dequeue() }
        if ($headerBytes.Count -gt 65536) { throw 'Request headers exceed the 64 KiB safety limit.' }
        if ($tail.Count -eq 4) {
            $last = $tail.ToArray()
            if ($last[0] -eq 13 -and $last[1] -eq 10 -and $last[2] -eq 13 -and $last[3] -eq 10) { break }
        }
    }

    $headerText = [Text.Encoding]::ASCII.GetString($headerBytes.ToArray())
    $lines = $headerText -split "`r`n"
    $requestLine = $lines[0] -split ' '
    if ($requestLine.Count -lt 2) { throw 'Malformed HTTP request line.' }

    $headers = @{}
    foreach ($line in $lines[1..($lines.Count - 1)]) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        $colon = $line.IndexOf(':')
        if ($colon -le 0) { continue }
        $headers[$line.Substring(0, $colon).Trim().ToLowerInvariant()] = $line.Substring($colon + 1).Trim()
    }

    $contentLength = 0
    if ($headers.ContainsKey('content-length')) {
        if (-not [int]::TryParse($headers['content-length'], [ref]$contentLength) -or $contentLength -lt 0 -or $contentLength -gt 8388608) {
            throw 'Invalid or excessive Content-Length.'
        }
    }

    $body = New-Object byte[] $contentLength
    $offset = 0
    while ($offset -lt $contentLength) {
        $read = $Stream.Read($body, $offset, $contentLength - $offset)
        if ($read -le 0) { throw 'Client disconnected before request body completed.' }
        $offset += $read
    }

    return [pscustomobject]@{
        Method  = $requestLine[0].ToUpperInvariant()
        Target  = $requestLine[1]
        Headers = $headers
        Body    = $body
    }
}

function Write-HttpResponse {
    param(
        [Parameter(Mandatory = $true)][System.Net.Sockets.NetworkStream]$Stream,
        [Parameter(Mandatory = $true)][int]$Status,
        [Parameter(Mandatory = $true)][string]$ContentType,
        [Parameter(Mandatory = $true)][byte[]]$Body
    )

    $reason = switch ($Status) {
        200 { 'OK' }
        204 { 'No Content' }
        400 { 'Bad Request' }
        403 { 'Forbidden' }
        404 { 'Not Found' }
        405 { 'Method Not Allowed' }
        500 { 'Internal Server Error' }
        default { 'Error' }
    }
    $headers = "HTTP/1.1 $Status $reason`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`nX-Content-Type-Options: nosniff`r`n`r`n"
    $headerData = [Text.Encoding]::ASCII.GetBytes($headers)
    $Stream.Write($headerData, 0, $headerData.Length)
    if ($Body.Length -gt 0) { $Stream.Write($Body, 0, $Body.Length) }
    $Stream.Flush()
}

function Write-JsonResponse {
    param(
        [Parameter(Mandatory = $true)][System.Net.Sockets.NetworkStream]$Stream,
        [Parameter(Mandatory = $true)][int]$Status,
        [Parameter(Mandatory = $true)]$Value
    )
    $json = $Value | ConvertTo-Json -Depth 30 -Compress
    Write-HttpResponse -Stream $Stream -Status $Status -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json))
}

function Test-ControlAuthorization {
    param(
        [Parameter(Mandatory = $true)]$Request,
        [Parameter(Mandatory = $true)][System.Net.IPEndPoint]$RemoteEndPoint
    )
    $isLoopback = [System.Net.IPAddress]::IsLoopback($RemoteEndPoint.Address)
    $hasToken = $Request.Headers.ContainsKey('x-r1-sw-token') -and $Request.Headers['x-r1-sw-token'] -ceq $Token
    return $isLoopback -and $hasToken
}

function Get-MimeType {
    param([Parameter(Mandatory = $true)][string]$Path)
    switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
        '.html' { return 'text/html; charset=utf-8' }
        '.js' { return 'text/javascript; charset=utf-8' }
        '.css' { return 'text/css; charset=utf-8' }
        '.json' { return 'application/json; charset=utf-8' }
        '.webmanifest' { return 'application/manifest+json; charset=utf-8' }
        '.svg' { return 'image/svg+xml' }
        '.png' { return 'image/png' }
        '.jpg' { return 'image/jpeg' }
        '.jpeg' { return 'image/jpeg' }
        '.ico' { return 'image/x-icon' }
        '.woff2' { return 'font/woff2' }
        default { return 'application/octet-stream' }
    }
}

$safeRunRoot = Resolve-FullPath $RunRoot
$tempRoot = Resolve-FullPath ([System.IO.Path]::GetTempPath())
if (-not (Split-Path -Leaf $safeRunRoot).StartsWith('OUTBASE_R1_SW_UPDATE_', [System.StringComparison]::Ordinal)) {
    throw "RunRoot does not have the required dedicated prefix: $safeRunRoot"
}
if (-not $safeRunRoot.StartsWith($tempRoot + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "RunRoot must be a direct descendant tree of the operating-system temp directory: $safeRunRoot"
}
if (-not (Test-Path -LiteralPath $safeRunRoot -PathType Container)) { throw "RunRoot does not exist: $safeRunRoot" }

$safeOldRoot = Assert-TestPathBoundary -Candidate $OldRoot -ExpectedParent $safeRunRoot -Label 'OldRoot'
$safeCurrentRoot = Assert-TestPathBoundary -Candidate $CurrentRoot -ExpectedParent $safeRunRoot -Label 'CurrentRoot'
$safeResultPath = Assert-TestPathBoundary -Candidate $ResultPath -ExpectedParent $safeRunRoot -Label 'ResultPath'
$script:SafeServerLogPath = Assert-TestPathBoundary -Candidate $ServerLogPath -ExpectedParent $safeRunRoot -Label 'ServerLogPath'
$script:SafeProgressPath = Assert-TestPathBoundary -Candidate $ProgressPath -ExpectedParent $safeRunRoot -Label 'ProgressPath'

if (-not (Test-Path -LiteralPath $safeOldRoot -PathType Container)) { throw "OldRoot does not exist: $safeOldRoot" }
if (-not (Test-Path -LiteralPath $safeCurrentRoot -PathType Container)) { throw "CurrentRoot does not exist: $safeCurrentRoot" }
foreach ($root in @($safeOldRoot, $safeCurrentRoot)) {
    foreach ($required in @('index.html', 'service-worker.js', 'tests\r1-sw-update.test.html', 'tests\r1-sw-update.test.js')) {
        if (-not (Test-Path -LiteralPath (Join-Path $root $required) -PathType Leaf)) {
            throw "Required test asset is missing: $(Join-Path $root $required)"
        }
    }
}

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
try {
    $listener.Start()
    Write-TestLog "listener-start port=$Port oldRoot=$safeOldRoot currentRoot=$safeCurrentRoot"

    while (-not $script:StopRequested) {
        $client = $listener.AcceptTcpClient()
        try {
            $client.ReceiveTimeout = 30000
            $client.SendTimeout = 30000
            $stream = $client.GetStream()
            try {
                $request = Read-HttpRequest -Stream $stream
                $targetPath = ($request.Target -split '\?', 2)[0]
                $decodedPath = [Uri]::UnescapeDataString($targetPath)
                Write-TestLog "request method=$($request.Method) path=$decodedPath mode=$script:ActiveMode remote=$($client.Client.RemoteEndPoint)"

                if ($decodedPath.StartsWith('/__r1_sw_update__/', [System.StringComparison]::Ordinal)) {
                    if ($request.Method -ne 'POST') {
                        Write-JsonResponse -Stream $stream -Status 405 -Value @{ ok = $false; error = 'POST required' }
                        continue
                    }
                    if (-not (Test-ControlAuthorization -Request $request -RemoteEndPoint $client.Client.RemoteEndPoint)) {
                        Write-JsonResponse -Stream $stream -Status 403 -Value @{ ok = $false; error = 'loopback token authorization failed' }
                        continue
                    }

                    switch ($decodedPath) {
                        '/__r1_sw_update__/metadata' {
                            Write-JsonResponse -Stream $stream -Status 200 -Value @{
                                ok = $true
                                mode = $script:ActiveMode
                                port = $Port
                                oldServiceWorkerSha256 = Get-Sha256 (Join-Path $safeOldRoot 'service-worker.js')
                                currentServiceWorkerSha256 = Get-Sha256 (Join-Path $safeCurrentRoot 'service-worker.js')
                            }
                        }
                        '/__r1_sw_update__/switch-current' {
                            $script:ActiveMode = 'current'
                            Write-TestLog 'active-root-switch old->current'
                            try {
                                $currentServiceWorkerSha256 = Get-Sha256 (Join-Path $safeCurrentRoot 'service-worker.js')
                                Write-JsonResponse -Stream $stream -Status 200 -Value @{
                                    ok = $true
                                    mode = $script:ActiveMode
                                    currentServiceWorkerSha256 = $currentServiceWorkerSha256
                                }
                            }
                            catch {
                                Write-TestLog "switch-current hash-error $($_.Exception.Message)"
                                Write-JsonResponse -Stream $stream -Status 500 -Value @{
                                    ok = $false
                                    error = 'current service worker hash calculation failed'
                                }
                            }
                        }
                        '/__r1_sw_update__/progress' {
                            $bodyText = [Text.Encoding]::UTF8.GetString($request.Body)
                            $parsed = $bodyText | ConvertFrom-Json
                            if ($parsed.token -cne $Token -or $parsed.runId -cne $RunId) {
                                Write-JsonResponse -Stream $stream -Status 403 -Value @{ ok = $false; error = 'progress body identity mismatch' }
                                continue
                            }
                            $stage = [string]$parsed.stage
                            $timestamp = [string]$parsed.timestamp
                            if ($script:AllowedProgressStages -notcontains $stage -or [string]::IsNullOrWhiteSpace($timestamp)) {
                                Write-JsonResponse -Stream $stream -Status 400 -Value @{ ok = $false; error = 'invalid progress payload' }
                                continue
                            }
                            Write-ProgressEntry -Stage $stage -Timestamp $timestamp -Detail $parsed.detail
                            Write-JsonResponse -Stream $stream -Status 200 -Value @{ ok = $true; stage = $stage }
                        }
                        '/__r1_sw_update__/result' {
                            $bodyText = [Text.Encoding]::UTF8.GetString($request.Body)
                            $parsed = $bodyText | ConvertFrom-Json
                            if ($parsed.token -cne $Token -or $parsed.runId -cne $RunId) {
                                Write-JsonResponse -Stream $stream -Status 403 -Value @{ ok = $false; error = 'result body identity mismatch' }
                                continue
                            }
                            $temporaryResult = $safeResultPath + '.pending'
                            [System.IO.File]::WriteAllText($temporaryResult, $bodyText, (New-Object Text.UTF8Encoding($false)))
                            [System.IO.File]::Move($temporaryResult, $safeResultPath)
                            Write-ProgressEntry -Stage 'result_posted' -Timestamp ([DateTimeOffset]::Now.ToString('o')) -Detail @{ source = 'server'; resultSaved = $true }
                            Write-JsonResponse -Stream $stream -Status 200 -Value @{ ok = $true }
                        }
                        '/__r1_sw_update__/shutdown' {
                            $script:StopRequested = $true
                            Write-JsonResponse -Stream $stream -Status 200 -Value @{ ok = $true; stopping = $true }
                        }
                        default {
                            Write-JsonResponse -Stream $stream -Status 404 -Value @{ ok = $false; error = 'unknown control endpoint' }
                        }
                    }
                    continue
                }

                if ($request.Method -ne 'GET' -and $request.Method -ne 'HEAD') {
                    Write-JsonResponse -Stream $stream -Status 405 -Value @{ ok = $false; error = 'GET or HEAD required' }
                    continue
                }

                $activeRoot = if ($script:ActiveMode -eq 'old') { $safeOldRoot } else { $safeCurrentRoot }
                $relativePath = $decodedPath.TrimStart('/').Replace('/', '\')
                if ([string]::IsNullOrWhiteSpace($relativePath)) {
                    $relativePath = 'index.html'
                } elseif ($relativePath.EndsWith('\')) {
                    $relativePath = Join-Path $relativePath 'index.html'
                }
                $candidate = Resolve-FullPath (Join-Path $activeRoot $relativePath)
                if (-not $candidate.StartsWith($activeRoot + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
                    Write-JsonResponse -Stream $stream -Status 403 -Value @{ ok = $false; error = 'path traversal rejected' }
                    continue
                }
                if ((Test-Path -LiteralPath $candidate -PathType Container)) { $candidate = Join-Path $candidate 'index.html' }
                if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
                    Write-JsonResponse -Stream $stream -Status 404 -Value @{ ok = $false; error = 'not found' }
                    continue
                }

                $content = if ($request.Method -eq 'HEAD') { New-Object byte[] 0 } else { [System.IO.File]::ReadAllBytes($candidate) }
                Write-HttpResponse -Stream $stream -Status 200 -ContentType (Get-MimeType $candidate) -Body $content
            }
            finally {
                $stream.Dispose()
            }
        }
        catch {
            Write-TestLog "request-error $($_.Exception.Message)"
            try {
                if ($client.Connected) {
                    Write-JsonResponse -Stream $client.GetStream() -Status 500 -Value @{ ok = $false; error = 'server request failed' }
                }
            }
            catch { }
        }
        finally {
            $client.Dispose()
        }
    }
}
finally {
    $listener.Stop()
    Write-TestLog "listener-stop port=$Port"
}
