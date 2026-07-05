const BACKUP_KEY = 'outbase_data_guard_backups_v1';
const MAX_BACKUPS = 8;
const MAX_AUDIT = 80;
const IDENTITY_FIELDS = ['id', 'title', 'type', 'start', 'end'];
const PROJECT_IDENTITY_PATHS = ['id', 'title', 'reservation.campground', 'reservation.dateText'];

function nowIso() { return new Date().toISOString(); }

function clone(value) {
  try { if (typeof structuredClone === 'function') return structuredClone(value); } catch {}
  try { return JSON.parse(JSON.stringify(value)); } catch { return value; }
}

function safeString(value = '') { return String(value ?? '').trim(); }
function hasValue(value) { return value !== undefined && value !== null && String(value).trim() !== ''; }
function readPath(object, path) { return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), object); }
function sameValue(a, b) { return safeString(a) === safeString(b); }

function stableId(prefix = 'ob') {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

function withEventId(event = {}) {
  if (event.id) return event;
  return { ...event, id: stableId('cal'), dataGuardNote: 'Core08-A3で保護IDを付与' };
}

function withRecordId(record = {}) {
  if (record.id || record.sessionId) return record;
  return { ...record, id: stableId('rec'), dataGuardNote: 'Core08-A3で保護IDを付与' };
}

function normalizeDataGuard(dataGuard = {}) {
  return {
    version: 'core08-a3',
    immutableRule: 'ユーザー操作なしに予定・記録・メモを修正/統合/上書き/削除しない',
    auditLog: Array.isArray(dataGuard.auditLog) ? dataGuard.auditLog.slice(-MAX_AUDIT) : [],
    deletedItems: Array.isArray(dataGuard.deletedItems) ? dataGuard.deletedItems.slice(-MAX_AUDIT) : [],
    conflicts: Array.isArray(dataGuard.conflicts) ? dataGuard.conflicts.slice(-MAX_AUDIT) : [],
    backups: Array.isArray(dataGuard.backups) ? dataGuard.backups.slice(-MAX_BACKUPS) : [],
    lastProtectedAt: dataGuard.lastProtectedAt || null
  };
}

export function normalizeProtectedState(state = {}) {
  const next = { ...state };
  next.dataGuard = normalizeDataGuard(state.dataGuard || {});
  if (Array.isArray(next.calendarEvents)) next.calendarEvents = next.calendarEvents.map(withEventId);
  if (Array.isArray(next.recordHistory)) next.recordHistory = next.recordHistory.map(withRecordId);
  return next;
}

function summarizeEvent(event = {}) {
  return [event.title || event.reservation?.campground || '無題', event.start || event.reservation?.dateText || '', event.id || 'no-id'].filter(Boolean).join(' / ');
}

function identityChanged(existing = {}, incoming = {}) {
  return IDENTITY_FIELDS.some((field) => hasValue(existing[field]) && hasValue(incoming[field]) && !sameValue(existing[field], incoming[field]));
}

function projectIdentityChanged(existing = {}, incoming = {}) {
  return PROJECT_IDENTITY_PATHS.some((path) => hasValue(readPath(existing, path)) && hasValue(readPath(incoming, path)) && !sameValue(readPath(existing, path), readPath(incoming, path)));
}

function mergeNonIdentityEvent(existing = {}, incoming = {}, audit = [], conflicts = []) {
  if (!identityChanged(existing, incoming)) return { ...existing, ...incoming, id: existing.id || incoming.id };
  conflicts.push({
    id: stableId('conflict'),
    type: 'calendar-identity-overwrite-blocked',
    at: nowIso(),
    targetId: existing.id || incoming.id,
    before: summarizeEvent(existing),
    incoming: summarizeEvent(incoming),
    message: '予定のタイトル/日付/種別が別情報で上書きされそうになったため保護'
  });
  audit.push(`予定上書き防止：${summarizeEvent(existing)}`);
  const allowed = { ...incoming };
  IDENTITY_FIELDS.forEach((field) => { delete allowed[field]; });
  return { ...existing, ...allowed, id: existing.id || incoming.id };
}

function guardCalendarEvents(previous = [], incoming = [], audit = [], deletedItems = [], conflicts = []) {
  const previousList = previous.map(withEventId);
  const incomingList = incoming.map(withEventId);
  const previousById = new Map(previousList.map((event) => [event.id, event]));
  const incomingById = new Map(incomingList.map((event) => [event.id, event]));
  const protectedIncoming = incomingList.map((event) => {
    const existing = previousById.get(event.id);
    return existing ? mergeNonIdentityEvent(existing, event, audit, conflicts) : event;
  });
  previousList.forEach((event) => {
    if (!incomingById.has(event.id)) {
      deletedItems.push({ id: stableId('trash'), kind: 'calendarEvent', deletedAt: nowIso(), item: event, reason: 'active listから外れたため復元箱へ保護' });
      audit.push(`予定を復元箱へ保護：${summarizeEvent(event)}`);
    }
  });
  return protectedIncoming;
}

function guardRecordHistory(previous = [], incoming = [], audit = [], deletedItems = []) {
  const previousList = previous.map(withRecordId);
  const incomingList = incoming.map(withRecordId);
  const incomingIds = new Set(incomingList.map((record) => record.id || record.sessionId));
  previousList.forEach((record) => {
    const id = record.id || record.sessionId;
    if (id && !incomingIds.has(id)) {
      deletedItems.push({ id: stableId('trash'), kind: 'recordHistory', deletedAt: nowIso(), item: record, reason: 'active listから外れたため復元箱へ保護' });
      audit.push(`記録を復元箱へ保護：${id}`);
    }
  });
  return incomingList;
}

function guardNextProject(previousProject, incomingProject, audit = [], conflicts = []) {
  if (!previousProject || !incomingProject) return incomingProject;
  if (!projectIdentityChanged(previousProject, incomingProject)) return incomingProject;
  conflicts.push({
    id: stableId('conflict'),
    type: 'next-project-overwrite-blocked',
    at: nowIso(),
    before: summarizeEvent(previousProject),
    incoming: summarizeEvent(incomingProject),
    message: 'nextProjectが別キャンプで上書きされそうになったため保護'
  });
  audit.push(`次回キャンプ上書き防止：${summarizeEvent(previousProject)}`);
  return previousProject;
}

export function guardPatch(previousState = {}, patch = {}, options = {}) {
  const audit = [];
  const baseGuard = normalizeDataGuard(previousState.dataGuard || {});
  const deletedItems = [...baseGuard.deletedItems];
  const conflicts = [...baseGuard.conflicts];
  const guardedPatch = { ...patch };

  if (Array.isArray(patch.calendarEvents)) {
    guardedPatch.calendarEvents = guardCalendarEvents(previousState.calendarEvents || [], patch.calendarEvents, audit, deletedItems, conflicts);
  }
  if (Array.isArray(patch.recordHistory)) {
    guardedPatch.recordHistory = guardRecordHistory(previousState.recordHistory || [], patch.recordHistory, audit, deletedItems);
  }
  if (patch.nextProject && !options.allowIdentityOverwrite) {
    guardedPatch.nextProject = guardNextProject(previousState.nextProject, patch.nextProject, audit, conflicts);
  }

  const changedKeys = Object.keys(patch).filter((key) => !key.startsWith('__'));
  if (changedKeys.length) audit.push(`変更受付：${changedKeys.join(', ')}`);

  const auditItems = audit.map((message) => ({ id: stableId('audit'), at: nowIso(), message, keys: changedKeys }));
  guardedPatch.dataGuard = {
    ...baseGuard,
    auditLog: [...baseGuard.auditLog, ...auditItems].slice(-MAX_AUDIT),
    deletedItems: deletedItems.slice(-MAX_AUDIT),
    conflicts: conflicts.slice(-MAX_AUDIT),
    lastProtectedAt: auditItems.length ? nowIso() : baseGuard.lastProtectedAt
  };
  return guardedPatch;
}

export function createStateBackup(previousState = {}, reason = 'state-change') {
  if (typeof localStorage === 'undefined') return null;
  const backup = {
    id: stableId('backup'),
    at: nowIso(),
    reason,
    state: clone(previousState)
  };
  try {
    const current = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');
    const next = [backup, ...(Array.isArray(current) ? current : [])].slice(0, MAX_BACKUPS);
    localStorage.setItem(BACKUP_KEY, JSON.stringify(next));
    return { id: backup.id, at: backup.at, reason };
  } catch (error) {
    console.warn('OUTBASE backup failed', error);
    return null;
  }
}
