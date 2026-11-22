# Distribución y publicación

## Estado y artefactos

Paquete provisional `create-archkit`, ejecutable `archkit`, versión inicial 0.1.0. No se ha publicado desde esta implementación. El propietario autoriza por separado publicaciones, tags remotos y releases públicas. La etiqueta local anotada `v1` marca el primer hito de implementación; no equivale a 1.0.0 ni activa publicación npm.

La lista de distribución contiene únicamente `dist/`, `blueprints/`, `README.md`, `CHANGELOG.md`, `LICENSE` y `package.json`. No incluye ejemplos, pruebas, workflows, documentación interna, archivos temporales ni secretos. El encabezado del ejecutable compilado es `#!/usr/bin/env node`; build comprueba el encabezado y el permiso ejecutable.

## Revisión previa

```bash
pnpm install --frozen-lockfile
pnpm verify
node scripts/generate-example.mjs --check
npm pack --dry-run
npm pack
```

La prueba `pnpm test:package` crea un tarball temporal sin publicar, lo instala offline, comprueba el binario real y ejecuta init, ADR, RFC y validación fuera del repositorio. `npm pack --dry-run` muestra el contenido; con npm 11 la salida JSON es una lista y npm 12 puede devolver un objeto por nombre. El script admite ambas variantes.

## Primera publicación: requiere autorización

1. Verificar disponibilidad con `npm view create-archkit` y confirmar titularidad de `Santy401/archkit` y la identidad npm del propietario. Un 404 no reserva el nombre.
2. Revisar LICENSE, README, CHANGELOG y `package.json`. Si se cambia el nombre, ajustar configuración y las comprobaciones del paquete.
3. Crear una cuenta npm con 2FA o usar la cuenta autorizada. Si npm no permite configurar un trusted publisher para un paquete inexistente, realizar una única publicación inicial autenticada y aprobada, desde el tarball revisado. No guardar tokens en el repositorio. Fuera de CI OIDC, omitir procedencia mediante `--provenance=false` cuando corresponda.
4. Configurar el trusted publisher en npm: usuario **Santy401**, repositorio **archkit**, archivo **publish.yml**, environment **npm**. Habilitar la acción de publicación directa si se desea usar el workflow actual.
5. Crear el environment GitHub `npm` con revisión obligatoria de @Santy401 y restricciones a etiquetas aprobadas; crear también `release` para borradores. Configurar en GitHub `NPM_PUBLISH_ENABLED=true` únicamente tras autorizar la automatización.
6. Usar Node 24 y npm 11 actualizado, como hace el workflow. OIDC requiere `id-token: write`; no se utiliza `NPM_TOKEN`.
7. Sólo tras aprobación, crear y subir una etiqueta **v0.1.0** que coincida exactamente con `package.json`. No volver a publicar una versión existente.

Los detalles vigentes, requisitos de npm/Node y permisos de las identidades confiables están en la [documentación oficial npm](https://docs.npmjs.com/trusted-publishers/). El workflow permanece desactivado si falta la variable; la creación de environments y las revisiones obligatorias requieren configuración del propietario en GitHub.

## Versiones posteriores

Actualizar versión en `package.json`, las expectativas de versión de las pruebas y scripts de smoke, CHANGELOG y notas de release. Regenerar lockfile, verificar, revisar y confirmar. El paso `scripts/check-release.mjs` exige coincidencia literal `vMAJOR.MINOR.PATCH` y versión de paquete.

Después de autorización:

```bash
git tag -a v0.2.0 -m "ArchKit 0.2.0: describir cambios y evidencia"
git push origin main
git push origin v0.2.0
```

Una etiqueta semántica remota sólo publica si se habilitó el workflow y se satisfacen las protecciones del environment. La variable es una protección adicional, no reemplaza las revisiones configuradas por el propietario.

## GitHub Releases

Las notas iniciales están en `docs/releases/0.1.0.md`. El workflow manual `Prepare draft GitHub Release` verifica, empaqueta y prepara un borrador con el `.tgz`; requiere una etiqueta existente. No se ejecuta automáticamente con pushes. Revisar notas, etiqueta y contenido antes de publicar el borrador. Para nuevas versiones, actualizar el archivo de notas utilizado por el workflow.

La etiqueta local `v1` puede inspeccionarse con `git show v1`. Subirla y crear una release pública requieren una instrucción adicional del propietario.

## Instalación y actualización de usuarios

Antes de publicar: `npm install --global ./create-archkit-0.1.0.tgz` y `archkit --version`.

Después de publicar:

```bash
npx create-archkit@0.1.0 init my-project
npm install --global create-archkit@latest
archkit --version
```

Para fijar una versión usar `@0.1.0`; para actualizar globalmente instalar la versión elegida. Actualizar ArchKit no modifica proyectos ya generados ni migra sus documentos. La generación local continúa funcionando sin red; descargar o actualizar el paquete sí requiere registro o un tarball disponible.

## Publicación autorizada de 0.1.0

El propietario autorizó el 22 de noviembre de 2026 la publicación en npm y GitHub Packages y la creación de una etiqueta y GitHub Release mediante gh. Esto reemplaza la restricción previa para esta entrega.

npm y pnpm son gestores que utilizan el mismo registro público npm por defecto: no se publica una segunda copia para pnpm. El paquete principal conserva el nombre create-archkit.

GitHub Packages es otro registro y exige nombres con ámbito. El workflow github-packages.yml prepara una copia aislada llamada @santy401/create-archkit con scripts/prepare-github-package.mjs; no modifica el manifiesto principal ni su lockfile. Publica con GITHUB_TOKEN y permiso packages:write, sin usar credenciales npm personales. Nunca se guardan tokens en el repositorio.

El paquete de GitHub puede nacer privado, incluso si el repositorio es público. Revisar sus ajustes y cambiar la visibilidad a pública desde GitHub cuando corresponda. Incluso los paquetes npm públicos de GitHub Packages requieren autenticación para instalarse. Consulte la [documentación oficial](https://docs.github.com/es/packages/working-with-a-github-packages-registry/working-with-the-npm-registry).

Instalación principal:

```bash
npx create-archkit@0.1.0 init my-project
pnpm dlx create-archkit@0.1.0 init my-project
```

Para el registro adicional, configurar @santy401:registry=https://npm.pkg.github.com y autenticarse con un token de lectura de paquetes fuera del repositorio. Después instalar @santy401/create-archkit con npm o pnpm. Para obtener la CLI pública sin credenciales de GitHub, preferir la distribución principal de npm.

La primera publicación npm se realiza con sesión del propietario y confirmación web/2FA si el registro lo requiere. Las siguientes podrán utilizar el workflow OIDC existente una vez que el propietario configure el trusted publisher; no se activa esa automatización sin completar la relación de confianza.
