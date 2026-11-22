# Evidencia de verificación — ArchKit 0.1.0

Verificación local realizada el 22 de noviembre de 2026 en Linux, Node 24.22.2, pnpm 11.22.0 y npm 12.0.2.

## Resultado

`pnpm verify` finalizó con código 0: ESLint, TypeScript estricto, 108 pruebas Vitest en cinco suites, build, Prettier y prueba offline del paquete.

| Comprobación            | Evidencia                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| Configuración           | Campos obligatorios, versión, claves desconocidas, nombres reservados, incompatibilidades y valores por defecto |
| Registro de extensiones | Dependencias, orden, duplicados, ciclos, conflictos y compatibilidad                                            |
| Generación              | Tres tamaños, tres perfiles, cuatro arquitecturas, monolito y monolito modular                                  |
| Compilación del destino | Los contratos generados de las cuatro arquitecturas compilan en TypeScript estricto                             |
| Seguridad               | Rutas y nombres multiplataforma, symlinks, colisiones, destino existente, cancelación y rollback                |
| Documentación           | Reglas DOC-001 a DOC-012, enlaces/fragmentos, IDs, criterios, pendientes, no aplicabilidad y duplicación exacta |
| ADR/RFC                 | Numeración independiente, metadatos, estados, aceptación, preservación, índices, bloqueos y concurrencia        |
| CLI                     | Ayuda, versión, opciones, YAML/JSON, consentimiento, errores, JSON y códigos de salida                          |
| Terminal real           | Asistente completado: siete etapas, 58 archivos y validación satisfactoria                                      |
| Cancelación real        | Ctrl+C: salida 130 y destino ausente                                                                            |
| Git opcional            | Repositorio local creado sin instalación de dependencias                                                        |
| Paquete externo         | Tarball instalado offline fuera del repositorio; ejecutable, npx, init, ADR, RFC y validate correctos           |
| ExpenseCore             | Generado con el motor de producción, validación sin incidencias y snapshot idéntico al regenerar                |
| Distribución            | npm pack --dry-run correcto; allowlist de 39 archivos; shebang y permiso ejecutable comprobados                 |

## Artefacto preparado

`create-archkit-0.1.0.tgz`, aproximadamente 29.3 kB comprimidos; 39 archivos. SHA-256:

```text
0dc4a744cc6f825250cf4e6faa3d177047193450c0d6f12282ec799c9482e174
```

El tarball local está ignorado por Git y no se ha publicado en npm. Contiene únicamente distribución JS/tipos, blueprints, README, CHANGELOG, licencia y manifiesto. No contiene el ejemplo, herramientas de desarrollo, workflows ni documentos privados.

## Fases y alcance

1. Inspección: directorio originalmente vacío, sin instrucciones locales ni historial. Se preservó el README inicial y se creó el commit solicitado.
2. Diseño: cuatro ADR internos registran separación de responsabilidades, seguridad/compatibilidad, contrato documental y distribución.
3. Núcleo: configuración, registro, planificación y ejecución reutilizables sin dependencia de terminal.
4. CLI: asistente, modo reproducible, comandos y códigos de salida probados.
5. Documentación: catálogo, plantillas, perfiles, estados y doce reglas implementados.
6. Ejemplo: ExpenseCore generado mediante el motor real y entradas conceptuales explícitas; no se inventaron aprobaciones de negocio.
7. Verificación: comandos anteriores ejecutados; los defectos encontrados se corrigieron antes de empaquetar.
8. Entrega: documentación, notas, licencia MIT autorizada, CODEOWNERS @Santy401, paquete local y etiqueta de hito local v1.

## Implementado pero no verificado por esta ejecución local

La matriz de GitHub Actions define Linux/macOS/Windows con Node 22.14 y 24. Esta evidencia local sólo acredita Linux con Node 24. Consultar las ejecuciones remotas del [workflow CI](https://github.com/Santy401/archkit/actions/workflows/ci.yml) para los demás sistemas.

Los workflows de publicación OIDC y borrador de release están preparados; no se han ejecutado aquí contra npm ni se ha creado una release pública. Requieren configuración del propietario, autorización, identidad npm y environments protegidos. La publicación npm está desactivada por defecto.

## Pendiente y fuera del alcance

Pendiente de autorización: publicar npm, subir etiquetas remotas y publicar una GitHub Release. El nombre provisional debe volver a comprobarse antes de la primera publicación.

Fuera de v0.1.0: frameworks completos, instalaciones del proyecto generado, monorepos, servicios independientes, migraciones, marketplace y ejecución de plugins descargados. Hacia v0.2.0 se propone priorizar blueprints de frameworks, módulos configurables y análisis Markdown más amplio.

El validador no evalúa corrección de negocio, enlaces externos ni arquitectura del código. DOC-011 sólo detecta igualdad exacta de cuerpos completos. La limpieza es recuperable ante errores normales, sin garantía ante SIGKILL, fallo de disco o modificación concurrente hostil del destino.
