# Criterios de aceptación de ExpenseCore

Escenarios conceptuales sujetos a revisión; todavía no existe implementación financiera.

## AC-001 Rechazar importe inválido

Dado un nuevo gasto, Cuando se indica un importe negativo, Entonces se informa un error sin guardar el movimiento. [[FR-001]] [[BR-001]]

## AC-002 Balance de periodo

Dado un periodo con ingresos 100 y gastos 40 en la misma moneda, Cuando se consulta el balance, Entonces el resultado es 60. [[FR-003]] [[BR-004]]
