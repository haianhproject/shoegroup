// Keep the same key through network failure/reload. Only the server decides
// whether this checkout committed; losing its response must not create an order twice.
const STORAGE_KEY = 'shoegroup_checkout_attempt_v1';
let inMemoryAttempt = null;

export const getCheckoutAttempt = (payload) => {
  const fingerprint = JSON.stringify(payload);
  let previous = inMemoryAttempt;
  try { previous = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null') || previous; } catch { /* storage may be unavailable */ }
  if (previous?.fingerprint === fingerprint && previous.key) return previous;
  const key = typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  inMemoryAttempt = { key, fingerprint };
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(inMemoryAttempt)); } catch { /* retain the in-memory key */ }
  return inMemoryAttempt;
};

export const clearCheckoutAttempt = () => {
  inMemoryAttempt = null;
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* optional persistence */ }
};
