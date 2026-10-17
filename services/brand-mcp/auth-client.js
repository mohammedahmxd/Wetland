const form = document.querySelector('#session');
const status = document.querySelector('#status');
const button = document.querySelector('#sign-in');

function fail(message) {
  status.textContent = message;
  button.disabled = false;
}

let config;
try {
  const response = await fetch('/auth/config', { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error('config');
  config = await response.json();
} catch {
  button.disabled = true;
  status.textContent = 'Sign-in is not configured on this server.';
  throw new Error('Firebase web config is unavailable');
}

document.querySelector('#domains').textContent = config.allowedDomains.join(' or ');
document.querySelector('#profile').textContent = config.profile;

if (!config.firebase) {
  button.disabled = true;
  status.textContent = 'Firebase web configuration is not set for this process.';
} else {
  button.addEventListener('click', async () => {
    button.disabled = true;
    status.textContent = 'Opening Google sign-in…';
    try {
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js');
      const { getAuth, GoogleAuthProvider, signInWithPopup, signOut } = await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js');
      const auth = getAuth(initializeApp(config.firebase, 'wateraid-mcp'));
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ hd: config.hostedDomain, prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const email = (result.user.email || '').trim().toLowerCase();
      const domain = email.slice(email.lastIndexOf('@') + 1);
      if (result.user.emailVerified !== true || !config.allowedDomains.includes(domain)) {
        await signOut(auth);
        fail(`That account is outside ${config.allowedDomains.join(' or ')}.`);
        return;
      }
      document.querySelector('#idToken').value = await result.user.getIdToken();
      form.submit();
    } catch {
      fail('Google sign-in did not finish. Try again.');
    }
  });
}
