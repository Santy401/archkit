# ADR-0002: destinos nuevos y compatibilidad explícita

Estado: aceptado para la implementación de ArchKit 0.1.0.

## Contexto

La herramienta no debe sobrescribir trabajo ni producir combinaciones arquitectónicas incompletas. Monorepo y monolito corresponden a dimensiones diferentes.

## Decisión

Aceptar sólo directorios de destino inexistentes. Preparar y validar en staging y reservar el destino de forma exclusiva. Mantener organización y despliegue separados en el contrato; soportar single con monolith o modular-monolith, rechazando monorepo y services en v0.1.0.

## Alternativas

Mezclar con un repositorio existente exigiría comparación, resolución de conflictos y rollback por archivo. Ofrecer opciones sin implementación produciría falsas expectativas.

## Consecuencias

No existe --force. Las bases se generan en una carpeta nueva que el usuario puede revisar. No hay garantía de transacción ante SIGKILL o fallo de disco; los residuos se documentan. El tamaño afecta recomendaciones y nunca impone un estilo arquitectónico.
