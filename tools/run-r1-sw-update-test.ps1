param(
    [string]$Repository = 'C:\OUTBASE_WORK\outbase',
    [string]$OldSha = 'b4e8f304639026aa116bf9e6427431f3b5867e61',
    [ValidateRange(1024, 65535)]
    [int]$Port = 41745,
    [string]$BrowserPath = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    [ValidateRange(60, 900)]
    [int]$TimeoutSeconds = 300
)

$ErrorActionPreference = 'Stop'
$exitCode = 2
$cleanupFailed = $false
$serverProcess = $null
$browserProcess = $null
$runRoot = $null
$runGuid = [Guid]::NewGuid().ToString('N')
$runId = 'OUTBASE-R1-SW-UPDATE-' + $runGuid
$runRootId = 'OUTBASE_R1_SW_UPDATE_' + $runGuid
$tokenBytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($tokenBytes)
$token = ([BitConverter]::ToString($tokenBytes)).Replace('-', '').ToLowerInvariant()
$testResult = $null
$failureMessage = $null
$initialRepositoryState = $null
$finalRepositoryState = $null
$browserStdout = $null
$browserStderr = $null
$edgeStdoutSummary = $null
$edgeStderrSummary = $null
$launcherExitCode = 'not-observed'
$dedicatedEdgeProcessCountAtFailure = $null
$progressPath = $null
$serverLog = $null
$lastProgressStage = $null
$progressCount = 0
$progressSummary = @()
$browserResultPresent = $false
$serverLogSummary = $null
$script:NativeGitWarnings = New-Object System.Collections.Generic.List[object]

function Get-FullPath {
    param([Parameter(Mandatory = $true)][string]$Path)
    return [System.IO.Path]::GetFullPath($Path).TrimEnd('\')
}

function Get-TextSha256 {
    param([AllowEmptyString()][string]$Text)
    $bytes = [Text.Encoding]::UTF8.GetBytes($Text)
    $sha = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant() }
    finally { $sha.Dispose() }
}

function ConvertTo-NativeArgument {
    param([Parameter(Mandatory = $true)][AllowEmptyString()][string]$Value)
    if ($Value -notmatch '[\s"]') { return $Value }
    $escaped = [regex]::Replace($Value, '(\\*)"', '$1$1\"')
    $escaped = [regex]::Replace($escaped, '(\\+)$', '$1$1')
    return '"' + $escaped + '"'
}

function Invoke-NativeGit {
    param(
        [Parameter(Mandatory = $true)][string]$Root,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    $gitCommand = Get-Command git.exe -ErrorAction Stop | Select-Object -First 1
    $allArguments = @('-C', $Root) + $Arguments
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $gitCommand.Source
    $startInfo.Arguments = (($allArguments | ForEach-Object { ConvertTo-NativeArgument ([string]$_) }) -join ' ')
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    try {
        [void]$process.Start()
        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()
        $process.WaitForExit()
        $stdout = $stdoutTask.GetAwaiter().GetResult()
        $stderr = $stderrTask.GetAwaiter().GetResult()
        $result = [pscustomobject]@{
            ExitCode = [int]$process.ExitCode
            StdOut = [string]$stdout
            StdErr = [string]$stderr
            Arguments = @($Arguments)
        }
        if ($result.ExitCode -eq 0 -and -not [string]::IsNullOrWhiteSpace($result.StdErr)) {
            $script:NativeGitWarnings.Add([pscustomobject]@{
                arguments = @($Arguments)
                warning = $result.StdErr.Trim()
            })
        }
        return $result
    }
    finally {
        $process.Dispose()
    }
}

function Assert-NativeGitSuccess {
    param(
        [Parameter(Mandatory = $true)]$Result,
        [Parameter(Mandatory = $true)][string]$Operation
    )
    if ($Result.ExitCode -ne 0) {
        $details = @($Result.StdErr.Trim(), $Result.StdOut.Trim()) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
        throw "$Operation failed with git exit code $($Result.ExitCode): $($details -join ' | ')"
    }
}

function Get-RepositoryState {
    param([Parameter(Mandatory = $true)][string]$Root)
    $branchResult = Invoke-NativeGit -Root $Root -Arguments @('branch', '--show-current')
    Assert-NativeGitSuccess -Result $branchResult -Operation 'Read repository branch'
    $branch = $branchResult.StdOut.Trim()
    $headResult = Invoke-NativeGit -Root $Root -Arguments @('rev-parse', 'HEAD')
    Assert-NativeGitSuccess -Result $headResult -Operation 'Read repository HEAD'
    $head = $headResult.StdOut.Trim()
    $statusResult = Invoke-NativeGit -Root $Root -Arguments @('status', '--short')
    Assert-NativeGitSuccess -Result $statusResult -Operation 'Read repository status'
    $statusOutput = $statusResult.StdOut.TrimEnd("`r", "`n")
    $statusLines = if ([string]::IsNullOrEmpty($statusOutput)) { @() } else { @($statusOutput -split '\r?\n') }
    $statusText = $statusLines -join "`n"
    $tracked = @($statusLines | Where-Object { $_ -notmatch '^\?\?' }).Count
    $untracked = @($statusLines | Where-Object { $_ -match '^\?\?' }).Count
    $shortStatResult = Invoke-NativeGit -Root $Root -Arguments @('diff', '--shortstat')
    Assert-NativeGitSuccess -Result $shortStatResult -Operation 'Read repository diff stat'
    $shortStat = $shortStatResult.StdOut.Trim()
    $numStatResult = Invoke-NativeGit -Root $Root -Arguments @('diff', '--numstat')
    Assert-NativeGitSuccess -Result $numStatResult -Operation 'Read repository numeric diff stat'
    [long]$insertions = 0
    [long]$deletions = 0
    foreach ($line in @($numStatResult.StdOut -split '\r?\n')) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        $columns = $line -split "`t", 3
        if ($columns.Count -ge 2) {
            [long]$value = 0
            if ([long]::TryParse($columns[0], [ref]$value)) { $insertions += $value }
            if ([long]::TryParse($columns[1], [ref]$value)) { $deletions += $value }
        }
    }
    return [pscustomobject]@{
        branch = $branch
        head = $head
        status = $statusLines
        statusSha256 = Get-TextSha256 $statusText
        tracked = $tracked
        untracked = $untracked
        shortStat = $shortStat
        insertions = $insertions
        deletions = $deletions
    }
}

function ConvertTo-NormalizedRepositoryState {
    param([Parameter(Mandatory = $true)]$State)
    foreach ($required in @('branch', 'head', 'statusSha256', 'tracked', 'untracked', 'shortStat', 'insertions', 'deletions')) {
        if ($null -eq $State.PSObject.Properties[$required] -or $null -eq $State.$required) {
            throw "Repository state is missing required value: $required"
        }
    }
    return [pscustomobject]@{
        branch = [string]$State.branch
        head = [string]$State.head
        statusSha256 = [string]$State.statusSha256
        tracked = [int]$State.tracked
        untracked = [int]$State.untracked
        shortStat = [string]$State.shortStat
        insertions = [long]$State.insertions
        deletions = [long]$State.deletions
    }
}

function Test-RepositoryStateEqual {
    param($Before, $After)
    $normalizedBefore = ConvertTo-NormalizedRepositoryState -State $Before
    $normalizedAfter = ConvertTo-NormalizedRepositoryState -State $After
    return [bool](($normalizedBefore.branch -ceq $normalizedAfter.branch) -and
        ($normalizedBefore.head -ceq $normalizedAfter.head) -and
        ($normalizedBefore.statusSha256 -ceq $normalizedAfter.statusSha256) -and
        ($normalizedBefore.shortStat -ceq $normalizedAfter.shortStat) -and
        ($normalizedBefore.tracked -eq $normalizedAfter.tracked) -and
        ($normalizedBefore.untracked -eq $normalizedAfter.untracked) -and
        ($normalizedBefore.insertions -eq $normalizedAfter.insertions) -and
        ($normalizedBefore.deletions -eq $normalizedAfter.deletions))
}

function Assert-OwnedRunPath {
    param(
        [Parameter(Mandatory = $true)][string]$Candidate,
        [Parameter(Mandatory = $true)][string]$ExpectedRunId,
        [switch]$AllowDescendant
    )
    $full = Get-FullPath $Candidate
    $tempRoot = Get-FullPath ([IO.Path]::GetTempPath())
    $expectedRoot = Get-FullPath (Join-Path $tempRoot $ExpectedRunId)
    if ($AllowDescendant) {
        if (-not $full.StartsWith($expectedRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
            throw "Path is not owned by this run: $full"
        }
    }
    elseif ($full -cne $expectedRoot) {
        throw "Run root identity mismatch: $full"
    }
    if (-not (Split-Path -Leaf $expectedRoot).StartsWith('OUTBASE_R1_SW_UPDATE_', [StringComparison]::Ordinal)) {
        throw "Unsafe run-root prefix: $expectedRoot"
    }
    return $full
}

function Test-PortAvailable {
    param([Parameter(Mandatory = $true)][int]$CandidatePort)
    $probe = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback, $CandidatePort)
    try {
        $probe.Start()
        return $true
    }
    catch { return $false }
    finally {
        try { $probe.Stop() } catch { }
    }
}

function Quote-ProcessArgument {
    param([Parameter(Mandatory = $true)][string]$Value)
    return '"' + $Value.Replace('"', '\"') + '"'
}

function Invoke-TestControl {
    param(
        [Parameter(Mandatory = $true)][string]$Endpoint,
        [Parameter(Mandatory = $true)][string]$Origin,
        [Parameter(Mandatory = $true)][string]$ControlToken,
        [Parameter(Mandatory = $true)][string]$ControlRunId
    )
    $body = @{ token = $ControlToken; runId = $ControlRunId } | ConvertTo-Json -Compress
    return Invoke-RestMethod -Method Post -Uri ($Origin + $Endpoint) -Headers @{ 'X-R1-SW-Token' = $ControlToken } -Body $body -ContentType 'application/json' -TimeoutSec 10
}

function Test-OwnedServerProcess {
    param([int]$ProcessId, [string]$ExpectedRunRoot, [string]$ExpectedScript)
    if ($ProcessId -le 0) { return $false }
    $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction SilentlyContinue
    if ($null -eq $processInfo) { return $false }
    return ([string]$processInfo.CommandLine).Contains($ExpectedRunRoot) -and ([string]$processInfo.CommandLine).Contains($ExpectedScript)
}

function Test-EdgeCommandLineUsesProfile {
    param(
        [AllowNull()][string]$CommandLine,
        [Parameter(Mandatory = $true)][string]$ProfilePath
    )
    if ([string]::IsNullOrWhiteSpace($CommandLine)) { return $false }
    $safeProfile = Assert-OwnedRunPath -Candidate $ProfilePath -ExpectedRunId $runRootId -AllowDescendant
    $profilePattern = [regex]::Escape($safeProfile)
    $argumentPattern = '(?i)(?:^|\s)"?--user-data-dir=' + $profilePattern + '"?(?=\s|$)'
    return [regex]::IsMatch($CommandLine, $argumentPattern)
}

function Get-OwnedEdgeProcesses {
    param([Parameter(Mandatory = $true)][string]$ProfilePath)
    $safeProfile = Assert-OwnedRunPath -Candidate $ProfilePath -ExpectedRunId $runRootId -AllowDescendant
    return @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -match '^(msedge|msedgewebview2)\.exe$' -and
        (Test-EdgeCommandLineUsesProfile -CommandLine ([string]$_.CommandLine) -ProfilePath $safeProfile)
    })
}

function Get-ProcessExitCodeText {
    param([AllowNull()][System.Diagnostics.Process]$Process)
    if ($null -eq $Process) { return 'unavailable' }
    try {
        if (-not $Process.HasExited) { return 'running' }
        $Process.Refresh()
        $Process.WaitForExit()
        return ([int]$Process.ExitCode).ToString([Globalization.CultureInfo]::InvariantCulture)
    }
    catch {
        return 'unavailable'
    }
}

function Get-EdgeLogSummary {
    param(
        [AllowNull()][string]$Path,
        [Parameter(Mandatory = $true)][string[]]$Secrets,
        [int]$MaximumCharacters = 4096
    )
    if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path -PathType Leaf)) { return '' }
    $stream = $null
    $reader = $null
    try {
        $stream = [IO.File]::Open($Path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
        $reader = New-Object IO.StreamReader($stream, [Text.Encoding]::UTF8, $true)
        $text = $reader.ReadToEnd().Trim()
        foreach ($secret in $Secrets) {
            if (-not [string]::IsNullOrEmpty($secret)) { $text = $text.Replace($secret, '<redacted>') }
        }
        if ($text.Length -gt $MaximumCharacters) { $text = '[truncated] ' + $text.Substring($text.Length - $MaximumCharacters) }
        return $text
    }
    catch {
        return 'unavailable: ' + $_.Exception.Message
    }
    finally {
        if ($null -ne $reader) { $reader.Dispose() }
        elseif ($null -ne $stream) { $stream.Dispose() }
    }
}

function Get-ProgressObservation {
    param(
        [AllowNull()][string]$Path,
        [Parameter(Mandatory = $true)][string[]]$Secrets
    )
    if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return [pscustomobject]@{ count = 0; lastStage = $null; summary = @() }
    }
    $entries = New-Object System.Collections.Generic.List[object]
    foreach ($line in @(Get-Content -LiteralPath $Path -Encoding UTF8)) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        try {
            $safeLine = [string]$line
            foreach ($secret in $Secrets) {
                if (-not [string]::IsNullOrEmpty($secret)) { $safeLine = $safeLine.Replace($secret, '<redacted>') }
            }
            $parsed = $safeLine | ConvertFrom-Json
            $entries.Add([pscustomobject]@{
                stage = [string]$parsed.stage
                timestamp = [string]$parsed.timestamp
                receivedAt = [string]$parsed.receivedAt
                detail = $parsed.detail
            })
        }
        catch {
            $entries.Add([pscustomobject]@{ stage = 'invalid_progress_entry'; timestamp = $null; receivedAt = $null; detail = $_.Exception.Message })
        }
    }
    $items = @($entries.ToArray())
    return [pscustomobject]@{
        count = [int]$items.Count
        lastStage = if ($items.Count -gt 0) { [string]$items[-1].stage } else { $null }
        summary = $items
    }
}

function Get-ServerLogSummary {
    param(
        [AllowNull()][string]$Path,
        [Parameter(Mandatory = $true)][string[]]$Secrets,
        [int]$MaximumCharacters = 12000
    )
    if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path -PathType Leaf)) { return '' }
    $stream = $null
    $reader = $null
    try {
        $stream = [IO.File]::Open($Path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
        $reader = New-Object IO.StreamReader($stream, [Text.Encoding]::UTF8, $true)
        $lines = @($reader.ReadToEnd() -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
        $important = @($lines | Where-Object {
            $_ -match 'r1-sw-update\.test\.(html|js)|/__r1_sw_update__/(progress|result)|active-root-switch|request-error|listener-(start|stop)'
        })
        $tail = @($lines | Select-Object -Last 20)
        $text = (@($important + $tail | Select-Object -Unique) -join [Environment]::NewLine).Trim()
        foreach ($secret in $Secrets) {
            if (-not [string]::IsNullOrEmpty($secret)) { $text = $text.Replace($secret, '<redacted>') }
        }
        if ($text.Length -gt $MaximumCharacters) { $text = '[truncated] ' + $text.Substring($text.Length - $MaximumCharacters) }
        return $text
    }
    catch {
        return 'unavailable: ' + $_.Exception.Message
    }
    finally {
        if ($null -ne $reader) { $reader.Dispose() }
        elseif ($null -ne $stream) { $stream.Dispose() }
    }
}

function Stop-OwnedEdgeProcesses {
    param([Parameter(Mandatory = $true)][string]$ProfilePath)
    $safeProfile = Assert-OwnedRunPath -Candidate $ProfilePath -ExpectedRunId $runRootId -AllowDescendant
    $owned = @(Get-OwnedEdgeProcesses -ProfilePath $safeProfile)
    foreach ($processInfo in $owned) {
        $current = Get-CimInstance Win32_Process -Filter "ProcessId=$($processInfo.ProcessId)" -ErrorAction SilentlyContinue
        if ($null -ne $current -and
            $current.Name -match '^(msedge|msedgewebview2)\.exe$' -and
            (Test-EdgeCommandLineUsesProfile -CommandLine ([string]$current.CommandLine) -ProfilePath $safeProfile)) {
            & taskkill.exe /PID $current.ProcessId /T /F 2>$null | Out-Null
        }
    }
    $pollIntervalMilliseconds = 250
    $shutdownDeadline = [DateTime]::UtcNow.AddSeconds(10)
    do {
        $remaining = @(Get-OwnedEdgeProcesses -ProfilePath $safeProfile)
        if ($remaining.Count -eq 0) { return $true }
        Start-Sleep -Milliseconds $pollIntervalMilliseconds
    } while ([DateTime]::UtcNow -lt $shutdownDeadline)
    $remaining = @(Get-OwnedEdgeProcesses -ProfilePath $safeProfile)
    return $remaining.Count -eq 0
}

try {
    $repositoryRoot = Get-FullPath $Repository
    if (-not (Test-Path -LiteralPath $repositoryRoot -PathType Container)) { throw "Repository does not exist: $repositoryRoot" }
    if (-not (Test-Path -LiteralPath (Join-Path $repositoryRoot '.git'))) { throw "Not a Git repository: $repositoryRoot" }
    if ($repositoryRoot.StartsWith((Get-FullPath ([IO.Path]::GetTempPath())) + '\', [StringComparison]::OrdinalIgnoreCase)) {
        throw 'The source repository must not be inside the disposable temp run root.'
    }
    if (-not (Test-Path -LiteralPath $BrowserPath -PathType Leaf)) { throw "Dedicated Edge executable not found: $BrowserPath" }
    if ($OldSha -notmatch '^[a-f0-9]{40}$') { throw 'OldSha must be a full lowercase 40-character commit SHA.' }
    if (-not (Test-PortAvailable $Port)) { throw "Safety stop: dedicated port $Port is already in use; no alternate port was selected." }

    $initialRepositoryState = Get-RepositoryState $repositoryRoot
    $commitCheck = Invoke-NativeGit -Root $repositoryRoot -Arguments @('cat-file', '-e', ($OldSha + '^{commit}'))
    Assert-NativeGitSuccess -Result $commitCheck -Operation "Verify OldSha $OldSha"

    $runRoot = Assert-OwnedRunPath -Candidate (Join-Path ([IO.Path]::GetTempPath()) $runRootId) -ExpectedRunId $runRootId
    [void][IO.Directory]::CreateDirectory($runRoot)
    $oldRoot = Assert-OwnedRunPath -Candidate (Join-Path $runRoot 'old-source') -ExpectedRunId $runRootId -AllowDescendant
    $currentRoot = Assert-OwnedRunPath -Candidate (Join-Path $runRoot 'current-source') -ExpectedRunId $runRootId -AllowDescendant
    $profileRoot = Assert-OwnedRunPath -Candidate (Join-Path $runRoot 'edge-profile') -ExpectedRunId $runRootId -AllowDescendant
    $logRoot = Assert-OwnedRunPath -Candidate (Join-Path $runRoot 'logs') -ExpectedRunId $runRootId -AllowDescendant
    foreach ($directory in @($oldRoot, $currentRoot, $profileRoot, $logRoot)) { [void][IO.Directory]::CreateDirectory($directory) }

    $oldArchive = Assert-OwnedRunPath -Candidate (Join-Path $runRoot 'old-source.zip') -ExpectedRunId $runRootId -AllowDescendant
    $archiveResult = Invoke-NativeGit -Root $repositoryRoot -Arguments @('archive', '--format=zip', ("--output=$oldArchive"), $OldSha)
    Assert-NativeGitSuccess -Result $archiveResult -Operation 'Export fixed old source'
    if (-not (Test-Path -LiteralPath $oldArchive -PathType Leaf)) { throw 'git archive reported success but did not create the fixed old source archive.' }
    Expand-Archive -LiteralPath $oldArchive -DestinationPath $oldRoot -Force

    & robocopy.exe $repositoryRoot $currentRoot /E /COPY:DAT /DCOPY:DAT /R:1 /W:1 /XJ /XD (Join-Path $repositoryRoot '.git') | Out-Null
    $robocopyCode = $LASTEXITCODE
    if ($robocopyCode -gt 7) { throw "Current source copy failed with robocopy exit code $robocopyCode." }

    $oldTests = Join-Path $oldRoot 'tests'
    if (-not (Test-Path -LiteralPath $oldTests -PathType Container)) { [void][IO.Directory]::CreateDirectory($oldTests) }
    [IO.File]::Copy((Join-Path $repositoryRoot 'tests\r1-sw-update.test.html'), (Join-Path $oldTests 'r1-sw-update.test.html'), $true)
    [IO.File]::Copy((Join-Path $repositoryRoot 'tests\r1-sw-update.test.js'), (Join-Path $oldTests 'r1-sw-update.test.js'), $true)

    foreach ($root in @($oldRoot, $currentRoot)) {
        foreach ($required in @('index.html', 'service-worker.js', 'tests\r1-sw-update.test.html', 'tests\r1-sw-update.test.js')) {
            if (-not (Test-Path -LiteralPath (Join-Path $root $required) -PathType Leaf)) { throw "Prepared source is missing $required under $root" }
        }
    }

    $serverScript = Join-Path $repositoryRoot 'tools\serve-r1-sw-update-test.ps1'
    $resultPath = Assert-OwnedRunPath -Candidate (Join-Path $logRoot 'browser-result.json') -ExpectedRunId $runRootId -AllowDescendant
    $progressPath = Assert-OwnedRunPath -Candidate (Join-Path $logRoot 'browser-progress.jsonl') -ExpectedRunId $runRootId -AllowDescendant
    $serverLog = Assert-OwnedRunPath -Candidate (Join-Path $logRoot 'server.log') -ExpectedRunId $runRootId -AllowDescendant
    $serverStdout = Assert-OwnedRunPath -Candidate (Join-Path $logRoot 'server.stdout.log') -ExpectedRunId $runRootId -AllowDescendant
    $serverStderr = Assert-OwnedRunPath -Candidate (Join-Path $logRoot 'server.stderr.log') -ExpectedRunId $runRootId -AllowDescendant
    $serverArguments = @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Quote-ProcessArgument $serverScript),
        '-RunRoot', (Quote-ProcessArgument $runRoot),
        '-OldRoot', (Quote-ProcessArgument $oldRoot),
        '-CurrentRoot', (Quote-ProcessArgument $currentRoot),
        '-Port', [string]$Port,
        '-Token', $token,
        '-RunId', $runId,
        '-ResultPath', (Quote-ProcessArgument $resultPath),
        '-ServerLogPath', (Quote-ProcessArgument $serverLog),
        '-ProgressPath', (Quote-ProcessArgument $progressPath)
    )
    $serverProcess = Start-Process -FilePath 'powershell.exe' -ArgumentList $serverArguments -WindowStyle Hidden -PassThru -RedirectStandardOutput $serverStdout -RedirectStandardError $serverStderr

    $origin = "http://localhost:$Port"
    $metadata = $null
    $readyDeadline = [DateTime]::UtcNow.AddSeconds(20)
    while ([DateTime]::UtcNow -lt $readyDeadline) {
        if ($serverProcess.HasExited) { throw "Dedicated server exited before readiness with code $($serverProcess.ExitCode)." }
        try {
            $metadata = Invoke-TestControl -Endpoint '/__r1_sw_update__/metadata' -Origin $origin -ControlToken $token -ControlRunId $runId
            if ($metadata.ok -and $metadata.mode -eq 'old') { break }
        }
        catch { Start-Sleep -Milliseconds 250 }
    }
    if ($null -eq $metadata -or -not $metadata.ok -or $metadata.mode -ne 'old') { throw 'Dedicated server did not become ready in old-source mode.' }

    $browserStdout = Assert-OwnedRunPath -Candidate (Join-Path $logRoot 'edge.stdout.log') -ExpectedRunId $runRootId -AllowDescendant
    $browserStderr = Assert-OwnedRunPath -Candidate (Join-Path $logRoot 'edge.stderr.log') -ExpectedRunId $runRootId -AllowDescendant
    $testUrl = "$origin/tests/r1-sw-update.test.html?runId=$runId&token=$token"
    $browserArguments = @(
        '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
        '--disable-background-networking', '--disable-component-update', '--disable-sync',
        '--proxy-server=direct://', '--host-resolver-rules=MAP * 127.0.0.1, EXCLUDE localhost',
        ("--user-data-dir=$profileRoot"), '--window-size=1280,900', $testUrl
    )
    $browserArgumentLine = (($browserArguments | ForEach-Object { ConvertTo-NativeArgument ([string]$_) }) -join ' ')
    $browserProcess = Start-Process -FilePath $BrowserPath -ArgumentList $browserArgumentLine -WindowStyle Hidden -PassThru -RedirectStandardOutput $browserStdout -RedirectStandardError $browserStderr

    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    $edgeDiscoveryDeadline = [DateTime]::UtcNow.AddSeconds(5)
    $dedicatedEdgeProcessSeen = $false
    while ([DateTime]::UtcNow -lt $deadline -and -not (Test-Path -LiteralPath $resultPath -PathType Leaf)) {
        $dedicatedEdgeProcesses = @(Get-OwnedEdgeProcesses -ProfilePath $profileRoot)
        if ($dedicatedEdgeProcesses.Count -gt 0) { $dedicatedEdgeProcessSeen = $true }
        $launcherExited = $browserProcess.HasExited
        if ($launcherExited -and $launcherExitCode -eq 'not-observed') {
            $launcherExitCode = Get-ProcessExitCodeText -Process $browserProcess
        }
        $allDedicatedProcessesExited = $dedicatedEdgeProcessSeen -and $dedicatedEdgeProcesses.Count -eq 0
        $launcherExitedWithoutDedicatedProcess = $launcherExited -and -not $dedicatedEdgeProcessSeen -and [DateTime]::UtcNow -ge $edgeDiscoveryDeadline
        if (($allDedicatedProcessesExited -or $launcherExitedWithoutDedicatedProcess) -and -not (Test-Path -LiteralPath $resultPath -PathType Leaf)) {
            $dedicatedEdgeProcessCountAtFailure = [int]$dedicatedEdgeProcesses.Count
            $edgeStdoutSummary = Get-EdgeLogSummary -Path $browserStdout -Secrets @($token, $runId)
            $edgeStderrSummary = Get-EdgeLogSummary -Path $browserStderr -Secrets @($token, $runId)
            throw "Dedicated Edge process group exited before producing a result (launcher exit $launcherExitCode; dedicated processes $dedicatedEdgeProcessCountAtFailure)."
        }
        Start-Sleep -Milliseconds 500
    }
    if (-not (Test-Path -LiteralPath $resultPath -PathType Leaf)) { throw "Browser test timed out after $TimeoutSeconds seconds." }

    $resultEnvelope = Get-Content -LiteralPath $resultPath -Raw | ConvertFrom-Json
    if ($resultEnvelope.token -cne $token -or $resultEnvelope.runId -cne $runId -or $null -eq $resultEnvelope.result) {
        throw 'Browser result identity did not match this runner invocation.'
    }
    $testResult = $resultEnvelope.result
    $testResult | ConvertTo-Json -Depth 50
    if ($testResult.ok -eq $true) { $exitCode = 0 }
    else {
        $exitCode = 1
        $failureMessage = 'One or more old Service Worker update checks failed.'
    }
}
catch {
    $failureMessage = $_.Exception.Message
    if ($exitCode -eq 0) { $exitCode = 1 }
    elseif ($exitCode -ne 1) { $exitCode = 2 }
}
finally {
    if ($null -ne $runRoot) {
        try {
            $safeRunRoot = Assert-OwnedRunPath -Candidate $runRoot -ExpectedRunId $runRootId
            $profileCandidate = Join-Path $safeRunRoot 'edge-profile'
            if ($launcherExitCode -eq 'not-observed') { $launcherExitCode = Get-ProcessExitCodeText -Process $browserProcess }
            if ($null -eq $dedicatedEdgeProcessCountAtFailure -and (Test-Path -LiteralPath $profileCandidate -PathType Container)) {
                $dedicatedEdgeProcessesBeforeCleanup = @(Get-OwnedEdgeProcesses -ProfilePath $profileCandidate)
                $dedicatedEdgeProcessCountAtFailure = [int]$dedicatedEdgeProcessesBeforeCleanup.Count
            }
            if ($null -eq $edgeStdoutSummary) { $edgeStdoutSummary = Get-EdgeLogSummary -Path $browserStdout -Secrets @($token, $runId) }
            if ($null -eq $edgeStderrSummary) { $edgeStderrSummary = Get-EdgeLogSummary -Path $browserStderr -Secrets @($token, $runId) }
            $browserResultPresent = [bool](-not [string]::IsNullOrWhiteSpace($resultPath) -and (Test-Path -LiteralPath $resultPath -PathType Leaf))
            $progressObservation = Get-ProgressObservation -Path $progressPath -Secrets @($token)
            $lastProgressStage = $progressObservation.lastStage
            $progressCount = $progressObservation.count
            $progressSummary = @($progressObservation.summary)
            $serverLogSummary = Get-ServerLogSummary -Path $serverLog -Secrets @($token, $runId)
            if (Test-Path -LiteralPath $profileCandidate -PathType Container) {
                if (-not (Stop-OwnedEdgeProcesses -ProfilePath $profileCandidate)) {
                    throw 'Dedicated Edge processes remain after PID/profile-scoped termination.'
                }
            }

            $originForCleanup = "http://localhost:$Port"
            if ($null -ne $serverProcess -and -not $serverProcess.HasExited) {
                try { [void](Invoke-TestControl -Endpoint '/__r1_sw_update__/shutdown' -Origin $originForCleanup -ControlToken $token -ControlRunId $runId) }
                catch { }
                try { $serverProcess.WaitForExit(5000) | Out-Null } catch { }
                if (-not $serverProcess.HasExited) {
                    $serverScriptForCheck = Join-Path (Get-FullPath $Repository) 'tools\serve-r1-sw-update-test.ps1'
                    if (-not (Test-OwnedServerProcess -ProcessId $serverProcess.Id -ExpectedRunRoot $safeRunRoot -ExpectedScript $serverScriptForCheck)) {
                        throw 'Server PID did not match this runner; refusing to terminate it.'
                    }
                    & taskkill.exe /PID $serverProcess.Id /T /F 2>$null | Out-Null
                }
            }
            $browserResultPresent = [bool](-not [string]::IsNullOrWhiteSpace($resultPath) -and (Test-Path -LiteralPath $resultPath -PathType Leaf))
            $progressObservation = Get-ProgressObservation -Path $progressPath -Secrets @($token)
            $lastProgressStage = $progressObservation.lastStage
            $progressCount = $progressObservation.count
            $progressSummary = @($progressObservation.summary)
            $serverLogSummary = Get-ServerLogSummary -Path $serverLog -Secrets @($token, $runId)
            if (-not (Test-PortAvailable $Port)) { throw "Listener remains on dedicated port $Port after server shutdown." }

            $repositoryFull = Get-FullPath $Repository
            $snapshotsFull = Get-FullPath 'C:\OUTBASE_WORK\snapshots'
            if ($safeRunRoot -ceq $repositoryFull -or $safeRunRoot.StartsWith($repositoryFull + '\', [StringComparison]::OrdinalIgnoreCase)) {
                throw 'Refusing cleanup because RunRoot overlaps the repository.'
            }
            if ($safeRunRoot -ceq $snapshotsFull -or $safeRunRoot.StartsWith($snapshotsFull + '\', [StringComparison]::OrdinalIgnoreCase)) {
                throw 'Refusing cleanup because RunRoot overlaps snapshots.'
            }
            Remove-Item -LiteralPath $safeRunRoot -Recurse -Force
            if (Test-Path -LiteralPath $safeRunRoot) { throw 'Dedicated run root still exists after cleanup.' }
        }
        catch {
            $cleanupFailed = $true
            if ([string]::IsNullOrWhiteSpace($failureMessage)) { $failureMessage = $_.Exception.Message }
            else { $failureMessage += ' Cleanup: ' + $_.Exception.Message }
        }
    }

    if ($null -ne $initialRepositoryState) {
        try {
            $finalRepositoryState = Get-RepositoryState (Get-FullPath $Repository)
            if (-not (Test-RepositoryStateEqual -Before $initialRepositoryState -After $finalRepositoryState)) {
                $cleanupFailed = $true
                $failureMessage = ([string]$failureMessage + ' Repository state changed during the isolated test.').Trim()
            }
        }
        catch {
            $cleanupFailed = $true
            $failureMessage = ([string]$failureMessage + ' Repository final-state verification failed: ' + $_.Exception.Message).Trim()
        }
    }

    if ($cleanupFailed) { $exitCode = 3 }
}

if ($exitCode -notin @(0, 1, 2, 3)) {
    $failureMessage = ([string]$failureMessage + " Invalid internal exit code $exitCode was classified as a prerequisite failure.").Trim()
    $exitCode = 2
}
$processExitCode = [int]$exitCode
$repositoryUnchanged = $false
if ($null -ne $initialRepositoryState -and $null -ne $finalRepositoryState) {
    $repositoryUnchanged = [bool](Test-RepositoryStateEqual -Before $initialRepositoryState -After $finalRepositoryState)
}
$summary = [ordered]@{
    runId = $runId
    outcome = switch ($processExitCode) { 0 { 'pass' } 1 { 'test-failure' } 2 { 'prerequisite-or-safety-stop' } 3 { 'cleanup-incomplete' } }
    exitCode = $processExitCode
    failure = $failureMessage
    oldSha = $OldSha
    port = $Port
    origin = "http://localhost:$Port"
    repositoryUnchanged = $repositoryUnchanged
    cleanupComplete = -not $cleanupFailed
    nativeGitWarnings = $script:NativeGitWarnings.ToArray()
    edgeStdoutSummary = $edgeStdoutSummary
    edgeStderrSummary = $edgeStderrSummary
    launcherExitCode = $launcherExitCode
    dedicatedEdgeProcessCountAtFailure = $dedicatedEdgeProcessCountAtFailure
    lastProgressStage = $lastProgressStage
    progressCount = $progressCount
    progressSummary = $progressSummary
    browserResultPresent = $browserResultPresent
    serverLogSummary = $serverLogSummary
}
$summaryJson = $summary | ConvertTo-Json -Depth 10
[Console]::Out.WriteLine($summaryJson)
[Console]::Out.Flush()
[Console]::Error.Flush()
[System.Environment]::Exit($processExitCode)
