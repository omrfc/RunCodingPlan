import { ANSI } from '../constants.js';
import { restoreTerminal, hideCursor, showCursor, c } from './ui.js';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
  separator?: boolean;
  hint?: string;
}

const KEY_CTRL_C = '';
const KEY_ENTER_RETURN = ['\r', '\n'] as const;
const KEY_BACKSPACE = ['', '\b'] as const;
const KEY_ARROW_UP = '[A';
const KEY_ARROW_DOWN = '[B';

interface RawSession {
  cleanup: () => void;
}

function startRawSession(onData: (chunk: string) => void): RawSession {
  const stdin = process.stdin;
  let rawModeSet = false;

  try {
    if (stdin.isTTY) {
      stdin.setRawMode(true);
      rawModeSet = true;
    }
  } catch {
    // non-TTY environment
  }
  stdin.resume();
  stdin.setEncoding('utf8');
  stdin.on('data', onData);

  return {
    cleanup: () => {
      stdin.removeListener('data', onData);
      if (rawModeSet && stdin.isTTY) {
        /* c8 ignore next 5 -- setRawMode(false) rarely throws in practice */
        try {
          stdin.setRawMode(false);
        } catch {
          // ignore
        }
      }
      stdin.pause();
    },
  };
}

function cancelAndExit(cleanup: () => void): never {
  cleanup();
  restoreTerminal();
  console.log('\n  ' + c.gray('Cancelled.'));
  process.exit(130);
}

export async function select(question: string, options: SelectOption[]): Promise<string> {
  const selectable: number[] = [];
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    if (opt && !opt.separator && !opt.disabled) selectable.push(i);
  }
  if (selectable.length === 0) throw new Error('No selectable options');

  let cursor = 0;

  return new Promise<string>((resolve, reject) => {
    const stdout = process.stdout;
    hideCursor();

    const render = (first: boolean): void => {
      if (!first) {
        const totalLines = options.length + 1;
        stdout.write(ANSI.cursorUp(totalLines));
      }
      stdout.write(`  ${c.cyan('?')} ${c.bold(question)}\n`);
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        if (!opt) continue;
        stdout.write(ANSI.clearLine + '\r');
        if (opt.separator) {
          stdout.write('  ' + c.gray(opt.label) + '\n');
        } else {
          const isCursor = selectable[cursor] === i;
          const prefix = isCursor ? c.cyan('❯') : ' ';
          const text = isCursor ? c.cyan(opt.label) : opt.label;
          const hint = opt.hint ? ' ' + c.dim(opt.hint) : '';
          stdout.write(`  ${prefix} ${text}${hint}\n`);
        }
      }
    };

    const session = startRawSession((key) => {
      if (key === KEY_CTRL_C) {
        showCursor();
        cancelAndExit(session.cleanup);
      }
      if (KEY_ENTER_RETURN.includes(key as (typeof KEY_ENTER_RETURN)[number])) {
        session.cleanup();
        showCursor();
        const chosenIndex = selectable[cursor];
        /* c8 ignore next 4 -- defensive guard; selectable is bounds-clamped */
        if (chosenIndex === undefined) {
          reject(new Error('Nothing selected'));
          return;
        }
        const chosen = options[chosenIndex];
        /* c8 ignore next 4 -- defensive guard; options[selectable[i]] is always defined */
        if (!chosen) {
          reject(new Error('Invalid selection'));
          return;
        }
        stdout.write('\n');
        resolve(chosen.value);
        return;
      }
      if (key === KEY_ARROW_UP || key === 'k') {
        cursor = (cursor - 1 + selectable.length) % selectable.length;
        render(false);
        return;
      }
      if (key === KEY_ARROW_DOWN || key === 'j') {
        cursor = (cursor + 1) % selectable.length;
        render(false);
        return;
      }
    });

    render(true);
  });
}

export async function input(
  question: string,
  options: { masked?: boolean; default?: string } = {},
): Promise<string> {
  return new Promise<string>((resolve) => {
    const stdout = process.stdout;
    let buffer = '';

    const prompt =
      `  ${c.cyan('?')} ${c.bold(question)}` +
      (options.default ? c.dim(` (${options.default})`) : '') +
      ' ';
    stdout.write(prompt);

    const render = (): void => {
      stdout.write('\r' + ANSI.clearLine);
      stdout.write(prompt);
      stdout.write(options.masked ? '•'.repeat(buffer.length) : buffer);
    };

    const session = startRawSession((chunk) => {
      for (const key of chunk) {
        if (key === KEY_CTRL_C) {
          cancelAndExit(session.cleanup);
        }
        if (KEY_ENTER_RETURN.includes(key as (typeof KEY_ENTER_RETURN)[number])) {
          session.cleanup();
          stdout.write('\n');
          resolve(buffer || options.default || '');
          return;
        }
        if (KEY_BACKSPACE.includes(key as (typeof KEY_BACKSPACE)[number])) {
          if (buffer.length > 0) {
            buffer = buffer.slice(0, -1);
            render();
          }
          continue;
        }
        const code = key.charCodeAt(0);
        if (code < 32 || code === 127) continue;
        buffer += key;
        render();
      }
    });

    void session;
  });
}

export async function confirm(question: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? '(Y/n)' : '(y/N)';
  const answer = (await input(`${question} ${hint}`, {})).trim().toLowerCase();
  if (!answer) return defaultYes;
  return answer === 'y' || answer === 'yes';
}
