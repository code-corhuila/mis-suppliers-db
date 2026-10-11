param([Parameter(Mandatory)][string]$InfraRoot,[Parameter(Mandatory)][string]$MongoInfraRoot)
$ErrorActionPreference='Stop'
if($PSVersionTable.PSVersion.Major -lt 7) { throw 'Se requiere PowerShell 7.' }
$infra=(Resolve-Path -LiteralPath $InfraRoot).Path
$db=Split-Path $PSScriptRoot
$previousInfra=$env:MIS_INFRA_MONGO_PATH
$env:MIS_INFRA_MONGO_PATH=(Resolve-Path -LiteralPath $MongoInfraRoot).Path.Replace('\','/')
$project='mis-prv-check-'+[guid]::NewGuid().ToString('N').Substring(0,8)
$previousPort=$env:MONGO_HOST_PORT
$env:MONGO_HOST_PORT='0'
$options=@('--env-file',(Join-Path $infra 'env/dev.env'),'-p',$project,'-f',(Join-Path $db 'deploy/compose.test.yml'))
$migration=@('--changelog-file=changelog/master.xml','--database-changelog-table-name=databasechangelog_suppliers','--database-changelog-lock-table-name=databasechangeloglock_suppliers')
try {
    docker compose @options up -d --wait --wait-timeout 120 mongo
    if($LASTEXITCODE -ne 0) { throw 'MongoDB desechable no inicio.' }
    docker compose @options run --rm mongo-init
    if($LASTEXITCODE -ne 0) { throw 'Replica set desechable no inicio.' }
    docker compose @options build suppliers-db-migrate
    if($LASTEXITCODE -ne 0) { throw 'Migrador no compilo.' }
    foreach($action in @('first','second','rollback','rebuild')) {
        if($action -eq 'rollback') { docker compose @options run --rm suppliers-db-migrate @migration rollback-count --count=3 }
        else { docker compose @options run --rm suppliers-db-migrate }
        if($LASTEXITCODE -ne 0) { throw "Fallo de migracion: $action" }
        $query = 'const c=new Mongo("mongodb://"+encodeURIComponent(process.env.MONGO_INITDB_ROOT_USERNAME)+":"+encodeURIComponent(process.env.MONGO_INITDB_ROOT_PASSWORD)+"@mongo:27017/admin?replicaSet=rs0"); const d=c.getDB("suppliers"); print(d.getCollection("databasechangelog_suppliers").countDocuments({})); print(d.getCollectionNames().includes("suppliers"));'
        $state=docker compose @options exec -T mongo mongosh --quiet --nodb --eval $query
        $expected=if($action -eq 'rollback') { '0' } else { '3' }
        $present=if($action -eq 'rollback') { 'false' } else { 'true' }
        if($LASTEXITCODE -ne 0 -or $state.Count -ne 2 -or $state[0] -ne $expected -or $state[1] -ne $present) { throw 'Historial o colecciones inesperados.' }
        if($action -ne 'rollback') {
            docker compose @options run --rm suppliers-db-check
            if($LASTEXITCODE -ne 0) { throw 'Validadores, atomicidad o permisos invalidos.' }
        }
    }
    Write-Output 'PASS: migracion Mongo inicial, reejecucion, rollback y reconstruccion en replica set aislado.'
} finally {
    # Solo se eliminan los volumenes del proyecto aleatorio de esta prueba.
    docker compose @options down -v
    if($null -eq $previousInfra) { Remove-Item Env:MIS_INFRA_MONGO_PATH -ErrorAction SilentlyContinue }
    else { $env:MIS_INFRA_MONGO_PATH=$previousInfra }
    if($null -eq $previousPort) { Remove-Item Env:MONGO_HOST_PORT -ErrorAction SilentlyContinue }
    else { $env:MONGO_HOST_PORT=$previousPort }
}
