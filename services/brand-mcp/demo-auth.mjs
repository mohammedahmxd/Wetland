import { createHash, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { DEMO_API_KEY, DEMO_EMULATOR_HOST, DEMO_PROJECT_ID, DEMO_USER_EMAIL, DEMO_USER_PASSWORD, ensureDemoUser } from './demo-user.mjs';

const port = process.env.PORT || '8080';
const origin = `http://127.0.0.1:${port}`;
const signingSecret = process.env.AUTH_SIGNING_SECRET || 'local-development-only-signing-secret';

function waitForEmulator() {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`http://${DEMO_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${DEMO_API_KEY}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        });
        if (response.headers.get('content-type')?.includes('json')) {
          clearInterval(timer);
          resolve();
        }
      } catch {
        if (Date.now() - started > 60000) {
          clearInterval(timer);
          reject(new Error('The Auth emulator did not start'));
        }
      }
    }, 500);
  });
}

const emulator = spawn('npx', ['-y', 'firebase-tools@latest', 'emulators:start', '--only', 'auth', '--project', DEMO_PROJECT_ID], {
  stdio: ['ignore', 'inherit', 'inherit'],
});

let server;
const shutdown = () => {
  if (server) server.kill('SIGTERM');
  emulator.kill('SIGTERM');
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

try {
  await waitForEmulator();
  const user = await ensureDemoUser();
  server = spawn(process.execPath, ['server.mjs'], {
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      PORT: port,
      PUBLIC_BASE_URL: origin,
      AUTH_PROFILE: 'demo',
      FIREBASE_PROJECT_ID: DEMO_PROJECT_ID,
      FIREBASE_API_KEY: DEMO_API_KEY,
      FIREBASE_AUTH_EMULATOR_HOST: DEMO_EMULATOR_HOST,
      AUTH_SIGNING_SECRET: signingSecret,
    },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const redirect = encodeURIComponent(`${origin}/auth/demo-complete`);
  console.log(`Test user: ${user.email}`);
  console.log(`Password: ${DEMO_USER_PASSWORD}`);
  console.log(`Local id: ${user.localId}`);
  console.log(`PKCE verifier: ${verifier}`);
  console.log(`Sign in: ${origin}/oauth/authorize?response_type=code&client_id=local-demo&redirect_uri=${redirect}&code_challenge=${challenge}&code_challenge_method=S256&state=local-demo&scope=mcp`);
  server.on('exit', () => emulator.kill('SIGTERM'));
  await once(server, 'exit');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  shutdown();
  process.exitCode = 1;
}
