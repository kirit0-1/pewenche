import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const serve = join(root, 'node_modules', 'serve', 'build', 'main.js');

const child = spawn(process.execPath, [serve, '-l', '3000', '--no-port-switching'], {
  cwd: root,
  stdio: 'inherit',
  shell: false,
});

child.on('exit', code => process.exit(code ?? 0));
