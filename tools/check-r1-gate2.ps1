$ErrorActionPreference = 'Stop'

$baseSha = 'b4e8f304639026aa116bf9e6427431f3b5867e61'
$expectedBranch = 'codex/r1-contract-and-rollback-boundary'
$failures = [System.Collections.Generic.List[string]]::new()

function Fail([string]$message) {
    $failures.Add($message)
}

function Require-Text {
    param([string]$Path, [string]$Pattern, [string]$Message)
    if ((Get-Content -LiteralPath $Path -Raw) -notmatch $Pattern) { Fail $Message }
}

function Forbid-Text {
    param([string]$Path, [string]$Pattern, [string]$Message)
    if ((Get-Content -LiteralPath $Path -Raw) -match $Pattern) { Fail $Message }
}

$branch = (git branch --show-current).Trim()
if ($branch -ne $expectedBranch) { Fail "unexpected branch: $branch" }
if ((git merge-base HEAD main).Trim() -ne $baseSha) { Fail 'branch base differs from the locked main SHA' }

$javascriptFiles = @(rg --files src -g '*.js')
foreach ($path in $javascriptFiles) {
    if (($path -replace '\\', '/') -eq 'src/router.js') { continue }
    $content = Get-Content -LiteralPath $path -Raw
    if ($content -match '(?<![.\w])history\.(pushState|replaceState|back|go)\s*\(') {
        Fail "$path directly mutates browser history"
    }
    if ($content -match 'addEventListener\s*\(\s*[''"]popstate[''"]') {
        Fail "$path directly owns popstate"
    }
}

Require-Text 'src/router.js' 'historyApi=Object\.freeze' 'router history API is missing'
Require-Text 'src/router.js' 'subscribePop' 'router popstate subscription API is missing'
Require-Text 'src/context/activity-context-v18.js' 'let runtimeContext=null' 'single in-memory CurrentContext is missing'
Forbid-Text 'src/router.js' 'outbase_core_activity_id|outbase_primary_activity_id_v2' 'router reads legacy FIELD03 IDs directly'
Require-Text 'src/data/database.js' 'async function openExisting' 'Story DB openExisting boundary is missing'
Require-Text 'src/data/database.js' "requireExplicit\?\.\('storySchemaInit'" 'Story DB explicit initialization guard is missing'
Require-Text 'src/data/database.js' "subtype','subtype" 'Activity subtype index is missing'
Require-Text 'src/data/database.js' "parent_activity_id','parent_activity_id" 'Activity parent index is missing'
Require-Text 'src/data/repositories.js' 'async children\(parentActivityId\)' 'child Activity query is missing'
Require-Text 'src/data/repositories.js' 'validation\(\)\.assertEntity\(this\.storeName,value\)' 'repository pre-write validation is missing'
Require-Text 'src/data/repositories.js' 'await validateReferences\(this\.storeName,value' 'repository reference validation is missing'
Require-Text 'src/data/safe-memo.js' 'memo_context_mismatch' 'memo context consistency guard is missing'
Require-Text 'src/data/safe-memo.js' 'deduplicated:true' 'memo deduplication contract is missing'
Require-Text 'src/data/migrations.js' "requireExplicit\?\.\('shadowMigration'" 'migration explicit guard is missing'
Forbid-Text 'src/outbase-core.js' 'ensureMeta\(\);\s*migrateLegacy\(\)' 'legacy core migration still runs at startup'
Require-Text 'src/storage/isolated-archive-verifier.js' "const TEMP_PREFIX='outbase_r1_archive_verify_'" 'isolated archive DB prefix is missing'
Require-Text 'src/storage/isolated-archive-verifier.js' 'assertRoundTrip' 'archive field/binary roundtrip validation is missing'
Forbid-Text 'src/storage/isolated-archive-verifier.js' 'deleteDatabase\([''"]outbase_(db|story_db|calendar_db)' 'verifier can delete a production database'

$app = Get-Content -LiteralPath 'src/app.js' -Raw
$restoreStart = $app.IndexOf('async function restoreIndexedDb')
$restoreEnd = $app.IndexOf('async function restoreBackup', $restoreStart)
if ($restoreStart -lt 0 -or $restoreEnd -le $restoreStart) {
    Fail 'restore disable boundary is missing'
} else {
    $restoreBlock = $app.Substring($restoreStart, $restoreEnd - $restoreStart)
    if ($restoreBlock -match '\.clear\s*\(') { Fail 'restore path can clear a current database' }
    if ($restoreBlock -notmatch 'production_restore_disabled') { Fail 'production restore is not explicitly disabled' }
}

$entryFiles = @('index.html', 'src/main.js', 'src/config/module-manifest.js', 'service-worker.js')
foreach ($path in $entryFiles) {
    $content = Get-Content -LiteralPath $path -Raw
    if ($content -match '(?<!src/)app\.js') { Fail "$path connects dormant root app.js" }
    if ($content -match 'outbase-calendar-v2\.js|outbase_calendar_db') {
        Fail "$path connects dormant outbase_calendar_db"
    }
}

$protectedFiles = @(
    'style-home-v36.css',
    'src/services/weather-service.js',
    'src/services/weather-custom-location-fix.js',
    'src/services/weather-external-links.js',
    'calendar-formal-v44.html',
    'calendar-formal-v44.css',
    'calendar-formal-v44.js',
    'src/outbase-memo-ui.js',
    'src/outbase-review-ui.js',
    'style.css',
    'style-flow.css',
    'style-memo.css',
    'style-review.css'
)
$protectedDiff = @(git diff --name-only $baseSha -- $protectedFiles)
if ($protectedDiff.Count -gt 0) {
    Fail "protected files changed: $($protectedDiff -join ', ')"
}

$forbiddenScope = @(git diff --name-only $baseSha -- package.json package-lock.json calendar-formal-v44.html calendar-formal-v44.css calendar-formal-v44.js)
if ($forbiddenScope.Count -gt 0) {
    Fail "forbidden scope changed: $($forbiddenScope -join ', ')"
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Output 'R1 Gate2 static contract checks passed.'
