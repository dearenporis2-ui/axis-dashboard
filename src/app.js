require('./lib/firebaseAdmin');
const express = require('express');
const { authenticate, requireRole } = require('./middleware/auth');
const { markLeadWon, HttpError } = require('./services/leadService');
const hoursRouter = require('./routes/hours');

const app = express();
app.use(express.json());

app.get('/api/me', authenticate, (req, res) => {
  res.json({ uid: req.user.uid, role: req.user.role });
});

app.post('/api/leads/:id/won', authenticate, requireRole('admin', 'sales_associate'), async (req, res) => {
  try {
    const { retainerAmountMinor, currency, tier, includedMinutes, renewalDate } = req.body;
    const result = await markLeadWon({
      leadId: req.params.id,
      actor: req.user,
      retainerAmountMinor,
      currency,
      tier,
      includedMinutes,
      renewalDate
    });
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

app.use('/api/hours', hoursRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AXIS API on :${PORT}`));
