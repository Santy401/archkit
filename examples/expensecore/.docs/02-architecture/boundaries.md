# Límites: ExpenseCore

El dominio no depende de infraestructura. Los casos de uso reciben puertos de salida y los adaptadores de entrada llaman puertos de aplicación. La composición conecta adaptadores concretos desde fuera.

- **domain**: Entidades, valores e invariantes sin dependencias de adaptadores ni puertos de aplicación.
- **application/ports/inbound**: Contratos de casos de uso ofrecidos a los adaptadores de entrada.
- **application/ports/outbound**: Contratos de persistencia e integración requeridos por casos de uso; no implementaciones.
- **application/use-cases**: Orquestación; depende del dominio y de puertos, nunca de infraestructura.
- **adapters/inbound**: Traducción de entradas externas a puertos de aplicación.
- **adapters/outbound**: Implementaciones de puertos de salida; traduce modelos externos.
- **composition**: Conexión de adaptadores concretos y casos de uso; único lugar que conoce ambas partes.

Definir propiedad de datos y contratos públicos. No acceder directamente a detalles privados de otro módulo.

<!-- archkit:pending -->

PENDIENTE: acordar y completar con el equipo.
