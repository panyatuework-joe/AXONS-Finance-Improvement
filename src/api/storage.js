const NAMESPACE = 'axons-finance-db';

/**
 * Stand-in for a backend database: persists each "table" to localStorage so
 * data survives page reloads, and seeds it on first use.
 */
export function readTable(table, seed) {
  try {
    const raw = localStorage.getItem(`${NAMESPACE}:${table}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // corrupted storage — fall through and reseed
  }
  const seeded = seed();
  writeTable(table, seeded);
  return seeded;
}

export function writeTable(table, value) {
  localStorage.setItem(`${NAMESPACE}:${table}`, JSON.stringify(value));
}

export function resetTable(table) {
  localStorage.removeItem(`${NAMESPACE}:${table}`);
}
