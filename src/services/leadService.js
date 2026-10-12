require('../lib/firebaseAdmin');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { CURRENCIES } = require('../lib/money');

const db = getFirestore();

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function markLeadWon({
  leadId,
  actor,
  retainerAmountMinor,
  currency,
  tier,
  includedMinutes,
  renewalDate
}) {
  if (!CURRENCIES.includes(currency)) throw new HttpError(400, 'Unsupported currency');
  if (!Number.isInteger(retainerAmountMinor) || retainerAmountMinor <= 0) {
    throw new HttpError(400, 'Invalid retainer amount');
  }
  if (!Number.isInteger(includedMinutes) || includedMinutes < 0) {
    throw new HttpError(400, 'Invalid included minutes');
  }
  const renewal = new Date(renewalDate);
  if (Number.isNaN(renewal.getTime())) throw new HttpError(400, 'Invalid renewal date');

  const leadRef = db.collection('leads').doc(leadId);
  const clientRef = db.collection('clients').doc();
  const billingRef = db.collection('client_billing').doc(clientRef.id);
  const commissionRef = db.collection('commissions').doc();

  return db.runTransaction(async (tx) => {
    const leadSnap = await tx.get(leadRef);
    if (!leadSnap.exists) throw new HttpError(404, 'Lead not found');

    const lead = leadSnap.data();
    if (lead.status === 'won') throw new HttpError(409, 'Lead already won');
    if (actor.role === 'sales_associate' && lead.owner_uid !== actor.uid) {
      throw new HttpError(403, 'Not your lead');
    }

    let commissionRateBps = 0;
    let salesRef = null;
    if (lead.owner_uid) {
      salesRef = db.collection('users').doc(lead.owner_uid);
      const salesSnap = await tx.get(salesRef);
      commissionRateBps = salesSnap.get('commission_rate_bps') ?? 0;
    }

    const earnedMinor = Math.round((retainerAmountMinor * commissionRateBps) / 10000);

    tx.set(clientRef, {
      name: lead.company_name,
      domain: lead.domain ?? null,
      tier,
      included_minutes: includedMinutes,
      used_minutes: 0,
      assigned_developer_uids: [],
      lead_id: leadId,
      status_color: 'amber',
      uptime_status: null,
      backup_status: null,
      security_status: null,
      last_backup_date: null,
      security_check_passed: null,
      health_updated_at: null,
      created_at: FieldValue.serverTimestamp()
    });

    tx.set(billingRef, {
      retainer_amount_minor: retainerAmountMinor,
      currency,
      next_renewal_date: Timestamp.fromDate(renewal),
      payment_status: 'Pending',
      updated_at: FieldValue.serverTimestamp()
    });

    tx.set(commissionRef, {
      sales_uid: lead.owner_uid ?? null,
      lead_id: leadId,
      client_id: clientRef.id,
      retainer_amount_minor: retainerAmountMinor,
      currency,
      commission_rate_bps: commissionRateBps,
      earned_commission_minor: earnedMinor,
      created_at: FieldValue.serverTimestamp()
    });

    if (salesRef && earnedMinor > 0) {
      tx.update(salesRef, {
        [`pending_commission.${currency}`]: FieldValue.increment(earnedMinor)
      });
    }

    tx.update(leadRef, {
      status: 'won',
      converted_client_id: clientRef.id,
      updated_at: FieldValue.serverTimestamp()
    });

    return {
      clientId: clientRef.id,
      commissionId: commissionRef.id,
      earnedMinor
    };
  });
}

module.exports = { markLeadWon, HttpError };
