import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose';
import { identityFromEmail, resolveEmailPolicy } from './auth-policy.mjs';

const TOKEN = {
  transaction: 'wa-oauth-tx',
  code: 'wa-oauth-code',
  access: 'wa-access',
  refresh: 'wa-refresh',
};
const CLIENT_ID = /^[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]{1,200}$/;
const STATE = /^[\x21-\x7E]{1,200}$/;
const CHALLENGE = /^[A-Za-z0-9_-]{43,128}$/;
const VERIFIER = /^[A-Za-z0-9._~-]{43,128}$/;
const PROJECT_ID = /^[a-z0-9-]{6,30}$/;

const clientJs = readFileSync(new URL('./auth-client.js', import.meta.url), 'utf8');

function publicOrigin(env) {
  const base = new URL(env.PUBLIC_BASE_URL || 'https://wateraid-brand-hub-462504004653.northamerica-northeast2.run.app');
  if (!['http:', 'https:'].includes(base.protocol)) throw new Error('PUBLIC_BASE_URL must be HTTP(S)');
  return { issuer: base.origin, resource: new URL('/mcp', base).href };
}

function testModeAllowed(env) {
  if (env.NODE_ENV === 'production' || env.K_SERVICE || env.AWS_EXECUTION_ENV) {
    throw new Error('AUTH_TEST_MODE is limited to local development');
  }
}

function signingKey(env) {
  const secret = env.AUTH_SIGNING_SECRET;
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('AUTH_SIGNING_SECRET must be at least 32 characters');
  return new TextEncoder().encode(secret);
}

function firebaseProject(env, testMode) {
  const projectId = String(env.FIREBASE_PROJECT_ID || '').trim();
  if (!PROJECT_ID.test(projectId)) throw new Error('FIREBASE_PROJECT_ID must be the Firebase project id');
  const authDomain = String(env.FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`).trim().toLowerCase();
  if (!/^[a-z0-9.-]+$/.test(authDomain)) throw new Error('FIREBASE_AUTH_DOMAIN must be a hostname');
  const apiKey = String(env.FIREBASE_API_KEY || '').trim();
  if (!testMode && !apiKey) throw new Error('FIREBASE_API_KEY is required when Firebase auth is enabled');
  if (apiKey && (apiKey.length > 200 || /\s/.test(apiKey))) throw new Error('FIREBASE_API_KEY is not a usable web API key');
  return { projectId, authDomain, apiKey };
}

function allowedRedirect(value) {
  let url;
  try { url = new URL(value); } catch { return false; }
  if (url.username || url.password || url.hash) return false;
  if (url.protocol !== 'http:') return false;
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
}

function pkce(verifier) {
  if (!VERIFIER.test(verifier)) return '';
  return createHash('sha256').update(verifier).digest('base64url');
}

function same(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function readBody(req, limit = 32768) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('Body too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', ...headers });
  res.end(body);
}

function sendJson(res, status, body, headers = {}) {
  send(res, status, JSON.stringify(body), { 'Content-Type': 'application/json; charset=utf-8', ...headers });
}

function denied(error) {
  return error instanceof Error && (error.message === 'Email is not allowed' || error.message === 'Email is not verified');
}

/**
 * Firebase Google sign-in plus an OAuth authorization-code server for MCP clients.
 * Returns null when no email audience is configured, leaving the public MCP unchanged.
 */
export function loadMcpAuth(env = process.env) {
  const policy = resolveEmailPolicy(env);
  if (!policy) return null;
  const testMode = env.AUTH_TEST_MODE === 'true';
  if (testMode) testModeAllowed(env);
  const key = signingKey(env);
  const { issuer, resource } = publicOrigin(env);
  const firebase = firebaseProject(env, testMode);
  const jwks = testMode ? null : createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
  const usedCodes = new Map();

  async function sign(typ, claims, expiresIn, { subject, audience, withJti = false } = {}) {
    let token = new SignJWT(claims)
      .setProtectedHeader({ alg: 'HS256', typ })
      .setIssuer(issuer)
      .setIssuedAt()
      .setExpirationTime(expiresIn);
    if (subject) token = token.setSubject(subject);
    if (audience) token = token.setAudience(audience);
    if (withJti) token = token.setJti(randomBytes(16).toString('base64url'));
    return token.sign(key);
  }

  async function verify(token, typ, audience) {
    const options = { issuer, algorithms: ['HS256'] };
    if (audience) options.audience = audience;
    const result = await jwtVerify(token, key, options);
    if (result.protectedHeader.typ !== typ) throw new Error('Unexpected token type');
    return result.payload;
  }

  async function verifyFirebaseIdToken(token) {
    const { payload } = await jwtVerify(token, testMode ? key : jwks, {
      issuer: `https://securetoken.google.com/${firebase.projectId}`,
      audience: firebase.projectId,
      algorithms: [testMode ? 'HS256' : 'RS256'],
    });
    const provider = payload.firebase && payload.firebase.sign_in_provider;
    if (provider !== 'google.com') throw new Error('Google sign-in is required');
    const identity = identityFromEmail(payload.email, payload.email_verified === true, policy.domains);
    if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('Missing subject');
    return { sub: payload.sub, email: identity.email };
  }

  function metadata() {
    return {
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/oauth/token`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      scopes_supported: ['mcp'],
      response_modes_supported: ['query'],
    };
  }

  function protectedResource() {
    return {
      resource,
      authorization_servers: [issuer],
      bearer_methods_supported: ['header'],
      scopes_supported: ['mcp'],
    };
  }

  function challenge(res, invalid) {
    const header = `Bearer realm="wateraid-brand-hub", resource_metadata="${issuer}/.well-known/oauth-protected-resource/mcp"${invalid ? ', error="invalid_token"' : ''}`;
    sendJson(res, 401, { error: invalid ? 'invalid_token' : 'invalid_request' }, { 'WWW-Authenticate': header });
  }

  function page(res, status, title, message) {
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p></main></body></html>`;
    send(res, status, html, { 'Content-Type': 'text/html; charset=utf-8' });
  }

  function renderLogin(res, transaction) {
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>Sign in · WaterAid Flow MCP</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F8F0E4;color:#151435;font:16px/1.5 "Noto Sans",system-ui,sans-serif}
  main{width:min(440px,calc(100% - 32px));background:#fff;padding:32px;border-radius:16px}
  h1{font-size:1.4rem;line-height:1.3;margin:0 0 8px}
  p{margin:0 0 16px}
  button{background:#006BD9;color:#fff;border:0;border-radius:999px;padding:12px 18px;font:inherit;font-weight:700;cursor:pointer}
  button:focus-visible{outline:3px solid #151435;outline-offset:2px}
  button:disabled{opacity:.6;cursor:not-allowed}
  #status{min-height:1.5em}
</style>
</head>
<body>
<main>
  <h1>Sign in to the MCP server</h1>
  <p>Use a verified <strong id="domains">${escapeHtml(policy.domains.join(' or '))}</strong> Google account. This server is set to the <span id="profile">${escapeHtml(policy.profile)}</span> audience.</p>
  <form id="session" method="POST" action="/oauth/session">
    <input type="hidden" name="transaction" value="${escapeHtml(transaction)}">
    <input type="hidden" name="idToken" id="idToken" value="">
    <button type="button" id="sign-in">Continue with Google</button>
  </form>
  <p id="status" role="status"></p>
</main>
<script type="module" src="/auth/client.js"></script>
</body>
</html>`;
    send(res, 200, html, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; script-src 'self' https://www.gstatic.com; style-src 'unsafe-inline'; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://apis.google.com; frame-src https://accounts.google.com https://*.google.com https://*.firebaseapp.com; img-src https://www.gstatic.com data:; base-uri 'none'; form-action 'self'",
    });
  }

  async function authorize(req, res) {
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'invalid_request' }, { Allow: 'GET' });
    const params = new URL(req.url, issuer).searchParams;
    const redirectUri = params.get('redirect_uri') || '';
    const state = params.get('state') || '';
    const clientId = params.get('client_id') || '';
    const challengeValue = params.get('code_challenge') || '';
    const redirectOk = allowedRedirect(redirectUri);
    const stateOk = STATE.test(state);
    const invalid = params.get('response_type') !== 'code'
      || params.get('code_challenge_method') !== 'S256'
      || !CLIENT_ID.test(clientId)
      || !CHALLENGE.test(challengeValue)
      || !stateOk
      || (params.get('resource') && params.get('resource') !== resource)
      || (params.get('scope') && params.get('scope') !== 'mcp');
    if (!redirectOk || !stateOk) return page(res, 400, 'Sign-in could not start', 'The return address or state is not allowed.');
    if (invalid) return send(res, 302, '', { Location: errorRedirect(redirectUri, state) });
    const transaction = await sign(TOKEN.transaction, {
      redirect_uri: redirectUri,
      client_id: clientId,
      code_challenge: challengeValue,
      state,
      resource,
    }, '10m');
    renderLogin(res, transaction);
  }

  function errorRedirect(redirectUri, state) {
    const url = new URL(redirectUri);
    url.searchParams.set('error', 'invalid_request');
    url.searchParams.set('state', state);
    return url.href;
  }

  async function session(req, res) {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'invalid_request' }, { Allow: 'POST' });
    const type = String(req.headers['content-type'] || '').split(';')[0].trim();
    const raw = await readBody(req);
    let transaction = '';
    let idToken = '';
    if (type === 'application/json') {
      const body = JSON.parse(raw);
      if (!body || typeof body !== 'object') throw new Error('Invalid session');
      transaction = body.transaction;
      idToken = body.idToken;
    } else if (type === 'application/x-www-form-urlencoded') {
      const body = new URLSearchParams(raw);
      transaction = body.get('transaction') || '';
      idToken = body.get('idToken') || '';
    } else {
      return sendJson(res, 415, { error: 'invalid_request' });
    }
    const pending = await verify(transaction, TOKEN.transaction);
    let user;
    try {
      user = await verifyFirebaseIdToken(idToken);
    } catch (error) {
      if (type === 'application/x-www-form-urlencoded') return page(res, 403, 'Sign-in was rejected', 'A verified organization Google account is required.');
      return sendJson(res, denied(error) ? 403 : 401, { error: 'access_denied', error_description: 'A verified organization Google account is required.' });
    }
    const code = await sign(TOKEN.code, {
      email: user.email,
      redirect_uri: pending.redirect_uri,
      client_id: pending.client_id,
      code_challenge: pending.code_challenge,
    }, '60s', { subject: user.sub, withJti: true });
    const location = new URL(pending.redirect_uri);
    location.searchParams.set('code', code);
    location.searchParams.set('state', pending.state);
    send(res, 302, '', { Location: location.href });
  }

  function consumeCode(jti, exp) {
    const now = Date.now();
    if (!jti || usedCodes.has(jti)) return false;
    usedCodes.set(jti, exp);
    if (usedCodes.size > 5000) {
      for (const [id, expires] of usedCodes) if (expires <= now) usedCodes.delete(id);
    }
    return true;
  }

  async function sendTokens(res, sub, email) {
    const accessToken = await sign(TOKEN.access, { email }, '1h', { subject: sub, audience: resource });
    const refreshToken = await sign(TOKEN.refresh, { email }, '12h', { subject: sub });
    sendJson(res, 200, { access_token: accessToken, token_type: 'Bearer', expires_in: 3600, refresh_token: refreshToken, scope: 'mcp' });
  }

  async function token(req, res) {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'invalid_request' }, { Allow: 'POST' });
    if (!String(req.headers['content-type'] || '').startsWith('application/x-www-form-urlencoded')) return sendJson(res, 415, { error: 'invalid_request' });
    const body = new URLSearchParams(await readBody(req));
    const grant = body.get('grant_type');
    if (grant === 'authorization_code') {
      let payload;
      try {
        payload = await verify(body.get('code') || '', TOKEN.code);
      } catch {
        return sendJson(res, 400, { error: 'invalid_grant' });
      }
      if (payload.client_id !== body.get('client_id') || payload.redirect_uri !== body.get('redirect_uri')) return sendJson(res, 400, { error: 'invalid_grant' });
      const digest = pkce(body.get('code_verifier') || '');
      if (!digest || !same(digest, String(payload.code_challenge))) return sendJson(res, 400, { error: 'invalid_grant' });
      const exp = typeof payload.exp === 'number' ? payload.exp * 1000 : Date.now();
      if (!consumeCode(payload.jti, exp)) return sendJson(res, 400, { error: 'invalid_grant' });
      const identity = identityFromEmail(payload.email, true, policy.domains);
      if (typeof payload.sub !== 'string' || !payload.sub) return sendJson(res, 400, { error: 'invalid_grant' });
      return sendTokens(res, payload.sub, identity.email);
    }
    if (grant === 'refresh_token') {
      let payload;
      try {
        payload = await verify(body.get('refresh_token') || '', TOKEN.refresh);
      } catch {
        return sendJson(res, 400, { error: 'invalid_grant' });
      }
      const identity = identityFromEmail(payload.email, true, policy.domains);
      if (typeof payload.sub !== 'string' || !payload.sub) return sendJson(res, 400, { error: 'invalid_grant' });
      return sendTokens(res, payload.sub, identity.email);
    }
    return sendJson(res, 400, { error: 'unsupported_grant_type' });
  }

  async function allow(req, res) {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      challenge(res, false);
      return false;
    }
    try {
      const payload = await verify(header.slice('Bearer '.length).trim(), TOKEN.access, resource);
      identityFromEmail(payload.email, true, policy.domains);
      if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('Missing subject');
      return true;
    } catch {
      challenge(res, true);
      return false;
    }
  }

  async function handle(req, res, pathname) {
    try {
      if (pathname === '/.well-known/oauth-protected-resource' || pathname === '/.well-known/oauth-protected-resource/mcp') {
        if (req.method !== 'GET' && req.method !== 'HEAD') sendJson(res, 405, { error: 'invalid_request' }, { Allow: 'GET, HEAD' });
        else sendJson(res, 200, protectedResource());
        return true;
      }
      if (pathname === '/.well-known/oauth-authorization-server') {
        if (req.method !== 'GET' && req.method !== 'HEAD') sendJson(res, 405, { error: 'invalid_request' }, { Allow: 'GET, HEAD' });
        else sendJson(res, 200, metadata());
        return true;
      }
      if (pathname === '/auth/config') {
        if (req.method !== 'GET' && req.method !== 'HEAD') sendJson(res, 405, { error: 'invalid_request' }, { Allow: 'GET, HEAD' });
        else sendJson(res, 200, {
          profile: policy.profile,
          allowedDomains: policy.domains,
          hostedDomain: policy.domains[0],
          firebase: firebase.apiKey ? { apiKey: firebase.apiKey, authDomain: firebase.authDomain, projectId: firebase.projectId } : null,
        });
        return true;
      }
      if (pathname === '/auth/client.js') {
        if (req.method !== 'GET' && req.method !== 'HEAD') sendJson(res, 405, { error: 'invalid_request' }, { Allow: 'GET, HEAD' });
        else send(res, 200, req.method === 'HEAD' ? '' : clientJs, { 'Content-Type': 'text/javascript; charset=utf-8' });
        return true;
      }
      if (pathname === '/oauth/authorize') {
        await authorize(req, res);
        return true;
      }
      if (pathname === '/oauth/session') {
        await session(req, res);
        return true;
      }
      if (pathname === '/oauth/token') {
        await token(req, res);
        return true;
      }
      return false;
    } catch (error) {
      if (!res.headersSent) {
        const status = error && error.status === 413 ? 413 : 400;
        sendJson(res, status, { error: 'invalid_request', error_description: 'The request could not be completed.' });
      }
      return true;
    }
  }

  return {
    profile: policy.profile,
    domains: policy.domains,
    resource,
    issuer,
    issueAccessToken({ sub, email }) {
      const allowed = identityFromEmail(email, true, policy.domains);
      return sign(TOKEN.access, { email: allowed.email }, '1h', { subject: sub, audience: resource });
    },
    allow,
    handle,
  };
}

export async function mintTestFirebaseIdToken(env, { sub, email, emailVerified = true, provider = 'google.com' }) {
  if (env.AUTH_TEST_MODE !== 'true') throw new Error('Test Firebase tokens require AUTH_TEST_MODE');
  testModeAllowed(env);
  return new SignJWT({ email, email_verified: emailVerified, firebase: { sign_in_provider: provider } })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(`https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`)
    .setAudience(env.FIREBASE_PROJECT_ID)
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(signingKey(env));
}
