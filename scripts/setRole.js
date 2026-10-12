require('../src/lib/firebaseAdmin');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const ROLES = ['admin', 'sales_associate', 'developer'];
const [, , email, role, commissionBps] = process.argv;

async function main() {
  if (!email || !ROLES.includes(role)) {
    console.error('Usage: node scripts/setRole.js <email> <admin|sales_associate|developer> [commissionBps]');
    process.exit(1);
  }

  const auth = getAuth();
  const user = await auth.getUserByEmail(email);

  await auth.setCustomUserClaims(user.uid, { role, active: true });
  await auth.revokeRefreshTokens(user.uid);

  const data = {
    email,
    role,
    active: true,
    updated_at: FieldValue.serverTimestamp()
  };
  if (commissionBps !== undefined) {
    data.commission_rate_bps = Number(commissionBps);
  }

  await getFirestore().collection('users').doc(user.uid).set(data, { merge: true });
  console.log(`OK: ${email} -> ${role}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
