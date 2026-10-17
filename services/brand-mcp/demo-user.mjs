export const DEMO_USER_EMAIL = 'flow-demo@wateraidflow.org';
export const DEMO_USER_PASSWORD = 'local-development-only';
export const DEMO_PROJECT_ID = 'demo-wateraid-flow';
export const DEMO_API_KEY = 'local-emulator';
export const DEMO_EMULATOR_HOST = '127.0.0.1:9099';

async function post(url, body, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, payload };
}

/** Create or refresh the local Auth emulator user and mark the mailbox verified. */
export async function ensureDemoUser({ host = DEMO_EMULATOR_HOST, apiKey = DEMO_API_KEY } = {}) {
  const base = `http://${host}/identitytoolkit.googleapis.com/v1`;
  let created = await post(`${base}/accounts:signUp?key=${encodeURIComponent(apiKey)}`, {
    email: DEMO_USER_EMAIL,
    password: DEMO_USER_PASSWORD,
    returnSecureToken: true,
  });
  if (!created.ok && created.payload.error?.message !== 'EMAIL_EXISTS') {
    throw new Error(created.payload.error?.message || 'The Auth emulator rejected the test user');
  }
  if (!created.ok) {
    created = await post(`${base}/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
      email: DEMO_USER_EMAIL,
      password: DEMO_USER_PASSWORD,
      returnSecureToken: true,
    });
    if (!created.ok) throw new Error(created.payload.error?.message || 'The existing test user could not be signed in');
  }
  const verified = await post(`${base}/accounts:update?key=${encodeURIComponent(apiKey)}`, {
    localId: created.payload.localId,
    emailVerified: true,
  }, { authorization: 'Bearer owner' });
  if (!verified.ok || verified.payload.emailVerified !== true) {
    throw new Error(verified.payload.error?.message || 'The test user email could not be marked verified');
  }
  const refreshed = await post(`${base}/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
    email: DEMO_USER_EMAIL,
    password: DEMO_USER_PASSWORD,
    returnSecureToken: true,
  });
  if (!refreshed.ok) throw new Error(refreshed.payload.error?.message || 'The verified test user could not be signed in');
  return {
    email: DEMO_USER_EMAIL,
    localId: created.payload.localId,
    idToken: refreshed.payload.idToken,
  };
}
