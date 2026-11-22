# ADR-0004: paquete npm público preparado con publicación protegida

Estado: aceptado para la implementación de ArchKit 0.1.0.

## Contexto

Se solicita distribuir como create-archkit con ejecutable archkit, mantener GitHub como origen y evitar publicación automática durante el desarrollo.

## Decisión

Preparar 0.1.0, licencia MIT autorizada por el propietario y allowlist de archivos. Probar el paquete instalado fuera del repositorio. CI en Linux/macOS/Windows y Node 22.14/24. Publicación desde tags semánticos, desactivada mediante variable hasta que el propietario configure trusted publisher OIDC y protecciones. Las releases sólo se preparan como borradores mediante acción manual.

## Alternativas

Publicar desde cada push expone cambios no revisados. Tokens npm persistentes amplían el riesgo y no son necesarios cuando OIDC está disponible. Distribuir el repositorio completo incluiría ejemplos y herramientas de desarrollo innecesarios.

## Consecuencias

La disponibilidad del nombre debe verificarse antes de publicar. El primer alta npm puede requerir publicación manual autenticada. La etiqueta anotada local v1 es un hito de 0.1.0 y no dispara el workflow semántico de npm. @Santy401 es CODEOWNER global; no se añaden coautores IA.
