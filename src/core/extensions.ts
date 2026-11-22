import { ExtensionRegistry } from './registry.js';
import type { Extension } from './registry.js';
import type { Config } from './config.js';

function extension(
  id: string,
  capabilities: string[],
  requires: string[],
  generate: Extension['generate'],
): Extension {
  return {
    id,
    capabilities,
    requires,
    conflicts: [],
    compatible: () => undefined,
    generate,
  };
}
export function builtinRegistry(): ExtensionRegistry {
  return new ExtensionRegistry()
    .register(extension('documentation', ['docs.catalog'], [], () => []))
    .register(
      extension('adr', ['records.adr'], ['documentation'], () => [
        {
          path: '.docs/02-architecture/adr/README.md',
          content:
            '# ADR\n\nDecisiones arquitectónicas. Crear con `archkit adr new "Título"`.\n\nEstados: propuesto, aceptado, rechazado, sustituido.\n\n<!-- archkit:index:start -->\n<!-- archkit:index:end -->\n',
        },
      ]),
    )
    .register(
      extension('rfc', ['records.rfc'], ['documentation'], () => [
        {
          path: '.docs/06-decisions/rfc/README.md',
          content:
            '# RFC\n\nPropuestas de cambio. Crear con `archkit rfc new "Título"`.\n\nEstados: borrador, en-revision, aceptada, rechazada, retirada.\n\n<!-- archkit:index:start -->\n<!-- archkit:index:end -->\n',
        },
      ]),
    )
    .register(
      extension('validator', ['docs.validate'], ['documentation'], () => [
        {
          path: '.docs/validator.md',
          content:
            '# Validación documental\n\nEjecutar `archkit validate` desde cualquier subdirectorio del proyecto. Usar `--format json` para automatizaciones.\n\nConsultar el [contrato](contract.md) para marcadores, identificadores y límites del análisis.\n',
        },
      ]),
    )
    .register(
      extension('agents', ['agents.instructions'], ['documentation'], () => [
        {
          path: 'AGENTS.md',
          content:
            '# Instrucciones para agentes\n\nLeer [el contexto](.docs/README.md), los requisitos y los ADR relevantes antes de editar. Seguir el [protocolo](.docs/agents.md).\n',
        },
        {
          path: '.docs/agents.md',
          content:
            '# Protocolo para agentes\n\n1. Consultar el [contexto](README.md), requisitos y decisiones relevantes.\n2. Respetar ADR aceptados; proponer cambios mediante ADR o RFC si están habilitados, o solicitar que se habiliten.\n3. No inventar evidencia, requisitos ni aprobaciones.\n4. Ejecutar las verificaciones disponibles e informar archivos modificados, comandos y resultados.\n5. Distinguir lo implementado de lo pendiente.\n6. No divulgar secretos ni realizar acciones fuera de los permisos concedidos.\n',
        },
      ]),
    )
    .register(
      extension('quality', ['quality.baseline'], [], () => [
        {
          path: '.editorconfig',
          content:
            'root = true\n\n[*]\ncharset = utf-8\nend_of_line = lf\ninsert_final_newline = true\nindent_style = space\nindent_size = 2\n',
        },
        { path: '.gitattributes', content: '* text=auto eol=lf\n' },
        {
          path: '.prettierrc.json',
          content: '{ "singleQuote": true, "trailingComma": "all" }\n',
        },
      ]),
    )
    .register(extension('git', ['vcs.git-init'], [], () => []));
}
export function selectedExtensions(config: Config): string[] {
  return [
    'documentation',
    ...(config.documentation.adr ? ['adr'] : []),
    ...(config.documentation.rfc ? ['rfc'] : []),
    ...(config.documentation.validator ? ['validator'] : []),
    ...(config.agents.enabled ? ['agents'] : []),
    ...(config.tooling.quality ? ['quality'] : []),
    ...(config.tooling.git ? ['git'] : []),
  ];
}
