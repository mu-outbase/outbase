import { loadState, saveState } from './storage.js';
import { VERSION } from '../config/version.js';

const initialState = {
  version: VERSION,
  currentRoute: 'home',
  nextProject: null,
  activeCandidate: null,
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

function clone(value) {
  try {
    if (typeof structuredClone === 'function') return structuredClone(value);
  } catch (error) {
    console.warn('structuredClone failed', error);
  }
  return JSON.parse(JSON.stringify(value));
}

let state = { ...initialState, ...(loadState() || {}) };
const listeners = new Set();

export function getState() {
  return clone(state);
}

export function patchState(patch) {
  state = { ...state, ...patch, version: VERSION, updatedAt: new Date().toISOString() };
  saveState(state);
  listeners.forEach((listener) => listener(getState()));
}

export function updateState(updater) {
  const nextPatch = updater(getState()) || {};
  patchState(nextPatch);
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
