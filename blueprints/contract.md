# Contrato documental v1

Todos los directorios documentales tienen README. Cada Markdown contiene un único título principal `#`.
Los documentos obligatorios dependen del perfil guardado en [blueprint.yaml](blueprint.yaml).

## Pendiente y no aplicabilidad

Un documento incompleto declara `<!-- archkit:pending -->` y explica con `PENDIENTE:` qué falta.
El marcador permite contenido por desarrollar, pero nunca evita controles de enlaces, IDs, estados o metadatos.
Un documento no aplicable usa `<!-- archkit:not-applicable reason="Justificación concreta" -->`.
La razón debe tener al menos diez caracteres. No se puede declarar un ADR/RFC aceptado pendiente o no aplicable.
Estas declaraciones no sustituyen archivos ni índices obligatorios.

## Identificadores

Definir requisitos con encabezados `## FR-001 Nombre`, `## NFR-001 Nombre`, reglas `## BR-001 Nombre`,
casos `## UC-001 Nombre` y criterios `## AC-001 Nombre`. Cada definición es única en el proyecto.
Las referencias normativas usan `[[FR-001]]`, `[[ADR-0001]]`, etc. Deben tener definición.
Un criterio completado describe Dado/Cuando/Entonces y refiere a un requisito FR o NFR existente.

## Registros

ADR: frontmatter YAML con `id: ADR-0001`, `type: adr`, `status: propuesto|aceptado|rechazado|sustituido`.
Aceptados requieren Contexto, Decisión y Consecuencias con texto sustantivo, sin pendientes.
RFC: `id: RFC-0001`, `type: rfc`, `status: borrador|en-revision|aceptada|rechazada|retirada`.
Aceptadas requieren Motivación, Propuesta, Impacto y Plan de validación, sin pendientes.
El nombre empieza por el número correspondiente, por ejemplo `0001-titulo.md`. Cada serie tiene su contador.
Los comandos sólo crean propuestas; la aprobación y la sustitución son revisiones explícitas de documentos.

## Alcance de las reglas

DOC-001 índices; DOC-002 archivos del perfil; DOC-003 título principal; DOC-004 enlaces internos;
DOC-005 IDs y metadatos ADR/RFC únicos y coherentes; DOC-006 estados; DOC-007 secciones aceptadas;
DOC-008 IDs de requisitos; DOC-009 criterios de aceptación; DOC-010 referencias por ID;
DOC-011 cuerpos completos idénticos de al menos 200 caracteres, excluyendo índices y pendientes (advertencia);
DOC-012 declaraciones pendientes/no aplicables válidas.

Se analizan enlaces Markdown inline, imágenes y enlaces de referencia, incluyendo fragmentos de títulos.
No se ejecutan ni se validan enlaces externos, HTML, MDX, contenido dentro de bloques de código ni archivos fuera del proyecto.
Los títulos se convierten a fragmentos con minúsculas, eliminación de puntuación y espacios como guiones;
se soportan títulos repetidos con sufijos `-1`, `-2`.
DOC-011 no detecta similitud semántica. El validador comprueba integridad documental, no corrección de negocio ni dependencias del código.
