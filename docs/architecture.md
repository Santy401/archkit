# Arquitectura interna de ArchKit 0.1.0

## Flujo y dependencias

`cli` → `core` → `blueprints` y registro de extensiones. El núcleo coordina `validation` antes de publicar los archivos en destino. `records` reutiliza configuración, plantillas literales y utilidades seguras. Ningún módulo de núcleo depende de Commander, Clack ni una terminal.

```text
src/
  cli/          argumentos, asistente, confirmación, códigos de salida
  core/         contrato Zod, resolución, planificación, extensiones internas
  blueprints/   carga de activos, representación de plan, rutas, staging, render literal
  records/      descubrimiento de proyecto, estados, numeración, índice y bloqueo
  validation/   interpretación Markdown y doce reglas documentales
  index.ts      API ESM pública tipada
blueprints/     catálogo, contratos y plantillas distribuidos con el paquete
scripts/        verificación de build/paquete, ejemplo y precondiciones de release
examples/       configuración, entradas conceptuales y salida real de ExpenseCore
```

## Configuración

Zod valida datos `unknown` en una única frontera. Se rechazan versiones desconocidas, claves extra, nombres inseguros y combinaciones todavía no soportadas. YAML también acepta JSON; no se permiten aliases. El resultado es `Config`, normalizado y guardado con campos estables. Los valores recomendados por tamaño sólo pertenecen al asistente; no invalidan decisiones explícitas.

## Motor

`buildPlan` produce una lista ordenada de rutas relativas y contenidos, más operaciones explícitas. `checkPlan` rechaza rutas peligrosas, colisiones independientes de mayúsculas y conflictos archivo/directorio. La sustitución de plantillas sólo reconoce variables literales `{{name}}`; no evalúa expresiones.

`executePlan` prepara archivos en un directorio temporal adyacente, valida el resultado, ejecuta Git si está solicitado, reserva el destino con mkdir exclusivo y mueve los archivos propios. No admite sobrescritura ni genera dentro de directorios existentes. Se limpia staging al salir y se retira el destino reservado ante errores recuperables. No se promete atomicidad frente a caída del sistema ni modificación concurrente hostil de directorios. Un usuario puede inspeccionar residuos `.archkit-*` después de una terminación forzada.

## Extensiones

Contrato `Extension`: identificador, capacidades, requisitos por ID, conflictos por ID, comprobación de compatibilidad, aportación de archivos y verificación opcional. El registro rechaza duplicados, resuelve dependencias en orden topológico y detecta ciclos, faltantes e incompatibilidades. El núcleo controla las operaciones; las extensiones incluidas no instalan dependencias.

Las capacidades son metadatos descriptivos; `requires` referencia IDs de extensión y no capacidades alternativas. Las extensiones internas son funciones de confianza. La API no carga módulos por configuración ni descarga plugins. No existe un hook de instalación ejecutable: futuras instalaciones requerirán un contrato separado con consentimiento y recuperación; no se expone ahora un método vacío.

## Documentación y registros

Un catálogo único alimenta los tres perfiles y define archivos obligatorios para el validador. ADR y RFC tienen series separadas, metadatos y estados declarados. El lock exclusivo `.docs/.records-lock` serializa la creación entre procesos ArchKit. El archivo nuevo usa apertura exclusiva; el índice se prepara en temporal y se sustituye tras crear el documento. Si falla antes de confirmar el índice, se elimina únicamente el documento nuevo. No se reescribe ningún ADR/RFC previo.

La aceptación es una edición revisada explícitamente; la CLI sólo crea estados iniciales. No hay fecha automática para facilitar reproducción. La trazabilidad temporal puede obtenerse del historial Git.

## Validación y límites

[Contrato DOC-001 a DOC-012](../blueprints/contract.md). Se ignoran bloques y spans de código. Los errores bloquean la generación; las advertencias de duplicación exacta no la bloquean. El análisis Markdown cubre el subconjunto documentado; no es un parser CommonMark completo ni un evaluador semántico.

El campo `documentation.validator` controla las instrucciones generadas; el validador independiente y la comprobación de integridad del motor siempre están disponibles. `tooling.quality` sólo prepara formato y atributos multiplataforma: no instala herramientas.

## Empaquetado

TypeScript estricto compila a ESM conservando shebang. Los activos se resuelven con `import.meta.url` respecto al paquete, no respecto al cwd. La lista `files` permite sólo dist, blueprints, README, CHANGELOG y LICENSE. La prueba de tarball instala desde el almacén offline de pnpm en temporal, ejecuta el binario y verifica init/ADR/RFC/validate. El consumo no requiere TypeScript, Vitest ni el código fuente.
