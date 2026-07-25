$ErrorActionPreference = 'Stop'

$failures = [System.Collections.Generic.List[string]]::new()

function Require-Text {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Pattern,
        [Parameter(Mandatory)][string]$Message
    )
    $content = Get-Content -LiteralPath $Path -Raw
    if ($content -notmatch $Pattern) {
        $failures.Add($Message)
    }
}

function Forbid-Text {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Pattern,
        [Parameter(Mandatory)][string]$Message
    )
    $content = Get-Content -LiteralPath $Path -Raw
    if ($content -match $Pattern) {
        $failures.Add($Message)
    }
}

$directOpenFiles = @(
    'src/app.js',
    'src/outbase-import.js',
    'src/data/legacy-adapter.js'
)
foreach ($path in $directOpenFiles) {
    Forbid-Text -Path $path -Pattern 'indexedDB\.open\s*\(' -Message "$path still opens outbase_db directly"
}

Require-Text -Path 'src/storage/outbase-db-accessor.js' -Pattern "const DB_VERSION=12;" -Message 'common outbase_db owner version is not 12'
Require-Text -Path 'src/storage/outbase-db-accessor.js' -Pattern "fieldRecords.*keyPath:'id'" -Message 'fieldRecords schema ownership is missing'
Require-Text -Path 'src/storage/outbase-db-accessor.js' -Pattern "coreImportBlobs.*keyPath:'blobId'" -Message 'coreImportBlobs schema ownership is missing'
Forbid-Text -Path 'src/storage/outbase-db-accessor.js' -Pattern '\.clear\s*\(' -Message 'common accessor contains a forbidden clear operation'
Forbid-Text -Path 'src/storage/outbase-db-accessor.js' -Pattern 'deleteObjectStore|deleteIndex' -Message 'common accessor contains destructive schema operations'

Require-Text -Path 'src/data/bootstrap.js' -Pattern 'start\(\{runMigration:false\}\)' -Message 'startup does not explicitly disable shadow migration'
Require-Text -Path 'src/data/migrations.js' -Pattern "requireExplicit\?\.\('shadowMigration'" -Message 'shadow migration explicit guard is missing'

Forbid-Text -Path 'src/shell/preparation-route-v17.js' -Pattern 'setTimeout\(\(\)=>persistBaseline' -Message 'preparation view still schedules baseline persistence'
Forbid-Text -Path 'src/shell/route-unification-v22.js' -Pattern 'ensureBaseline\?\.\(id\)' -Message 'route view still schedules baseline persistence'
Require-Text -Path 'src/domain/preparation/preparation-domain.js' -Pattern "requireExplicit\?\.\('baselinePersistence'" -Message 'baseline persistence explicit guard is missing'
Forbid-Text -Path 'src/context/activity-context-v18.js' -Pattern '(?m)^\s*syncFromUrl\(\);\s*$' -Message 'activity context still writes during module startup'
Forbid-Text -Path 'src/shell/activity-route-v16.js' -Pattern "activateContext\(item,\{source:'activity-render'" -Message 'activity rendering still activates persistent context'
Forbid-Text -Path 'src/shell/execution-route-v19.js' -Pattern "activateContext\(result\.item,'execution-render'" -Message 'execution rendering still activates persistent context'
Require-Text -Path 'src/context/activity-context-v18.js' -Pattern "enabled\?\.\('legacyIdWrite'\)" -Message 'legacy FIELD03 ID writes are not behind the default-OFF flag'

Forbid-Text -Path 'src/shell/route-unification-v22.js' -Pattern "state:'organizing'.*source:'shell-route-unification-v22'" -Message 'activity-less memo can still create a synthetic organizing activity'
Require-Text -Path 'src/shell/route-unification-v22.js' -Pattern 'OUTBASE_SAFE_MEMO_V1\.save' -Message 'safe memo service is not used'
Require-Text -Path 'src/data/safe-memo.js' -Pattern "activity_id:linkedActivityId" -Message 'safe memo does not preserve nullable activity_id'

Forbid-Text -Path 'src/storage/non-destructive-export.js' -Pattern '\.clear\s*\(|deleteDatabase\s*\(' -Message 'non-destructive exporter contains a destructive database operation'
Require-Text -Path 'src/storage/non-destructive-export.js' -Pattern "restoreIncluded:false" -Message 'export manifest does not state that restore is excluded'
Require-Text -Path 'src/storage/non-destructive-export.js' -Pattern "value instanceof Blob" -Message 'Blob export handling is missing'
Require-Text -Path 'src/storage/non-destructive-export.js' -Pattern "consistencyCheck=\{passed:true" -Message 'export consistency check is missing'

$serviceWorker = Get-Content -LiteralPath 'service-worker.js' -Raw
$requiredAssets = @(
    'src/storage/persistence-guard.js',
    'src/storage/outbase-db-accessor.js',
    'src/storage/non-destructive-export.js',
    'src/data/safe-memo.js'
)
foreach ($asset in $requiredAssets) {
    if (-not (Test-Path -LiteralPath $asset)) {
        $failures.Add("required asset is missing: $asset")
    }
    if ($serviceWorker -notmatch [regex]::Escape($asset)) {
        $failures.Add("service worker does not cache required asset: $asset")
    }
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Output 'R1 storage safety static checks passed.'
