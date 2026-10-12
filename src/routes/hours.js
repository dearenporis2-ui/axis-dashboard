require('../lib/firebaseAdmin');
const express = require('express');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const db = getFirestore();

router.post('/', authenticate, requireRole('admin', 'developer'), async (req, res) => {
  const { clientId, minutes, date, note } = req.body || {};

  if (typeof clientId !== 'string' || !clientId) {
    return res.status(400).json({ error: 'clientId is required' });
  }
  if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 1440) {
    return res.status(400).json({ error: 'minutes must be an integer between 1 and 1440' });
  }
  const logDate = new Date(date);
  if (Number.isNaN(logDate.getTime())) {
    return res.status(400).json({ error: 'Invalid date' });
  }

  const clientRef = db.collection('clients').doc(clientId);
  const logRef = db.collection('hour_logs').doc();

  try {
    const result = await db.runTransaction(async (tx) => {
      const clientSnap = await tx.get(clientRef);
      if (!clientSnap.exists) {
        const err = new Error('Client not found');
        err.status = 404;
        throw err;
      }

      const client = clientSnap.data();
      const assigned = client.assigned_developer_uids || [];

      if (req.user.role === 'developer' && !assigned.includes(req.user.uid)) {
        const err = new Error('Not assigned to this client');
        err.status = 403;
        throw err;
      }

      const usedBefore = client.used_minutes || 0;
      const usedAfter = usedBefore + minutes;

      tx.set(logRef, {
        client_id: clientId,
        dev_uid: req.user.uid,
        minutes,
        date: Timestamp.fromDate(logDate),
        note: typeof note === 'string' ? note.slice(0, 500) : '',
        created_at: FieldValue.serverTimestamp()
      });

      tx.update(clientRef, {
        used_minutes: usedAfter,
        updated_at: FieldValue.serverTimestamp()
      });

      return {
        logId: logRef.id,
        usedMinutes: usedAfter,
        includedMinutes: client.included_minutes || 0,
        overBudget: usedAfter > (client.included_minutes || 0)
      };
    });

    return res.status(201).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/', authenticate, requireRole('admin', 'developer'), async (req, res) => {
  const { clientId } = req.query;

  try {
    let query = db.collection('hour_logs');

    if (req.user.role === 'developer') {
      query = query.where('dev_uid', '==', req.user.uid);
    }
    if (clientId) {
      query = query.where('client_id', '==', String(clientId));
    }

    const snap = await query.orderBy('date', 'desc').limit(200).get();
    const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return res.json({ logs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
