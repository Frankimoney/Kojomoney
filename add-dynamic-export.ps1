# Script to add 'export const dynamic = "force-dynamic"' to all API route files

$apiDir = "src\app\api"
$routeFiles = Get-ChildItem -Path $apiDir -Filter "route.ts" -Recurse

foreach ($file in $routeFiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Check if it already has the export
    if ($content -notmatch "export const dynamic") {
        # Find the position after imports
        if ($content -match "(?s)(import.*?from.*?\n)(\n)") {
            # Add the export after the last import
            $newContent = $content -replace "(?s)(import.*?from.*?\n)(\n)", "`$1`n export const dynamic = 'force-dynamic'`n`n"
            Set-Content -Path $file.FullName -Value $newContent -NoNewline
            Write-Host "Added dynamic export to: $($file.FullName)"
        }
    } else {
        Write-Host "Skipped (already has export): $($file.FullName)"
    }
}

Write-Host "`nDone!"
