import { loadState, saveState } from './storage.js?v=core08-a3-data-guard-20260705';
import { VERSION } from '../config/version.js?v=core08-a3-data-guard-20260705';
import { createStateBackup, guardPatch, normalizeProtectedState } from './dataGuard.js?v=core08-a3-data-guard-20260705';

const initialState = {
  version: VERSION,
  currentRoute: 'home',
  nextProject: null,
  selectedPrepProjectId: '',
  activeCandidate: null,
  importCandidates: [],
  prepContext: {
    weatherMemo: '',
    weatherHourlyMemo: '',
    highTemp: '',
    lowTemp: '',
    rainRisk: '',
    windMemo: '',
    humidityMemo: '',
    thunderMemo: '',
    siteAltitude: '',
    dryServiceMemo: '',
    cancelFreeUntil: '',
    cancelFeeStart: '',
    cancelDecisionStatus: '保留',
    weatherDecisionMemo: '',
    peopleCount: '2',
    kotaGoing: 'yes',
    menuMemo: '',
    routeMemo: '',
    setupMemo: '',
    campgroundSearchMemo: '',
    pastReflection: '',
    gearMemo: '',
    gearLedgerMemo: '',
    fixedDishMemo: '',
    extraNeedMemo: '',
    availableFoodMemo: '',
    missingFoodMemo: '',
    localChangeMemo: '',
    mealModes: []
  },
  walkSession: null,
  recordHistory: [],
  selectedRecordSessionId: null,
  recoverySession: null,
  prepFeature: 'dashboard',
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
  notes: { shopping: [], packing: [], kota: [], reflection: [] },
  dataGuard: {
    version: 'core08-a3',
    immutableRule: 'ユーザー操作なしに予定・記録・メモを修正/統合/上書き/削除しない',
    auditLog: [],
    deletedItems: [],
    conflicts: [],
    backups: [],
    lastProtectedAt: null
  }
};

function clone(value) {
  try { if (typeof structuredClone === 'function') return structuredClone(value); } catch (error) { console.warn('structuredClone failed', error); }
  return JSON.parse(JSON.stringify(value));
}

function normalizeLoadedState(loaded) {
  const merged = { ...initialState, ...(loaded || {}) };
  merged.prepContext = { ...initialState.prepContext, ...(loaded?.prepContext || {}) };
  merged.prepContext.mealModes = Array.isArray(loaded?.prepContext?.mealModes) ? loaded.prepContext.mealModes : [];
  merged.selectedPrepProjectId = loaded?.selectedPrepProjectId || '';
  merged.notes = { ...initialState.notes, ...(loaded?.notes || {}) };
  merged.recordHistory = Array.isArray(loaded?.recordHistory) ? loaded.recordHistory : [];
  merged.reviewQueue = Array.isArray(loaded?.reviewQueue) ? loaded.reviewQueue : [];
  merged.recoverySession = loaded?.recoverySession || null;
  merged.prepFeature = loaded?.prepFeature || 'dashboard';
  merged.appliedReviewQueue = Array.isArray(loaded?.appliedReviewQueue) ? loaded.appliedReviewQueue : [];
  merged.calendarEvents = Array.isArray(loaded?.calendarEvents) ? loaded.calendarEvents : [];
  merged.calendarCursor = loaded?.calendarCursor || '';
  merged.selectedDate = loaded?.selectedDate || '';
  merged.calendarAddOpen = Boolean(loaded?.calendarAddOpen);
  merged.notificationPermission = loaded?.notificationPermission || 'unknown';
  merged.calendarReminderNotified = loaded?.calendarReminderNotified || {};
  merged.mvpBetaCheck = { ...initialState.mvpBetaCheck, ...(loaded?.mvpBetaCheck || {}), steps: { ...initialState.mvpBetaCheck.steps, ...(loaded?.mvpBetaCheck?.steps || {}) } };
  if (loaded?.walkSession && loaded.walkSession.status === 'active') merged.walkSession = loaded.walkSession;
  merged.dataGuard = { ...initialState.dataGuard, ...(loaded?.dataGuard || {}) };
  return normalizeProtectedState(merged);
}

let state = normalizeLoadedState(loadState());
const listeners = new Set();

export function getState() { return clone(state); }

export function patchState(patch, options = {}) {
  const previous = normalizeProtectedState(state);
  const guardedPatch = guardPatch(previous, patch || {}, options);
  const backup = createStateBackup(previous, Object.keys(patch || {}).join(', ') || 'state-change');
  const backupRecord = backup ? { dataGuard: { ...(guardedPatch.dataGuard || previous.dataGuard), backups: [backup, ...((previous.dataGuard?.backups) || [])].slice(0, 8) } } : {};
  state = normalizeLoadedState({ ...previous, ...guardedPatch, ...backupRecord, version: VERSION, updatedAt: new Date().toISOString() });
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
  const previous = normalizeProtectedState(state);
  const backup = createStateBackup(previous, 'resetPrototypeState');
  state = normalizeLoadedState({
    ...initialState,
    dataGuard: {
      ...(previous.dataGuard || initialState.dataGuard),
      backups: backup ? [backup, ...((previous.dataGuard?.backups) || [])].slice(0, 8) : ((previous.dataGuard?.backups) || []),
      auditLog: [
        ...((previous.dataGuard?.auditLog) || []),
        { id: `audit_${Date.now()}`, at: new Date().toISOString(), message: 'リセット前状態をバックアップへ保護', keys: ['resetPrototypeState'] }
      ].slice(-80),
      lastProtectedAt: new Date().toISOString()
    }
  });
  saveState(state);
  listeners.forEach((listener) => listener(getState()));
}
