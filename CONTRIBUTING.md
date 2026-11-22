# Contribuir a ArchKit

El propietario del código es @Santy401, declarado para todas las rutas en [.github/CODEOWNERS](.github/CODEOWNERS).

1. Instalar Node >=22.14 y pnpm 11.22.0; ejecutar `pnpm install --frozen-lockfile`.
2. Crear una rama con un cambio concreto. Mantener el código en inglés y la documentación explicativa en español.
3. Mantener la CLI separada del núcleo y las plantillas libres de ejecución arbitraria.
4. Añadir pruebas de comportamiento para cambios funcionales o correcciones de seguridad.
5. Ejecutar `pnpm verify` y `node scripts/generate-example.mjs --check`.
6. Describir problema, comportamiento final y evidencia en la PR; solicitar revisión de @Santy401.

No añadir coautores ficticios ni atribuciones a herramientas IA en commits. La identidad de los commits debe reflejar al autor humano autorizado. No alterar historial ajeno para modificar atribuciones.

Los cambios de contrato, compatibilidad o arquitectura requieren un ADR en `docs/adr/`. Las extensiones externas, las instalaciones de frameworks y las migraciones quedan fuera del alcance de v0.1.0.

No publicar paquetes, tags remotos ni releases como parte de una contribución sin autorización del propietario. Ver [publicación](docs/publishing.md).
