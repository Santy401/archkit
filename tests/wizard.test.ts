import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  log: { step: vi.fn() },
  text: vi.fn(),
  select: vi.fn(),
  multiselect: vi.fn(),
  confirm: vi.fn(),
  isCancel: (value: unknown) => typeof value === 'symbol',
}));
import * as prompts from '@clack/prompts';
import {
  answer,
  Cancelled,
  confirmGeneration,
  wizard,
} from '../src/cli/wizard.js';
beforeEach(() => vi.clearAllMocks());
describe('interactive wizard', () => {
  it('collects all stages and allows architecture independent of size', async () => {
    vi.mocked(prompts.text)
      .mockResolvedValueOnce('interactive')
      .mockResolvedValueOnce('Description')
      .mockResolvedValueOnce('Purpose')
      .mockResolvedValueOnce('Santy401');
    vi.mocked(prompts.select)
      .mockResolvedValueOnce('application')
      .mockResolvedValueOnce('large')
      .mockResolvedValueOnce('single')
      .mockResolvedValueOnce('modular-monolith')
      .mockResolvedValueOnce('layered')
      .mockResolvedValueOnce('standard');
    vi.mocked(prompts.multiselect).mockResolvedValue([
      'adr',
      'validator',
      'agents',
    ]);
    const config = await wizard();
    expect(config.project.name).toBe('interactive');
    expect(config.project.size).toBe('large');
    expect(config.architecture.style).toBe('layered');
    expect(config.documentation.rfc).toBe(false);
    expect(prompts.log.step).toHaveBeenCalledTimes(6);
  });
  it('handles prompt cancellation and negative confirmation', async () => {
    expect(() => answer(Symbol('cancel'))).toThrow(Cancelled);
    vi.mocked(prompts.confirm).mockResolvedValue(false);
    expect(await confirmGeneration()).toBe(false);
    vi.mocked(prompts.text).mockResolvedValue(
      Symbol('cancel') as Awaited<ReturnType<typeof prompts.text>>,
    );
    await expect(wizard()).rejects.toThrow(Cancelled);
  });
});

it('propagates the process cancellation signal to terminal prompts', async () => {
  const controller = new AbortController();
  vi.mocked(prompts.confirm).mockResolvedValue(false);
  await confirmGeneration(controller.signal);
  expect(prompts.confirm).toHaveBeenCalledWith(
    expect.objectContaining({ signal: controller.signal }),
  );
});
