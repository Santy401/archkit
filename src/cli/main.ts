#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { CommanderError } from 'commander';
import { createProgram } from './program.js';
import { Cancelled } from './wizard.js';

const controller = new AbortController();
const abort = () => controller.abort(new Cancelled());
process.once('SIGINT', abort);
process.once('SIGTERM', abort);
try {
  const pkg = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
  ) as { version: string };
  await createProgram(pkg.version, controller.signal).parseAsync(process.argv);
} catch (error) {
  if (error instanceof CommanderError)
    process.exitCode = error.exitCode === 0 ? 0 : 2;
  else {
    console.error(
      `ArchKit: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode =
      error instanceof Cancelled || controller.signal.aborted ? 130 : 1;
  }
} finally {
  process.removeListener('SIGINT', abort);
  process.removeListener('SIGTERM', abort);
}
