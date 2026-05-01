import type { ParsedArgs } from '../types.js';

const FLAG_ALIASES: Record<string, string> = {
  '-p': '--provider',
  '-m': '--model',
  '-a': '--apikey',
  '-sd': '--skip-dangerous',
  '-sl': '--statusline',
  '-u': '--update',
  '-l': '--list',
  '-v': '--version',
  '-h': '--help',
};

const BOOLEAN_FLAG_TO_KEY = {
  '--skip-dangerous': 'skipDangerous',
  '--statusline': 'statusLine',
  '--update': 'update',
  '--list': 'list',
  '--list-custom': 'listCustom',
  '--status': 'status',
  '--remove-key': 'removeKey',
  '--add-custom': 'addCustom',
  '--set-default': 'setDefault',
  '--clean': 'clean',
  '--no-launch': 'noLaunch',
  '--dry-run': 'dryRun',
  '--show-template': 'showTemplate',
  '--reset-template': 'resetTemplate',
  '--version': 'version',
  '--help': 'help',
} as const satisfies Record<string, keyof ParsedArgs>;

const STRING_FLAG_TO_KEY = {
  '--provider': 'provider',
  '--model': 'model',
  '--apikey': 'apikey',
  '--remove-custom': 'removeCustom',
  '--add-model': 'addModel',
  '--remove-model': 'removeModel',
  '--name': 'name',
  '--url': 'url',
} as const satisfies Record<string, keyof ParsedArgs>;

type BooleanFlag = keyof typeof BOOLEAN_FLAG_TO_KEY;
type StringFlag = keyof typeof STRING_FLAG_TO_KEY;

function isBooleanFlag(flag: string): flag is BooleanFlag {
  return flag in BOOLEAN_FLAG_TO_KEY;
}
function isStringFlag(flag: string): flag is StringFlag {
  return flag in STRING_FLAG_TO_KEY;
}

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const result: ParsedArgs = {
    update: false,
    list: false,
    listCustom: false,
    status: false,
    removeKey: false,
    addCustom: false,
    setDefault: false,
    clean: false,
    noLaunch: false,
    dryRun: false,
    showTemplate: false,
    resetTemplate: false,
    version: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const rawArg = argv[i];
    /* c8 ignore next -- defensive guard; for-loop bounds prevent undefined */
    if (rawArg === undefined) continue;
    const arg = FLAG_ALIASES[rawArg] ?? rawArg;

    if (!arg.startsWith('--')) {
      throw new ParseError(`Unknown argument: ${rawArg}`);
    }

    if (isBooleanFlag(arg)) {
      (result as unknown as Record<string, unknown>)[BOOLEAN_FLAG_TO_KEY[arg]] = true;
      continue;
    }

    if (isStringFlag(arg)) {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('-')) {
        throw new ParseError(`Flag ${arg} requires a value`);
      }
      (result as unknown as Record<string, unknown>)[STRING_FLAG_TO_KEY[arg]] = next;
      i++;
      continue;
    }

    throw new ParseError(`Unknown flag: ${arg}`);
  }

  return result;
}
