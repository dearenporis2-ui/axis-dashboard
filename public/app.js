import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDENyBOdBSW0Ifj0MIfQTX6rIMXH9cW2ws',
  authDomain: 'axis-dashboard-c9901.firebaseapp.com',
  projectId: 'axis-dashboard-c9901',
  storageBucket: 'axis-dashboard-c9901.firebasestorage.app',
  messagingSenderId: '670124804029',
  appId: '1:670124804029:web:d4c70b1744352b00fb74d4'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const NAV = [
  { id: 'overview', label: 'Overview', roles: ['admin'] },
  { id: 'clients', label: 'Clients', roles: ['admin', 'developer'] },
  { id: 'pipeline', label: 'Lead Pipeline', roles: ['admin', 'sales_associate'] },
  { id: 'hours', label: 'Hour Logs', roles: ['admin', 'developer'] },
  { id: 'commissions', label: 'My Commissions', roles: ['sales_associate'] },
  { id: 'settings', label: 'Settings', roles: ['admin'] }
];

const el = {
  login: document.getElementById('login-view'),
  appView: document.getElementById('app-view'),
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  loginBtn: document.getElementById('login-btn'),
  loginError: document.getElementById('login-error'),
  logoutBtn: document.getElementById('logout-btn'),
  nav: document.getElementById('nav'),
  title: document.getElementById('page-title'),
  body: document.getElementById('page-body'),
  userLabel: document.getElementById('user-label'),
  fxRate: document.getElementById('fx-rate'),
  fxToggle: document.getElementById('fx-toggle')
};

let currentRole = null;
let showUsd = false;
let fxScrPerUsd = null;

el.loginBtn.addEventListener('click', async () => {
  el.loginError.textContent = '';
  try {
    await signInWithEmailAndPassword(auth, el.email.value.trim(), el.password.value);
  } catch (err) {
    el.loginError.textContent = 'Sign-in failed. Check your email and password.';
  }
});

el.password.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') el.loginBtn.click();
});

el.logoutBtn.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showLogin();
    return;
  }

  const tokenResult = await user.getIdTokenResult(true);
  const role = tokenResult.claims.role;
  const active = tokenResult.claims.active === true;

  if (!active || !role) {
    el.loginError.textContent = 'This account has no active role. Contact an administrator.';
    await signOut(auth);
    showLogin();
    return;
  }

  currentRole = role;
  el.userLabel.textContent = `${user.email} · ${role.replace('_', ' ')}`;
  renderNav();
  await loadFxRate();
  showApp();
  navigate(location.hash.slice(1) || NAV.find((n) => n.roles.includes(role)).id);
});

function showLogin() {
  el.appView.classList.add('hidden');
  el.login.classList.remove('hidden');
  el.password.value = '';
}

function showApp() {
  el.login.classList.add('hidden');
  el.appView.classList.remove('hidden');
}

function renderNav() {
  el.nav.innerHTML = '';
  NAV.filter((item) => item.roles.includes(currentRole)).forEach((item) => {
    const a = document.createElement('a');
    a.href = `#${item.id}`;
    a.textContent = item.label;
    a.dataset.id = item.id;
    el.nav.appendChild(a);
  });
}

function navigate(id) {
  const item = NAV.find((n) => n.id === id);
  if (!item || !item.roles.includes(currentRole)) {
    el.title.textContent = 'Access denied';
    el.body.innerHTML = '<p class="muted">You do not have permission to view this page.</p>';
    return;
  }

  el.title.textContent = item.label;
  el.nav.querySelectorAll('a').forEach((a) => {
    a.classList.toggle('active', a.dataset.id === id);
  });

  el.body.innerHTML = '';
  const placeholder = document.createElement('div');
  placeholder.className = 'card';
  placeholder.innerHTML = `
    <div class="label">${item.label}</div>
    <p class="muted">This module is part of the next build step.</p>
  `;
  el.body.appendChild(placeholder);
}

window.addEventListener('hashchange', () => {
  if (!currentRole) return;
  navigate(location.hash.slice(1));
});

async function loadFxRate() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'fx'));
    fxScrPerUsd = snap.exists() ? snap.data().scr_per_usd : null;
  } catch {
    fxScrPerUsd = null;
  }
  renderFx();
}

function renderFx() {
  if (fxScrPerUsd == null) {
    el.fxRate.textContent = 'not set';
    return;
  }
  el.fxRate.textContent = showUsd
    ? `${(1 / fxScrPerUsd).toFixed(4)} USD per SCR`
    : fxScrPerUsd.toFixed(2);
}

el.fxToggle.addEventListener('click', () => {
  showUsd = !showUsd;
  el.fxToggle.textContent = showUsd ? 'Show in SCR' : 'Show in USD';
  renderFx();
});
