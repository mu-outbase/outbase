import { loadState, saveState } from './storage.js';
import { VERSION } from '../config/version.js';

const initialState = {
  version: VERSION,
  currentRoute: 'home',
  nextProject: null,
  importCandidates: [],
  walkSession: null,
  reviewQueue: [],
  notes: {
    shopping: [],
    packing: [],
    kota: [],
    reflection: []
  }
};

let state = { ...initialState, ...(loadState() || {}) };
const listeners = new Set();

export function getState() {
  return structuredClone ? structuredClone(state) : JSON.parse(JSON.stringify(state));
}

export function patchState(patch) {
  state = { ...state, ...patch, updatedAt: new Date().toISOString() };
  saveState(state);
  listeners.forEach((listener) => listener(getState()));
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetPrototypeState() {
  state = { ...initialState };
  saveState(state);
  listeners.forEach((listener) => listener(getState()));
}
