# Distribución y publicación

## Estado de 0.1.0

Publicación autorizada y completada el 22 de noviembre de 2026:

- npm: [create-archkit@0.1.0](https://www.npmjs.com/package/create-archkit/v/0.1.0), etiqueta latest.
- GitHub Packages: @santy401/create-archkit@0.1.0, publicado por [GitHub Actions](https://github.com/Santy401/archkit/actions/runs/45047887334). El propietario confirmó su visibilidad pública.
- GitHub Release: [v0.1.0](https://github.com/Santy401/archkit/releases/tag/v0.1.0), creada con gh, etiqueta anotada, notas, tarball y SHA-256.

npm y pnpm son gestores que utilizan el registro npm por defecto: no requieren dos publicaciones distintas. Se verificaron npx y pnpm dlx desde una caché temporal limpia fuera del repositorio. Un proyecto creado por npx se validó con pnpm dlx sin incidencias. La integridad SHA-512 del registro coincide con el tarball de la release.

## Instalación y actualización

```bash
npx create-archkit@0.1.0 init my-project
pnpm dlx create-archkit@0.1.0 init my-project
```

Instalación global, elegir el gestor preferido:

```bash
npm install --global create-archkit@latest
pnpm add --global create-archkit@latest
archkit --version
```

Para fijar una versión usar @0.1.0. Actualizar ArchKit no modifica ni migra proyectos existentes. Generar con una CLI ya instalada no requiere red; descargar o actualizar sí requiere registro o tarball disponible.

La release ofrece instalación sin registro mediante `npm install --global ./create-archkit-0.1.0.tgz`.

## Registros separados

El paquete principal conserva el nombre create-archkit en npmjs.org. GitHub Packages exige un nombre con ámbito: @santy401/create-archkit. El script scripts/prepare-github-package.mjs prepara esa copia en un directorio nuevo y exclusivo, con el mismo código y blueprints y un manifiesto adaptado, sin modificar el manifiesto principal ni el lockfile.

Para instalar desde GitHub Packages, configurar @santy401:registry=https://npm.pkg.github.com y autenticarse con permisos de lectura de paquetes fuera del repositorio. Incluso sus paquetes npm públicos requieren autenticación. Para descargar la CLI pública sin credenciales GitHub, preferir npmjs.org.

GitHub Packages asigna inicialmente visibilidad privada. Cambiarla a pública en Package settings y verificar los permisos después del primer alta. Consultar la [documentación oficial](https://docs.github.com/es/packages/working-with-a-github-packages-registry/working-with-the-npm-registry).

## Verificación previa de una nueva versión

Actualizar package.json, lockfile, CHANGELOG, expectativas de versión de las pruebas/scripts y notas de release. Ejecutar:

```bash
pnpm install --frozen-lockfile
pnpm verify
node scripts/generate-example.mjs --check
npm pack --dry-run
npm pack
```

El paquete distribuye sólo dist, blueprints, README, CHANGELOG, LICENSE y package.json. Las pruebas instalan el tarball offline fuera del repositorio y comprueban binario, generación, ADR/RFC y validación. No incluir credenciales, ejemplos ni herramientas temporales. npm 11 devuelve una lista JSON en pack; npm 12 puede devolver un objeto por nombre. El smoke admite ambas variantes.

## Autenticación y automatización

La publicación inicial npm se completó mediante sesión del propietario, activación de 2FA y confirmación web. No se guardaron credenciales en el repositorio. No volver a publicar 0.1.0: una versión publicada es inmutable.

El workflow publish.yml prepara OIDC para publicaciones futuras y sigue desactivado hasta configurar correctamente la confianza. Crear en npm un trusted publisher para Santy401/archkit, workflow publish.yml, environment npm. Configurar el environment con revisión de @Santy401 y etiquetas autorizadas. Activar NPM_PUBLISH_ENABLED=true únicamente tras completar esa configuración y autorizar la automatización. El workflow usa Node 24, npm 11 actualizado e id-token:write; no requiere NPM_TOKEN. Consultar [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

El workflow github-packages.yml sí está activo para etiquetas semánticas y usa GITHUB_TOKEN con packages:write. Nunca reutiliza credenciales npm personales. El control de versión exige que la etiqueta coincida exactamente con package.json.

## Etiquetas y releases futuras

Después de revisar y autorizar cada nueva entrega:

```bash
git tag -a v0.2.0 -F docs/releases/0.2.0.md
git push origin main
git push origin v0.2.0
gh release create v0.2.0 --verify-tag --title "ArchKit v0.2.0" --notes-file docs/releases/0.2.0.md
```

Adjuntar el tarball revisado y su checksum. No mover ni reemplazar etiquetas publicadas. v1 conserva el primer hito local de la implementación 0.1.0; la primera etiqueta semántica publicada es v0.1.0. El workflow manual de borrador de release continúa disponible; al usarlo en otra versión, ajustar el archivo de notas correspondiente.
