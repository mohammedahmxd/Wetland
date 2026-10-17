const sessionForm = document.querySelector('#session');
const passwordForm = document.querySelector('#password-sign-in');
const status = document.querySelector('#status');
const googleButton = document.querySelector('#sign-in');

function fail(message) {
  status.textContent = message;
  googleButton.disabled = false;
  if (passwordForm) passwordForm.querySelector('button').disabled = false;
}

function domainOf(email) {
  const normalized = email.trim().toLowerCase();
  return normalized.slice(normalized.lastIndexOf('@') + 1);
}

let config;
try {
  const response = await fetch('/auth/config', { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error('config');
  config = await response.json();
} catch {
  googleButton.disabled = true;
  status.textContent = 'Sign-in is not configured on this server.';
  throw new Error('Firebase web config is unavailable');
}

document.querySelector('#domains').textContent = config.allowedDomains.join(' or ');
document.querySelector('#profile').textContent = config.profile;

let cachedAuth;
async function firebaseAuth() {
  if (cachedAuth) return cachedAuth;
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js');
  const authModule = await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js');
  const auth = authModule.getAuth(initializeApp(config.firebase, 'wateraid-mcp'));
  if (config.emulatorHost) authModule.connectAuthEmulator(auth, config.emulatorHost, { disableWarnings: true });
  cachedAuth = { auth, ...authModule };
  return cachedAuth;
}

async function finish(user) {
  const email = (user.email || '').trim().toLowerCase();
  if (user.emailVerified !== true || !config.allowedDomains.includes(domainOf(email))) {
    const { auth, signOut } = await firebaseAuth();
    await signOut(auth);
    fail(`That account is outside ${config.allowedDomains.join(' or ')}.`);
    return;
  }
  document.querySelector('#idToken').value = await user.getIdToken();
  sessionForm.submit();
}

if (!config.firebase) {
  googleButton.disabled = true;
  status.textContent = 'Firebase web configuration is not set for this process.';
} else {
  if (config.passwordSignIn && passwordForm) {
    if (config.demoUser) passwordForm.querySelector('#email').value = config.demoUser;
    passwordForm.addEventListener('submit', async event => {
      event.preventDefault();
      const button = passwordForm.querySelector('button');
      button.disabled = true;
      googleButton.disabled = true;
      status.textContent = 'Checking the email account…';
      try {
        const email = passwordForm.querySelector('#email').value;
        if (!config.allowedDomains.includes(domainOf(email))) {
          fail(`Use a ${config.allowedDomains.join(' or ')} email.`);
          return;
        }
        const { auth, signInWithEmailAndPassword } = await firebaseAuth();
        const result = await signInWithEmailAndPassword(auth, email.trim(), passwordForm.querySelector('#password').value);
        await finish(result.user);
      } catch {
        fail('Email sign-in did not finish. Check the address and password.');
      }
    });
  }
  googleButton.addEventListener('click', async () => {
    googleButton.disabled = true;
    status.textContent = 'Opening Google sign-in…';
    try {
      const { auth, GoogleAuthProvider, signInWithPopup } = await firebaseAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ hd: config.hostedDomain, prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      await finish(result.user);
    } catch {
      fail('Google sign-in did not finish. Try again.');
    }
  });
}
