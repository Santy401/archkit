# Estructura de desarrollo

El dominio no depende de infraestructura. Los casos de uso reciben puertos de salida y los adaptadores de entrada llaman puertos de aplicación. La composición conecta adaptadores concretos desde fuera.

El módulo inicial core es ilustrativo; sustituirlo por límites del dominio acordados. Un módulo sólo consume los contratos públicos de otro.

- `src/modules/core/domain`: Entidades, valores e invariantes sin dependencias de adaptadores ni puertos de aplicación.
- `src/modules/core/application/ports/inbound`: Contratos de casos de uso ofrecidos a los adaptadores de entrada.
- `src/modules/core/application/ports/outbound`: Contratos de persistencia e integración requeridos por casos de uso; no implementaciones.
- `src/modules/core/application/use-cases`: Orquestación; depende del dominio y de puertos, nunca de infraestructura.
- `src/modules/core/adapters/inbound`: Traducción de entradas externas a puertos de aplicación.
- `src/modules/core/adapters/outbound`: Implementaciones de puertos de salida; traduce modelos externos.
- `src/modules/core/composition`: Conexión de adaptadores concretos y casos de uso; único lugar que conoce ambas partes.

Los tipos Entity son ejemplos técnicos, no entidades de negocio aprobadas. Adaptar los contratos tras definir requisitos.
