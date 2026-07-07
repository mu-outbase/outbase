import { STORAGE_KEY } from '../config/version.js';

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('OUTBASE storage load failed', error);
    return null;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, savedAt: new Date().toISOString() }));
    return true;
  } catch (error) {
    console.warn('OUTBASE storage save failed', error);
    return false;
  }
}
