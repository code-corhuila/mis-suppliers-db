# mis-suppliers-db

> suppliers bounded context: database (schema, seeds, migrations)

Part of the **Medicine Inventory System** distributed system — team `medicine-inventory-system`, Grupo 1.
Governance and documentation live in [`mis-docs`](https://github.com/code-corhuila/mis-docs).

## Branching

Three permanent branches. **None of them accepts a direct commit** — you enter through a child
branch and leave through a Pull Request.

```
develop  <--PR--  feat/... fix/... chore/...
qa       <--PR--  qa/...
main     <--PR--  release/...  hotfix/...
```

Promotion happens **by re-application** (`git cherry-pick -x`), never by merging one permanent
branch into another: `merge develop -> qa` and `merge qa -> main` do not exist in this model.

`main` requires **1 approval from `ariel5253`**. On `develop` and `qa` the team sets its own review
rule.

Full policy: `00-governance/branching-policy.md` in `mis-docs`.

## Migraciones de Proveedores y recepciones

Publicacion oficial del codigo local: tres changesets, sin cambiar XML aplicados.
Liquibase 4.31.1 y extension MongoDB 4.31.1; replica set rs0 y base suppliers en el
motor de mis-infra-mongo. Historial propio databasechangelog_suppliers y
databasechangeloglock_suppliers. No inicia otro motor ni contiene secretos.

Modelo/permisos/limites: [ADR-PRV-DB-001](docs/ADR-PRV-DB-001.md).
La composicion del migrador se incluye desde infraestructura: espera Mongo healthy.
suppliers-db-check es un servicio opcional para pruebas; no es una API publica.

### Prueba nativa local

PowerShell 7, Docker e infraestructura con env/dev.env y keyfile ya configurados:

```powershell
pwsh -NoProfile -File ./tests/Test-Migrations.ps1 -InfraRoot 'D:\descargas\pago 2\mis-infra-postgres' -MongoInfraRoot 'D:\descargas\pago 2\mis-infra-mongo'
```

Inicializa replica set propio, aplica dos veces, revierte tres changesets y
reconstruye; comprueba validadores, indices y abortos atomicos con usuario de dominio.
Solo elimina los volumenes del proyecto aleatorio. No ejecutar rollback en dev,
QA/main ni forzarlo borrando datos. No cambia claves/usuarios/volumenes actuales.
CI no ejecuta esta prueba nativa porque requiere configuracion de infraestructura;
comprueba XML/JSON, sintaxis PowerShell y construccion del migrador sin credenciales.
