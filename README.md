# ArchKit

CLI para crear bases de proyectos con arquitectura explícita, documentación organizada y convenciones de ingeniería desde el primer día.

**Versión: 0.1.0 · Paquete: `create-archkit` · Ejecutable: `archkit` · Licencia: MIT.**

GitHub es el repositorio principal: [Santy401/archkit](https://github.com/Santy401/archkit). La distribución principal usa el [registro npm](https://www.npmjs.com/package/create-archkit), compatible con npm y pnpm. El registro adicional GitHub Packages utiliza `@santy401/create-archkit`; requiere configuración y autenticación propias.

## Qué resuelve

Inicializar arquitectura, documentación y convenciones suele repetirse y producir estructuras incoherentes. ArchKit convierte decisiones guiadas en un plan reproducible, comprueba su integridad y lo escribe sin mezclarlo con archivos existentes.

## Funcionalidades de v0.1.0

- Asistente de siete etapas, opciones explícitas y configuración YAML/JSON versionada.
- Proyectos pequeños, medianos y grandes; el tamaño orienta recomendaciones sin imponer arquitectura.
- Repositorio single-project con monolito o monolito modular.
- Arquitecturas hexagonal, clean, por capas y minimal, con responsabilidades y contratos TypeScript diferentes.
- Perfiles documentales Minimal, Standard y Extended a partir de un catálogo común.
- ADR y RFC opcionales, numeración independiente, metadatos y actualización de índices.
- Doce reglas documentales, salida humana/JSON y códigos de salida para automatizaciones.
- Instrucciones breves para agentes, configuración básica de calidad e inicialización Git opcional.
- Plantillas locales incluidas en el paquete; la generación no usa internet ni instala frameworks.
- Ejemplo ExpenseCore generado y validado mediante el mismo motor de producción.

## Requisitos e instalación local

Node.js **22.14 o posterior**. Desarrollo: pnpm **11.22.0**. Git es opcional para los proyectos generados.

```bash
git clone https://github.com/Santy401/archkit.git
cd archkit
pnpm install --frozen-lockfile
pnpm verify
node dist/cli/main.js --help
```

Crear e instalar el paquete local:

```bash
npm pack
npm install --global ./create-archkit-0.1.0.tgz
archkit --version
```

Ejecución desde el registro npm sin instalación global:

```bash
npx create-archkit@0.1.0 init
pnpm dlx create-archkit@0.1.0 init
# Forma explícita cuando se quiere indicar el ejecutable:
npm exec --package=create-archkit@0.1.0 -- archkit init
```

También se puede instalar globalmente con `npm install --global create-archkit` o `pnpm add --global create-archkit`. Las [releases de GitHub](https://github.com/Santy401/archkit/releases) ofrecen el tarball para instalación local.

## Primer uso

```bash
archkit init
archkit init my-project
```

El asistente pregunta identidad, tamaño, organización, arquitectura, perfil y componentes; muestra destino, archivos y operaciones antes de solicitar confirmación. Ctrl+C cancela. Un destino existente, incluso vacío, se rechaza: elegir otro directorio. No existe una opción `--force`.

```bash
archkit init expensecore --non-interactive --yes \
  --description "Finanzas personales" \
  --purpose "Organizar ingresos y gastos" \
  --size medium --architecture hexagonal \
  --deployment modular-monolith --docs standard

archkit init --config examples/expensecore.yaml --yes --output ./my-expensecore
archkit init --config examples/expensecore.yaml --dry-run
```

`--config` activa el modo sin preguntas; las opciones explícitas prevalecen sobre el archivo. `--yes` autoriza el plan. Sin terminal y sin `--yes` sólo puede consultarse con `--dry-run`. La ruta de destino se permite mediante `--output`; el nombre del proyecto sólo admite letras ASCII, números, guion y guion bajo, hasta 64 caracteres, excluyendo nombres reservados de Windows.

## Comandos

| Comando                                                            | Comportamiento                         |
| ------------------------------------------------------------------ | -------------------------------------- |
| `archkit init [name]`                                              | Asistente interactivo                  |
| `archkit init [name] --non-interactive --yes --description <text>` | Generación sin preguntas               |
| `archkit init --config <yaml-or-json> --yes`                       | Configuración reproducible             |
| `archkit init ... --dry-run`                                       | Inspección del plan sin escrituras     |
| `archkit adr new [title]`                                          | Nueva decisión propuesta               |
| `archkit rfc new [title]`                                          | Nueva RFC borrador                     |
| `archkit validate [--format human\|json]`                          | Validación independiente del asistente |
| `archkit --help` / `archkit --version`                             | Ayuda / versión                        |

ADR, RFC y validate buscan `.docs/blueprint.yaml` hacia arriba; también aceptan `--project <directory>`. Sin terminal, ADR/RFC requieren un título explícito.

Opciones de `init`: `--description`, `--purpose`, `--author`, `--type application|library|prototype`, `--size small|medium|large`, `--organization single`, `--deployment monolith|modular-monolith`, `--architecture hexagonal|clean|layered|minimal`, `--docs minimal|standard|extended`, `--no-adr`, `--no-rfc`, `--no-validator`, `--no-agents`, `--no-quality`, `--git`, `--output`, `--config`, `--non-interactive`, `--yes`, `--dry-run`. Consultar `archkit init --help`.

Códigos de salida: **0** éxito o sólo advertencias, **1** errores de configuración/generación/validación, **2** argumentos desconocidos o incompletos, **130** cancelación.

## Configuración reproducible

```yaml
schemaVersion: 1
project:
  name: expensecore
  description: Finanzas personales
  purpose: Organizar ingresos y gastos
  size: medium
  type: application
workspace:
  organization: single
  deployment: modular-monolith
architecture:
  style: hexagonal
documentation:
  profile: standard
  adr: true
  rfc: true
  validator: true
agents:
  enabled: true
tooling:
  git: false
  quality: true
```

Nombre y descripción son obligatorios. El propósito omitido se declara pendiente. Los valores por defecto del contrato son medium, single, modular-monolith, hexagonal, standard, componentes documentales/agentes/calidad activos y Git inactivo. El asistente recomienda Minimal/monolito para Small y Extended/monolito modular para Large; siempre permite cambiar esas recomendaciones. El archivo normalizado se conserva en `.docs/blueprint.yaml`, sin fechas, UUID ni secretos. No se admiten campos desconocidos ni aliases YAML.

## Arquitecturas

| Estilo    | Responsabilidades y dependencia                                                                                 |
| --------- | --------------------------------------------------------------------------------------------------------------- |
| Hexagonal | Dominio independiente; casos de uso consumen puertos; adaptadores implementan puertos; composición externa      |
| Clean     | Entidades → límites/casos de uso; controllers, presenters y gateways adaptan entradas/salidas; frameworks fuera |
| Layered   | Presentación → negocio → acceso a datos; modelo compartido; dependencias descendentes                           |
| Minimal   | `src/index.ts` sin capas obligatorias; documentar nuevos límites cuando se necesiten                            |

Un monolito modular coloca la estructura dentro de `src/modules/core`; el módulo técnico inicial debe reemplazarse por límites del dominio acordados. Un monolito la coloca directamente en `src`. Los contratos `Entity` son ilustrativos; no son requisitos ni reglas de negocio aprobadas. No se genera una aplicación completa, framework, manifiesto de dependencias ni compilador para el proyecto destino.

Monorepo describe la organización del repositorio y monolito la ejecución: son decisiones distintas. v0.1.0 rechaza monorepos y servicios independientes antes de escribir.

## Sistema `.docs/`

Standard incluye `README.md`, `blueprint.yaml`, el contrato documental y todas las secciones:

```text
.docs/
  00-project/       visión, alcance, glosario
  01-requirements/  funcionales, no funcionales, reglas, casos de uso
  02-architecture/  vista general, principios, límites, diagramas, ADR opcionales
  03-design/        dominio, contratos, flujos
  04-quality/       estrategia, criterios de aceptación, controles
  05-operations/    entornos, despliegue
  06-decisions/     registro, preguntas, RFC opcionales
  07-evolution/     roadmap, changelog, deuda
```

Cada directorio contiene README. Minimal conserva visión, alcance, arquitectura y criterios de aceptación; las extensiones seleccionadas siguen disponibles. Extended añade un modelo de amenazas. El catálogo evita duplicar las plantillas de Standard.

Los documentos incompletos declaran `<!-- archkit:pending -->` y `PENDIENTE:` con explicación. La no aplicabilidad usa `<!-- archkit:not-applicable reason="Justificación concreta" -->`. Estas declaraciones no permiten omitir archivos obligatorios ni esconder enlaces o metadatos inválidos.

## ADR y RFC

```bash
archkit adr new "Adoptar puertos y adaptadores"
archkit rfc new "Proponer API de movimientos"
```

Cada serie empieza en 0001. Los registros tienen metadatos YAML con ID, tipo y estado; no incluyen una fecha inventada. Los comandos no editan registros previos ni aprueban propuestas. Estados ADR: `propuesto`, `aceptado`, `rechazado`, `sustituido`. Estados RFC: `borrador`, `en-revision`, `aceptada`, `rechazada`, `retirada`.

Para aceptar, completar el documento y revisar el cambio explícitamente. Para sustituir una decisión aceptada, crear otra y enlazar ambas en una revisión. Los conflictos de IDs, nombres, índices o bloqueo detienen la operación.

## Validación

```bash
archkit validate
archkit validate --format json
```

Cada incidencia incluye regla, severidad, archivo, línea cuando puede localizarse, explicación y corrección sugerida. Un error produce código 1. [Contrato completo y alcance de DOC-001 a DOC-012](https://github.com/Santy401/archkit/blob/main/blueprints/contract.md).

Se comprueban índices, archivos del perfil, títulos, enlaces Markdown internos y fragmentos, IDs/estados ADR/RFC, secciones de documentos aceptados, IDs de requisitos, escenarios AC, referencias normativas `[[FR-001]]` y declaraciones pendientes/no aplicables. DOC-011 avisa únicamente de cuerpos completos idénticos con al menos 200 caracteres: no intenta detectar duplicación semántica.

No se verifican enlaces externos, HTML/MDX, exactitud de negocio ni importaciones arquitectónicas del código. Los marcadores dentro de código no son referencias normativas.

## ExpenseCore

[Ejemplo reproducible](https://github.com/Santy401/archkit/tree/main/examples): arquitectura hexagonal, monolito modular, Standard, reglas ilustrativas de ingresos/gastos/categorías/presupuestos/balances, ADR/RFC y agentes.

```bash
pnpm example
node dist/cli/main.js validate --project examples/expensecore
# Regeneración temporal verificable sin modificar el ejemplo existente:
node scripts/generate-example.mjs --check
```

`pnpm example` requiere que `examples/expensecore` no exista. La versión incluida ya está generada. El script llama primero al motor de producción y valida su salida base; después incorpora entradas conceptuales explícitas de `expensecore-content.json` y crea ADR/RFC con los comandos del núcleo. Las reglas son propuestas pendientes, no aprobaciones inventadas. No implementa un producto financiero.

## Seguridad y recuperación

Plan completo validado, escritura en staging temporal junto al destino, comprobación documental previa y reserva exclusiva de destino. Ante errores recuperables o cancelación se retiran los archivos propios. No se ejecuta contenido de plantillas ni se instalan paquetes del proyecto generado. Git sólo se invoca si se solicita.

Se rechazan rutas de plantilla absolutas, recorridos `..`, separadores Windows dentro de las plantillas, nombres reservados, colisiones por mayúsculas y enlaces simbólicos en destinos. El destino puede contener espacios. Tras una terminación forzada del proceso o fallo de disco pueden quedar `.archkit-*`, un destino incompleto o `.docs/.records-lock`; inspeccionar y retirar únicamente los artefactos propios antes de reintentar. No existe una garantía transaccional ante fallos del sistema operativo ni frente a otros procesos que alteren el mismo directorio.

`--no-validator` omite sus instrucciones locales; `archkit validate` y la comprobación previa a la generación continúan disponibles. La calidad básica aporta EditorConfig, atributos Git y configuración Prettier, sin instalar herramientas ni prometer checks del código generado.

## Ingeniería, distribución y contribución

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
pnpm test:package
pnpm verify
npm pack --dry-run
```

`verify` incluye lint, tipos, pruebas, compilación, formato e instalación/prueba offline del paquete fuera del repositorio. Las pruebas no consultan servicios externos; requieren las dependencias de desarrollo ya instaladas. CI define matriz Linux/macOS/Windows con Node 22.14 y 24.

Consultar [arquitectura interna](https://github.com/Santy401/archkit/blob/main/docs/architecture.md), [decisiones](https://github.com/Santy401/archkit/tree/main/docs/adr), [publicación y actualización](https://github.com/Santy401/archkit/blob/main/docs/publishing.md), [contribución](https://github.com/Santy401/archkit/blob/main/CONTRIBUTING.md) y [changelog](CHANGELOG.md).

## Limitaciones y roadmap

v0.1.0 se limita a estructuras TypeScript ilustrativas sin framework, generación en destinos nuevos y extensiones internas de confianza. No instala frameworks, no migra proyectos existentes, no descubre plugins descargados, no ofrece marketplace y no genera servicios distribuidos.

Para v0.2.0: blueprints de frameworks con pruebas reales, módulos de dominio configurables, mejor análisis Markdown, manifiestos de capacidades y soporte inicial de monorepos. Instalaciones externas, Docker y CI/CD de proyectos destino requerirán consentimiento explícito y verificaciones propias. La etiqueta local `v1` identifica el primer hito de implementación de **0.1.0**; no significa versión npm 1.0.0.
