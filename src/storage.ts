// @ts-nocheck

// localStorage can be missing, full, or blocked (private browsing, embedded frames).
// Every read and write goes through here so storage trouble never stops the game.
export const storage = {
  get(key) {
    try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
  },
  set(key, value) {
    try { globalThis.localStorage?.setItem(key, value); return true; } catch { return false; }
  },
  remove(key) {
    try { globalThis.localStorage?.removeItem(key); } catch {}
  },
  getJSON(key, fallback) {
    try { const raw = this.get(key); return raw == null ? fallback : (JSON.parse(raw) ?? fallback); } catch { return fallback; }
  },
  setJSON(key, value) { return this.set(key, JSON.stringify(value)); }
};
