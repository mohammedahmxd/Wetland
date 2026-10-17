import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import http from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { identityFromEmail, resolveEmailPolicy } from './auth-policy.mjs';
import { loadMcpAuth, mintTestFirebaseIdToken } from './mcp-auth.mjs';

const secret = 'test-signing-secret-must-be-32-characters';
const projectId = 'wateraid-flow-demo';

function policyEnv(profile, extra = {}) {
  return {
    AUTH_PROFILE: profile,
    AUTH_TEST_MODE: 'true',
    AUTH_SIGNING_SECRET: secret,
    FIREBASE_PROJECT_ID: projectId,
    PUBLIC_BASE_URL: 'http://127.0.0.1:8801',
    ...extra,
  };
}

assert.equal(resolveEmailPolicy({}), null);
assert.deepEqual(resolveEmailPolicy({ AUTH_PROFILE: 'demo' }).domains, ['wateraidflow.org']);
assert.deepEqual(resolveEmailPolicy({ AUTH_PROFILE: 'production' }).domains, ['wateraid.org']);
assert.equal(identityFromEmail('Person@WaterAidFlow.org', true, ['wateraidflow.org']).email, 'person@wateraidflow.org');
assert.throws(() => identityFromEmail('person@wateraid.org', true, ['wateraidflow.org']));
assert.throws(() => identityFromEmail('person@wateraidflow.org.evil.com', true, ['wateraidflow.org']));
assert.throws(() => identityFromEmail('person@evil.wateraidflow.org', true, ['wateraidflow.org']));
assert.throws(() => identityFromEmail('person@wateraidflow.org', false, ['wateraidflow.org']));
assert.throws(() => resolveEmailPolicy({ AUTH_PROFILE: 'staging' }));
assert.throws(() => resolveEmailPolicy({ AUTH_PROFILE: 'demo', AUTH_EMAIL_DOMAINS: 'wateraid.org' }));
assert.deepEqual(resolveEmailPolicy({ AUTH_EMAIL_DOMAINS: 'wateraidflow.org, wateraid.org' }).domains, ['wateraidflow.org', 'wateraid.org']);
assert.throws(() => loadMcpAuth({ AUTH_PROFILE: 'demo' }));
assert.throws(() => loadMcpAuth({ ...policyEnv('demo'), K_SERVICE: 'wateraid-brand-hub' }));
assert.equal(loadMcpAuth({}), null);

function request(method, target, { headers = {}, body } = {}) {
  const url = new URL(target);
  return new Promise((resolve, reject) => {
    const req = http.request({
      method,
      hostname: url.hostname,
      port: url.port,
      path: `${url.pathname}${url.search}`,
      headers,
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function childEnv(port, profile) {
  return {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    PORT: String(port),
    PUBLIC_BASE_URL: `http://127.0.0.1:${port}`,
    AUTH_PROFILE: profile,
    AUTH_TEST_MODE: 'true',
    AUTH_SIGNING_SECRET: secret,
    FIREBASE_PROJECT_ID: projectId,
  };
}

async function start(port, profile) {
  const child = spawn(process.execPath, ['server.mjs'], { env: childEnv(port, profile), stdio: ['ignore', 'pipe', 'inherit'] });
  await Promise.race([
    once(child.stdout, 'data'),
    once(child, 'exit').then(() => { throw new Error('Server exited'); }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Startup timeout')), 5000).unref()),
  ]);
  return child;
}

async function login(base, env, email) {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const redirectUri = 'http://127.0.0.1:9/callback';
  const state = 'state-123';
  const authorize = await request('GET', `${base}/oauth/authorize?response_type=code&client_id=cursor-test&redirect_uri=${encodeURIComponent(redirectUri)}&code_challenge=${challenge}&code_challenge_method=S256&state=${state}&scope=mcp&resource=${encodeURIComponent(`${base}/mcp`)}`);
  assert.equal(authorize.status, 200);
  const transaction = authorize.body.match(/name="transaction" value="([^"]+)"/)[1];
  const idToken = await mintTestFirebaseIdToken(env, { sub: `uid-${email}`, email, emailVerified: true });
  const session = await request('POST', `${base}/oauth/session`, {
    headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(JSON.stringify({ transaction, idToken })) },
    body: JSON.stringify({ transaction, idToken }),
  });
  assert.equal(session.status, 302, session.body);
  const location = new URL(session.headers.location);
  assert.equal(location.searchParams.get('state'), state);
  const exchanged = await request('POST', `${base}/oauth/token`, {
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: location.searchParams.get('code'),
      code_verifier: verifier,
      redirect_uri: redirectUri,
      client_id: 'cursor-test',
    }).toString(),
  });
  assert.equal(exchanged.status, 200, exchanged.body);
  const tokens = JSON.parse(exchanged.body);
  const replay = await request('POST', `${base}/oauth/token`, {
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: location.searchParams.get('code'),
      code_verifier: verifier,
      redirect_uri: redirectUri,
      client_id: 'cursor-test',
    }).toString(),
  });
  assert.equal(replay.status, 400);
  return tokens;
}

const demoPort = 8801;
const demo = await start(demoPort, 'demo');
const demoBase = `http://127.0.0.1:${demoPort}`;
const demoEnv = childEnv(demoPort, 'demo');
try {
  const health = await request('GET', `${demoBase}/api/health`);
  assert.equal(JSON.parse(health.body).auth.profile, 'demo');
  assert.deepEqual(JSON.parse(health.body).auth.emailDomains, ['wateraidflow.org']);
  const metadata = await request('GET', `${demoBase}/.well-known/oauth-protected-resource/mcp`);
  assert.equal(JSON.parse(metadata.body).resource, `${demoBase}/mcp`);
  const page = await request('GET', `${demoBase}/oauth/authorize?response_type=code&client_id=cursor-test&redirect_uri=${encodeURIComponent('http://127.0.0.1:9/callback')}&code_challenge=${'a'.repeat(43)}&code_challenge_method=S256&state=state-123&scope=mcp`);
  assert.match(page.body, /wateraidflow\.org/);
  assert.match(page.body, /id="profile">demo</);
  const open = await request('GET', `${demoBase}/oauth/authorize?response_type=code&client_id=cursor-test&redirect_uri=${encodeURIComponent('https://evil.example/callback')}&code_challenge=${'a'.repeat(43)}&code_challenge_method=S256&state=state-123`);
  assert.equal(open.status, 400);

  const missing = await request('POST', `${demoBase}/mcp`, { headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(missing.status, 401);
  assert.match(missing.headers['www-authenticate'], /resource_metadata=/);

  const outsider = await mintTestFirebaseIdToken(demoEnv, { sub: 'outsider', email: 'person@wateraid.org', emailVerified: true });
  const rejected = await request('POST', `${demoBase}/oauth/session`, {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ transaction: page.body.match(/name="transaction" value="([^"]+)"/)[1], idToken: outsider }),
  });
  assert.equal(rejected.status, 403);

  const unverified = await mintTestFirebaseIdToken(demoEnv, { sub: 'unverified', email: 'person@wateraidflow.org', emailVerified: false });
  const unverifiedResponse = await request('POST', `${demoBase}/oauth/session`, {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ transaction: page.body.match(/name="transaction" value="([^"]+)"/)[1], idToken: unverified }),
  });
  assert.equal(unverifiedResponse.status, 403);

  const tokens = await login(demoBase, demoEnv, 'person@wateraidflow.org');
  const client = new Client({ name: 'brand-auth-test', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${demoBase}/mcp`), { requestInit: { headers: { Authorization: `Bearer ${tokens.access_token}` } } }));
  const tools = await client.listTools();
  assert.equal(tools.tools.length, 5);
  await client.close();

  const refreshed = await request('POST', `${demoBase}/oauth/token`, {
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token }).toString(),
  });
  assert.equal(refreshed.status, 200);

  const productionIssuer = loadMcpAuth(policyEnv('production', { PUBLIC_BASE_URL: demoBase }));
  const wrongAudience = await productionIssuer.issueAccessToken({ sub: 'other', email: 'person@wateraid.org' });
  const blocked = await request('POST', `${demoBase}/mcp`, { headers: { authorization: `Bearer ${wrongAudience}` }, body: '{}' });
  assert.equal(blocked.status, 401);

  const badVerifier = randomBytes(32).toString('base64url');
  const badChallenge = createHash('sha256').update(badVerifier).digest('base64url');
  const authorize = await request('GET', `${demoBase}/oauth/authorize?response_type=code&client_id=cursor-test&redirect_uri=${encodeURIComponent('http://127.0.0.1:9/callback')}&code_challenge=${badChallenge}&code_challenge_method=S256&state=state-123`);
  const transaction = authorize.body.match(/name="transaction" value="([^"]+)"/)[1];
  const idToken = await mintTestFirebaseIdToken(demoEnv, { sub: 'pkce', email: 'person@wateraidflow.org' });
  const session = await request('POST', `${demoBase}/oauth/session`, {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ transaction, idToken }),
  });
  const code = new URL(session.headers.location).searchParams.get('code');
  const pkceFail = await request('POST', `${demoBase}/oauth/token`, {
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: randomBytes(32).toString('base64url'),
      redirect_uri: 'http://127.0.0.1:9/callback',
      client_id: 'cursor-test',
    }).toString(),
  });
  assert.equal(pkceFail.status, 400);
} finally {
  demo.kill('SIGTERM');
}

const productionPort = 8802;
const production = await start(productionPort, 'production');
const productionBase = `http://127.0.0.1:${productionPort}`;
try {
  const page = await request('GET', `${productionBase}/oauth/authorize?response_type=code&client_id=cursor-test&redirect_uri=${encodeURIComponent('http://127.0.0.1:9/callback')}&code_challenge=${'b'.repeat(43)}&code_challenge_method=S256&state=state-123`);
  assert.match(page.body, /wateraid\.org/);
  assert.doesNotMatch(page.body, /wateraidflow\.org/);
  const tokens = await login(productionBase, childEnv(productionPort, 'production'), 'person@wateraid.org');
  const accepted = await request('GET', `${productionBase}/.well-known/oauth-authorization-server`);
  assert.equal(JSON.parse(accepted.body).token_endpoint, `${productionBase}/oauth/token`);
  const call = await request('POST', `${productionBase}/mcp`, {
    headers: { authorization: `Bearer ${tokens.access_token}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'auth-test', version: '1.0.0' } } }),
  });
  assert.equal(call.status, 200, call.body);
  const demoToken = await mintTestFirebaseIdToken(childEnv(productionPort, 'production'), { sub: 'demo-user', email: 'person@wateraidflow.org' });
  const transaction = page.body.match(/name="transaction" value="([^"]+)"/)[1];
  const rejected = await request('POST', `${productionBase}/oauth/session`, {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ transaction, idToken: demoToken }),
  });
  assert.equal(rejected.status, 403);
} finally {
  production.kill('SIGTERM');
}

console.log('PASS: Firebase audience switch, verified domain gate, OAuth PKCE, and authenticated MCP.');
