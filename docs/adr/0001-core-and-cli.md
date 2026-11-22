# ADR-0001: separar CLI, núcleo y blueprints

Estado: aceptado para la implementación de ArchKit 0.1.0.

## Contexto

Se requiere generación reproducible desde terminal y configuración, sin que las reglas dependan de una biblioteca de prompts.

## Decisión

TypeScript estricto y ESM con Commander para argumentos, Clack para interacción, Zod para validación y YAML para persistencia. El núcleo produce planes, un motor escribe y un registro coordina extensiones internas. Los activos se distribuyen como archivos locales.

## Alternativas

Una única función CLI simplifica el inicio pero impide reutilizar generación y pruebas independientes. Un sistema de plugins externos añade ejecución y distribución innecesarias para el alcance actual. Un bundler no aporta valor mientras el runtime sea Node y los activos estén explícitos.

## Consecuencias

La API permite probar el núcleo sin terminal. Se deben verificar los activos en el tarball y mantener las rutas relativas al módulo. Las extensiones externas y las instalaciones quedan aplazadas.
