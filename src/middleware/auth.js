require('../lib/firebaseAdmin');
const { getAuth } = require('firebase-admin/auth');

const ROLES = ['admin', 'sales_associate', 'developer'];

async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  try {
    const decoded = await getAuth().verifyIdToken(token, true);

    if (decoded.active !== true || !ROLES.includes(decoded.role)) {
      return res.status(403).json({ error: 'Account inactive or unassigned' });
    }

    req.user = { uid: decoded.uid, email: decoded.email, role: decoded.role };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

module.exports = { authenticate, requireRole, ROLES };
