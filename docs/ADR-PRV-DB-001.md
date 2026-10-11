# ADR-PRV-DB-001 - Publicar migraciones MongoDB existentes

Decision del equipo para publicacion oficial, 2026-10-11. Incluye migraciones,
migrador y pruebas en este PR; no implica aprobacion docente de toda la arquitectura.

Proveedores posee la base logica suppliers en el MongoDB compartido (rs0).
Colecciones: suppliers, creation_requests, receipts y receipt_requests.
No posee stock ni escribe en otros dominios. Sus referencias UUID no son FK;
la API debe validar referencias y confirmar documento/intencion atomicamente.
Los indices unicos cubren documento, intencion, proveedor/referencia y saga.
Los validadores BSON son estrictos y exigen auditoria compatible con estado.

Se conservan los XML aplicados, identificadores y tres changesets sin reescribir
su historia. Liquibase y su extension MongoDB son 4.31.1; dependencias empaquetadas
sin duplicar JAR del motor Liquibase. Migrar requiere administrador; la API usa
suppliers_app limitado a suppliers. No se publica la API ni otro motor aqui.

El rollback elimina colecciones y no protege automaticamente documentos reales:
solo probarlo en replica set desechable. DDL no es una transaccion global; ante
aplicacion parcial diagnosticar antes de habilitar API. Cambios futuros aditivos.
La prueba verifica repeticion, rollback/reconstruccion, indices, rechazos BSON,
aborto de transacciones con intencion invalida y rechazo de escritura en admin.
No demuestra un upgrade con datos v1 conservados, permisos exhaustivos de lectura,
concurrencia de API ni QA/main. CI verifica estructura/build; prueba nativa local.
