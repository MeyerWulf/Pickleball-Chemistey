export const STORAGE_KEY='pickleball-intelligence-v1-2';
export function loadState(){try{const raw=localStorage.getItem(STORAGE_KEY);return raw?JSON.parse(raw):null}catch{return null}}
export function saveState(state){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
export function clearState(){localStorage.removeItem(STORAGE_KEY)}
export function uid(prefix='id'){return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`}
