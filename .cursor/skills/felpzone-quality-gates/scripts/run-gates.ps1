$ErrorActionPreference = 'Continue'

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
$projectRoot = Join-Path $repositoryRoot 'rpg-narrativo-ia'
$packageFile = Join-Path $projectRoot 'package.json'

if (-not (Test-Path -LiteralPath $packageFile -PathType Leaf)) {
    Write-Error "Projeto não encontrado em: $projectRoot"
    exit 2
}

$gates = @(
    @{ Name = 'testes'; Arguments = @('test', '--', '--run') },
    @{ Name = 'lint'; Arguments = @('run', 'lint') },
    @{ Name = 'tipos'; Arguments = @('run', 'typecheck') },
    @{ Name = 'build'; Arguments = @('run', 'build') }
)

$results = @()

Push-Location $projectRoot
try {
    foreach ($gate in $gates) {
        Write-Host "`n=== Gate: $($gate.Name) ===" -ForegroundColor Cyan
        & npm @($gate.Arguments)
        $code = $LASTEXITCODE
        $results += [PSCustomObject]@{
            Gate = $gate.Name
            ExitCode = $code
            Status = if ($code -eq 0) { 'APROVADO' } else { 'REPROVADO' }
        }
    }
}
finally {
    Pop-Location
}

Write-Host "`n=== Resumo dos gates ===" -ForegroundColor Cyan
$results | Format-Table -AutoSize

if ($results.Where({ $_.ExitCode -ne 0 }).Count -gt 0) {
    exit 1
}

exit 0
