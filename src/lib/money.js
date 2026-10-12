const CURRENCIES = ['SCR', 'USD'];

function toMinor(amount) {
  return Math.round(Number(amount) * 100);
}

function fromMinor(minor) {
  return minor / 100;
}

// fxRate = SCR per 1 USD
function convert(amountMinor, from, to, fxRate) {
  if (from === to) return amountMinor;
  if (from === 'USD' && to === 'SCR') return Math.round(amountMinor * fxRate);
  if (from === 'SCR' && to === 'USD') return Math.round(amountMinor / fxRate);
  throw new Error('Unsupported currency conversion');
}

module.exports = { CURRENCIES, toMinor, fromMinor, convert };
