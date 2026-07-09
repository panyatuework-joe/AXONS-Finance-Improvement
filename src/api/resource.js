import { simulateRequest } from './http';
import { readTable, writeTable, resetTable } from './storage';

/**
 * A tiny REST-like resource backed by localStorage, wrapped in simulated
 * network latency and occasional failures. Stands in for a real backend
 * (GET /table, PUT /table, POST /table, PUT /table/:id, DELETE /table/:id)
 * so the app's data layer can be swapped for a real API later without
 * touching any component code — only these functions would change.
 */
export function createResource(table, seed) {
  return {
    /** GET /{table} */
    list() {
      return simulateRequest(() => readTable(table, seed), { delayMs: [400, 900] });
    },

    /** PUT /{table} — replaces the whole collection (bulk save). */
    replace(rows) {
      return simulateRequest(
        () => {
          writeTable(table, rows);
          return rows;
        },
        { delayMs: [250, 600], failRate: 0.04 },
      );
    },

    /** POST /{table} */
    create(row) {
      return simulateRequest(
        () => {
          const current = readTable(table, seed);
          writeTable(table, [row, ...current]);
          return row;
        },
        { delayMs: [300, 700], failRate: 0.04 },
      );
    },

    /** PUT /{table}/{id} */
    update(row) {
      return simulateRequest(
        () => {
          const current = readTable(table, seed);
          writeTable(
            table,
            current.map((r) => (r.id === row.id ? row : r)),
          );
          return row;
        },
        { delayMs: [300, 700], failRate: 0.04 },
      );
    },

    /** DELETE /{table}/{id} */
    remove(id) {
      return simulateRequest(
        () => {
          const current = readTable(table, seed);
          writeTable(
            table,
            current.filter((r) => r.id !== id),
          );
        },
        { delayMs: [250, 600], failRate: 0.04 },
      );
    },

    /** Wipes persisted data and restores the original seed (useful for demos/tests). */
    reset() {
      return simulateRequest(() => {
        resetTable(table);
        const seeded = seed();
        writeTable(table, seeded);
        return seeded;
      });
    },
  };
}
