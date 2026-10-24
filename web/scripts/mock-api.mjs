import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import YAML from 'yaml';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contract = YAML.parse(await readFile(resolve(webRoot, '../contract/openapi.yaml'), 'utf8'));
// Development-only response examples. The authoritative OpenAPI is never changed.
// Prism validates request shapes; it does not authenticate passwords or implement roles.
const user = {
  id: 'a2222222-2222-4222-8222-222222222222',
  email: 'owner@stockwise.demo',
  displayName: 'Demo Owner',
  role: 'OWNER',
};
const session = {
  accessToken: 'stockwise-contract-mock-token',
  tokenType: 'Bearer',
  expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  user,
};
contract.paths['/auth/sessions'].post.responses['201'].content['application/json'].example = session;
contract.paths['/me'].get.responses['200'].content['application/json'].example = user;
const mockDirectory = resolve(webRoot, '.mock');
await mkdir(mockDirectory, { recursive: true });
const mockPath = resolve(mockDirectory, 'openapi.yaml');
await writeFile(mockPath, YAML.stringify(contract));
if (process.argv.includes('--prepare-only')) {
  console.log('Prepared contract mock with a consistent user and an unexpired eight-hour session.');
} else {
  const require = createRequire(import.meta.url);
  const packagePath = require.resolve('@stoplight/prism-cli/package.json');
  const prismPackage = JSON.parse(await readFile(packagePath, 'utf8'));
  const prismEntry = resolve(dirname(packagePath), typeof prismPackage.bin === 'string' ? prismPackage.bin : prismPackage.bin.prism);
  console.log('Contract mock only: fixed OWNER fixture; no real account is authenticated. Public example inputs are in .env.example.');
  const child = spawn(process.execPath, [prismEntry, 'mock', mockPath, '--host', '127.0.0.1', '--port', '4710'], { stdio: 'inherit' });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { child.kill(); });
  child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
  child.on('exit', (code) => { process.exitCode = code ?? 0; });
}
