import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { emptyState } from '../shared/domain.js';

export class Store {
  constructor(path) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id=1), body TEXT NOT NULL);');
    this.db.prepare('INSERT OR IGNORE INTO app_state(id,body) VALUES(1,?)').run(JSON.stringify(emptyState()));
  }
  read() { return JSON.parse(this.db.prepare('SELECT body FROM app_state WHERE id=1').get().body); }
  mutate(operation) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const state = this.read();
      const result = operation(state);
      state.revision++;
      this.db.prepare('UPDATE app_state SET body=? WHERE id=1').run(JSON.stringify(state));
      this.db.exec('COMMIT');
      return { state, result };
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  close() { this.db.close(); }
}
