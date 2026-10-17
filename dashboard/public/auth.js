import { identityFromEmail, providerAllowed } from './auth-policy.js';

const FIREBASE_VERSION = '12.4.0';
let hooks = { onAdmit() {}, onReject() {} };
let config = null;
let authBundle = null;
let admitted = false;
let notice = '';

function app() {
  return document.querySelector('#app');
}

function audience() {
  return (config?.allowedDomains || []).join(' or ') || 'an approved';
}

export async function signOutSession() {
  if (!authBundle) return;
  await authBundle.signOut(authBundle.auth);
}

async function bundle() {
  if (authBundle) return authBundle;
  const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`);
  const authModule = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`);
  const auth = authModule.getAuth(initializeApp(config.firebase, 'wateraid-dashboard'));
  authBundle = { auth, ...authModule };
  return authBundle;
}

function gateHtml() {
  const emailCard = config?.passwordSignIn ? `<article class="card"><h2>Email fallback</h2><p>For the demo account when Google is unavailable.</p><form id="password-sign-in"><div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="username" required></div><div class="field"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required></div><button class="btn" type="submit">Sign in with email</button></form></article>` : '';
  return `<aside class="sidebar" id="workspace-sidebar"><div class="brand"><img src="assets/wateraid-logo.png" alt="WaterAid brand reference"><span class="project">WETLAND</span><small>MCP hub & resource library</small></div><div class="side-bottom"><p>Built for people.<br/>Maintained by a community.</p><p>Independent demonstration.<br/>Not a WaterAid-endorsed service.</p></div></aside><div class="shell"><header class="topbar"><div class="breadcrumb">Wetland <span style="padding:0 8px">/</span><b>Sign in</b></div></header><main id="main" tabindex="-1"><div class="page-head"><div><p class="eyebrow">WETLAND</p><h1>Sign in to the workspace.</h1><p class="subtitle">Use a verified <span id="audience"></span> account. The hub opens after sign-in.</p></div></div><section class="hero"><div class="hero-copy"><p class="eyebrow">YOUR WORKSPACE</p><h2>The same hub.<br/>Your account.</h2><p>Google is the usual path. The demo can also use the email account created for this workspace.</p></div></section><div class="grid two"><article class="card"><h2>Google</h2><p>Continue with the Google account for your <span class="audience-copy"></span> address.</p><button id="google-sign-in" class="btn lime" type="button">Continue with Google</button><p id="auth-status" class="auth-status" role="status"></p></article>${emailCard}</div></main></div>`;
}

function showGate(message = '') {
  if (admitted) {
    admitted = false;
    hooks.onReject();
  }
  const next = message || notice;
  notice = '';
  app().innerHTML = gateHtml();
  const label = audience();
  const slot = document.querySelector('#audience');
  if (slot) slot.textContent = label;
  document.querySelectorAll('.audience-copy').forEach(node => { node.textContent = label; });
  const status = document.querySelector('#auth-status');
  if (next) status.textContent = next;
  wireGate();
}

function wireGate() {
  const google = document.querySelector('#google-sign-in');
  const password = document.querySelector('#password-sign-in');
  if (!config?.firebase) {
    if (google) google.disabled = true;
    if (password) password.querySelector('button').disabled = true;
    document.querySelector('#auth-status').textContent = document.querySelector('#auth-status').textContent || 'Sign-in is not configured on this server.';
    return;
  }
  if (password && config.demoUser) password.querySelector('#email').value = config.demoUser;
  google.addEventListener('click', async () => {
    google.disabled = true;
    document.querySelector('#auth-status').textContent = 'Opening Google sign-in…';
    try {
      const { auth, GoogleAuthProvider, signInWithPopup } = await bundle();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ hd: config.hostedDomain, prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch {
      showGate(password ? 'Google sign-in did not finish. Use the email fallback, or try again.' : 'Google sign-in did not finish. Try again.');
    }
  });
  password?.addEventListener('submit', async event => {
    event.preventDefault();
    const button = password.querySelector('button');
    button.disabled = true;
    google.disabled = true;
    document.querySelector('#auth-status').textContent = 'Checking the email account…';
    try {
      const { auth, signInWithEmailAndPassword } = await bundle();
      await signInWithEmailAndPassword(auth, password.querySelector('#email').value.trim(), password.querySelector('#password').value);
    } catch {
      showGate('Email sign-in did not finish. Check the address and password.');
    }
  });
}

async function admit(user) {
  try {
    const { auth, signOut } = await bundle();
    const token = await user.getIdTokenResult();
    if (!providerAllowed(config.profile, token.signInProvider)) {
      notice = 'That sign-in method is not available for this workspace.';
      await signOut(auth);
      return;
    }
    const identity = identityFromEmail(user.email, user.emailVerified === true, config.allowedDomains);
    if (!admitted) {
      admitted = true;
      hooks.onAdmit({ email: identity.email });
    }
  } catch (error) {
    notice = error?.message === 'Email is not verified' || error?.message === 'Email is not allowed'
      ? `Use a verified ${audience()} account.`
      : 'Sign-in did not finish.';
    try {
      const { auth, signOut } = await bundle();
      await signOut(auth);
    } catch {
      showGate(notice);
    }
  }
}

export async function bindDashboardAuth(next) {
  hooks = next;
  app().innerHTML = '<div class="shell"><main id="main" tabindex="-1"><p class="subtitle">Checking your session…</p></main></div>';
  try {
    const response = await fetch('/auth/config', { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error('config');
    config = await response.json();
  } catch {
    config = null;
    showGate('Sign-in is not configured on this server.');
    return;
  }
  if (!config.firebase) {
    showGate('Sign-in is not configured on this server.');
    return;
  }
  const { auth, onAuthStateChanged } = await bundle();
  onAuthStateChanged(auth, user => {
    if (user) admit(user);
    else showGate();
  });
}
