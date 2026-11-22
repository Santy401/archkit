# ADR-0003: contrato documental verificable y registros independientes

Estado: aceptado para la implementación de ArchKit 0.1.0.

## Contexto

No se deben inventar requisitos o decisiones para que los documentos parezcan completos. La detección semántica de duplicados no ofrece evidencia suficiente.

## Decisión

Usar marcadores explícitos de pendiente y no aplicabilidad, IDs normativos y estados YAML. Los documentos aceptados requieren secciones completas sin pendientes. Mantener series ADR y RFC independientes, lock exclusivo y creación sin sobrescritura. Limitar DOC-011 a cuerpos completos exactamente iguales con longitud mínima.

## Alternativas

Aceptar cualquier documento vacío escondería trabajo incompleto. Fechas e IDs aleatorios impiden comparaciones reproducibles. Un detector semántico aumenta dependencias sin un criterio objetivo de corrección.

## Consecuencias

Los documentos generados validan como pendientes declarados, sin equivaler a aprobación. Las referencias y metadatos siempre se validan. La revisión humana sigue siendo necesaria para confirmar contenido, decisiones y reglas de negocio.
