// ═══ Storage Engine ═══
const IDB_NAME = 'KingAI24', IDB_STORE = 'kv'
let _idb = null

export async function idbOpen() {
  if (_idb) return _idb
  if (!window.indexedDB) throw new Error('no-idb')
  return new Promise((res, rej) => {
    const r = indexedDB.open(IDB_NAME, 1)
    r.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE)
    r.onsuccess = e => { _idb = e.target.result; res(_idb) }
    r.onerror = () => rej(r.error)
  })
}
export async function idbSet(k, v) {
  try {
    const db = await idbOpen()
    await new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).put(v, k)
      tx.oncomplete = res; tx.onerror = rej
    })
  } catch {}
}
export async function idbGet(k) {
  try {
    const db = await idbOpen()
    return await new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const r = tx.objectStore(IDB_STORE).get(k)
      r.onsuccess = () => res(r.result ?? null)
      r.onerror = rej
    })
  } catch { return null }
}

const _mem = {}
export function lsGet(k) {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null }
  catch { try { return _mem[k] ? JSON.parse(_mem[k]) : null } catch { return null } }
}
export function lsSet(k, v) {
  const s = JSON.stringify(v)
  try { localStorage.setItem(k, s) } catch {}
  _mem[k] = s
}
export function lsDel(k) {
  try { localStorage.removeItem(k) } catch {}
  delete _mem[k]
}
