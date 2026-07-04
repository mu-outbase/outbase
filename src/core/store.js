import { loadState, saveState } from './storage.js?v=core06-04-record-field-ux-20260704';
import { VERSION } from '../config/version.js?v=core06-04-record-field-ux-20260704';

const initialState = {
  version: VERSION,
  currentRoute: 'home',
  nextProject: null,
  activeCandidate: null,
  importCandidates: [],
  prepContext: {
    weatherMemo: '',
    highTemp: '',
    lowTemp: '',
    rainRisk: '',
    windMemo: '',
    peopleCount: '2',
    kotaGoing: 'yes',
    menuMemo: '',
    routeMemo: '',
    setupMemo: '',
    campgroundSearchMemo: '',
    pastReflection: '',
    gearMemo: ''
  },
  walkSession: null,
  recordHistory: [],
  selectedRecordSessionId: null,
  reviewQueue: [],
  appliedReviewQueue: [],
  calendarEvents: [],
  calendarCursor: '',
  selectedDate: '',
  calendarAddOpen: false,
  notificationPermission: 'unknown',
  calendarReminderNotified: {},
  mvpBetaCheck: {
    steps: { prep: 'unchecked', line: 'unchecked', record: 'unchecked', review: 'unchecked', want: 'unchecked' },
    memo: '',
    updatedAt: null
  },
  notes: { shopping: [], packing: [], kota: [], reflection: [] }
};

function clone(value) {
  try { if (typeof structuredClone === 'function') return structuredClone(value); } catch (error) { console.warn('structuredClone failed', error); }
  return JSON.parse(JSON.stringify(value));
}

function normalizeLoadedState(loaded) {
  const merged = { ...initialState, ...(loaded || {}) };
  merged.prepContext = { ...initialState.prepContext, ...(loaded?.prepContext || {}) };
  merged.notes = { ...initialState.notes, ...(loaded?.notes || {}) };
  merged.recordHistory = Array.isArray(loaded?.recordHistory) ? loaded.recordHistory : [];
  merged.reviewQueue = Array.isArray(loaded?.reviewQueue) ? loaded.reviewQueue : [];
  merged.appliedReviewQueue = Array.isArray(loaded?.appliedReviewQueue) ? loaded.appliedReviewQueue : [];
  merged.calendarEvents = Array.isArray(loaded?.calendarEvents) ? loaded.calendarEvents : [];
  merged.calendarCursor = loaded?.calendarCursor || '';
  merged.selectedDate = loaded?.selectedDate || '';
  merged.calendarAddOpen = Boolean(loaded?.calendarAddOpen);
  merged.notificationPermission = loaded?.notificationPermission || 'unknown';
  merged.calendarReminderNotified = loaded?.calendarReminderNotified || {};
  merged.mvpBetaCheck = { ...initialState.mvpBetaCheck, ...(loaded?.mvpBetaCheck || {}), steps: { ...initialState.mvpBetaCheck.steps, ...(loaded?.mvpBetaCheck?.steps || {}) } };
  if (loaded?.walkSession && loaded.walkSession.status === 'active') merged.walkSession = loaded.walkSession;
  return merged;
}

let state = normalizeLoadedState(loadState());
const listeners = new Set();

export function getState() { return clone(state); }

export function patchState(patch) {
  state = normalizeLoadedState({ ...state, ...patch, version: VERSION, updatedAt: new Date().toISOString() });
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
