<template>
  <div class="timeline-page">
    <DialogLogin v-if="showLogin" @authenticated="handleAuthenticated" />

    <section class="timeline-shell" v-else>
      <header class="timeline-toolbar">
        <div class="toolbar-titles">
          <h1>Session timeline</h1>
          <p>Browse capture sessions within a custom window and adjust timing, identities, and images in context.</p>
        </div>
        <form class="toolbar-range" @submit.prevent="loadSessions()">
          <label>
            <span>Range start</span>
            <input type="datetime-local" v-model="rangeStart" @change="handleRangeInput" required />
          </label>
          <label>
            <span>Range end</span>
            <input type="datetime-local" v-model="rangeEnd" @change="handleRangeInput" required />
          </label>
          <button type="submit" :disabled="loading">
            <span v-if="loading">Loading…</span>
            <span v-else>Refresh</span>
          </button>
        </form>
      </header>

      <section class="timeline-range-summary">
        <div class="range-summary__row">
          <strong>Local</strong>
          <span>{{ formatDisplay(rangeStartDate) }}</span>
          <span>→</span>
          <span>{{ formatDisplay(rangeEndDate) }}</span>
        </div>
        <div class="range-summary__row">
          <strong>UTC</strong>
          <span>{{ formatUtc(rangeStartDate) }}</span>
          <span>→</span>
          <span>{{ formatUtc(rangeEndDate) }}</span>
        </div>
      </section>

      <p v-if="errorMessage" class="alert alert--error">{{ errorMessage }}</p>
      <p v-if="successMessage" class="alert alert--success">{{ successMessage }}</p>

      <div v-if="loading" class="timeline-empty">Fetching sessions…</div>
      <div v-else-if="timelineSessions.length === 0" class="timeline-empty">
        No sessions found in this window. Try expanding the range or checking your filters.
      </div>

      <div v-else class="timeline-canvas" ref="timelineCanvas" @mouseleave="schedulePopoverClose">
        <div class="timeline-scroll" :style="{ width: timelineWidth + 'px', height: timelineHeight + 'px' }">
          <div class="timeline-axis" :style="{ height: axisHeight + 'px' }">
            <div
              v-for="tick in axisTicks"
              :key="tick.iso"
              class="timeline-axis__tick"
              :style="{ left: tick.position + 'px' }"
            >
              <span class="axis-label axis-label--local">{{ tick.local }}</span>
              <span class="axis-label axis-label--utc">{{ tick.utc }}</span>
            </div>
          </div>

          <div class="timeline-body" :style="{ top: axisHeight + 'px', height: bodyHeight + 'px' }">
            <div
              v-for="session in timelineSessions"
              :key="session.id"
              class="timeline-session-block"
              :class="{ 'timeline-session-block--active': popover.sessionId === session.id }"
              :style="getSessionBlockStyle(session)"
              @mouseenter="openSessionPopover(session, $event)"
              @mouseleave="schedulePopoverClose"
            >
              <span class="session-block__label">{{ sessionLabel(session) }}</span>
            </div>

            <button
              v-for="marker in imageMarkers"
              :key="marker.key"
              type="button"
              class="timeline-image-marker"
              :class="{ 'timeline-image-marker--active': popover.focusImageId === marker.image.id }"
              :style="getImageMarkerStyle(marker)"
              @mouseenter="openImagePopover(marker.session, marker.image, $event)"
              @mouseleave="schedulePopoverClose"
            >
              <span class="marker-dot"></span>
              <span class="marker-tooltip">
                <strong>{{ marker.image.filename }}</strong>
                <span>Local: {{ formatDisplay(marker.image.capturedAt) }}</span>
                <span>UTC: {{ formatUtc(marker.image.capturedAt) }}</span>
              </span>
            </button>
          </div>
        </div>

        <transition name="fade">
          <div
            v-if="popover.sessionId"
            class="timeline-popover"
            :style="popoverStyle"
            @mouseenter="clearPopoverTimer"
            @mouseleave="schedulePopoverClose"
          >
            <div class="popover-header">
              <div>
                <h2>Session details</h2>
                <p>{{ popoverSubtitle }}</p>
              </div>
              <button type="button" class="icon-button" @click="closePopover" aria-label="Close details">×</button>
            </div>

            <div v-if="activeForm" class="popover-body">
              <section class="popover-section">
                <header>
                  <h3>Timing</h3>
                </header>
                <div class="field-grid">
                  <label>
                    <span>Start (local)</span>
                    <input
                      type="datetime-local"
                      v-model="activeForm.startLocal"
                      @change="syncSessionUtc(activeForm, 'start')"
                      required
                    />
                  </label>
                  <label>
                    <span>End (local)</span>
                    <input
                      type="datetime-local"
                      v-model="activeForm.endLocal"
                      @change="syncSessionUtc(activeForm, 'end')"
                      required
                    />
                  </label>
                </div>
                <div class="field-grid field-grid--readonly">
                  <div>
                    <span>Start (UTC)</span>
                    <code>{{ activeForm.startUtc || '—' }}</code>
                  </div>
                  <div>
                    <span>End (UTC)</span>
                    <code>{{ activeForm.endUtc || '—' }}</code>
                  </div>
                </div>
              </section>

              <section class="popover-section">
                <header>
                  <h3>Identities</h3>
                </header>
                <div class="identity-editor">
                  <div v-if="activeForm.identityIds.length > 0" class="identity-editor__chips">
                    <button
                      v-for="identity in selectedIdentities"
                      :key="identity.id"
                      type="button"
                      class="identity-chip"
                      @click="toggleIdentity(activeForm, identity.id)"
                    >
                      {{ identity.fullName || 'Unknown' }}
                      <span aria-hidden="true">×</span>
                    </button>
                  </div>
                  <input
                    type="search"
                    v-model="activeForm.identitySearch"
                    placeholder="Search identities"
                    class="identity-editor__search"
                  />
                  <div class="identity-editor__list">
                    <label v-for="option in filteredIdentityOptions" :key="option.id">
                      <input
                        type="checkbox"
                        :value="option.id"
                        :checked="activeForm.identityIds.includes(option.id)"
                        @change="toggleIdentity(activeForm, option.id)"
                      />
                      <span>{{ formatIdentityOption(option) }}</span>
                    </label>
                  </div>
                </div>
              </section>

              <section class="popover-section">
                <header>
                  <h3>Images</h3>
                </header>
                <div v-if="activeForm.images.length === 0" class="empty-list">This session has no linked images.</div>
                <div v-else class="image-editor">
                  <div
                    v-for="image in activeForm.images"
                    :key="image.id"
                    class="image-editor__row"
                    :class="{ 'image-editor__row--focused': popover.focusImageId === image.id }"
                  >
                    <label class="image-editor__include">
                      <input type="checkbox" v-model="image.included" />
                      <span>Include</span>
                    </label>
                    <div class="image-editor__meta">
                      <span class="image-editor__name">{{ image.filename }}</span>
                      <span class="image-editor__path">{{ image.directoryPath }}</span>
                    </div>
                    <div class="image-editor__inputs">
                      <label>
                        <span>Captured (local)</span>
                        <input
                          type="datetime-local"
                          v-model="image.timestampLocal"
                          @change="syncImageUtc(image)"
                        />
                      </label>
                      <div class="image-editor__utc">
                        <span>UTC</span>
                        <code>{{ image.timestampUtc || '—' }}</code>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="add-image">
                  <label>
                    <span>Add image by ID</span>
                    <div class="add-image__controls">
                      <input
                        type="text"
                        v-model="activeForm.addImageId"
                        placeholder="Image document ID"
                        @keyup.enter="queueNewImageId(activeForm)"
                      />
                      <button type="button" @click="queueNewImageId(activeForm)">Add</button>
                    </div>
                  </label>
                  <div v-if="activeForm.pendingImageIds.length" class="add-image__pending">
                    <span>Queued IDs:</span>
                    <button
                      v-for="id in activeForm.pendingImageIds"
                      :key="id"
                      type="button"
                      @click="removePendingImageId(activeForm, id)"
                    >
                      {{ id }} ×
                    </button>
                  </div>
                </div>
              </section>

              <footer class="popover-actions">
                <button
                  type="button"
                  class="primary"
                  :disabled="activeForm.isSaving"
                  @click="saveSessionEdits(popover.sessionId)"
                >
                  <span v-if="activeForm.isSaving">Saving…</span>
                  <span v-else>Save changes</span>
                </button>
                <button
                  type="button"
                  class="ghost"
                  :disabled="activeForm.isSaving"
                  @click="resetSessionForm(popover.sessionId)"
                >
                  Reset
                </button>
              </footer>

              <p v-if="activeForm.errorMessage" class="popover-status popover-status--error">
                {{ activeForm.errorMessage }}
              </p>
              <p v-if="activeForm.successMessage" class="popover-status popover-status--success">
                {{ activeForm.successMessage }}
              </p>
            </div>
          </div>
        </transition>
      </div>
    </section>
  </div>
</template>

<script>
import DialogLogin from '@/components/DialogLogin.vue';
import {
  UnauthorizedError,
  clearSessionCookies,
  fetchIdentities,
  fetchSessionsWithinRange,
  getCampusString,
  getGradeString,
  getHouseString,
  hasActiveSession,
  updateSessionAndImages,
} from '@/utils/app';

const TIMELINE_MIN_WIDTH = 960;
const PIXELS_PER_HOUR = 220;
const AXIS_HEIGHT = 72;
const ROW_HEIGHT = 120;
const ROW_VERTICAL_PADDING = 32;
const POPOVER_HIDE_DELAY = 180;

function formatDateTimeLocal(value) {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseLocalInput(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatUtcLabel(value) {
  if (!value) {
    return '—';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toISOString().replace('T', ' ').replace('Z', ' UTC');
}

function formatUtcShort(value) {
  if (!value) {
    return '—';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  const pad = (num) => String(num).padStart(2, '0');
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}

function buildIdentity(identity) {
  const fullName = identity.fullName || [identity.firstName, identity.lastName].filter(Boolean).join(' ');
  return {
    ...identity,
    fullName,
    campusLabel: identity.campusLabel || getCampusString(identity.campus),
    gradeLabel: identity.gradeLabel || getGradeString(identity.grade),
    houseLabel: identity.houseLabel || getHouseString(identity.house),
  };
}

function normalizeSession(payload) {
  const startIso = payload.session_start_dt || payload.start || null;
  const endIso = payload.session_end_dt || payload.end || null;
  const startDate = startIso ? new Date(startIso) : null;
  const endDate = endIso ? new Date(endIso) : null;

  const identityIds = Array.isArray(payload.identityIds)
    ? payload.identityIds.filter((id) => typeof id === 'string')
    : [];

  const identities = Array.isArray(payload.identities)
    ? payload.identities.map(buildIdentity)
    : [];

  const images = Array.isArray(payload.images)
    ? payload.images.map((image) => {
        const captured = image.exifDateTimeOriginal || image.capturedAt || null;
        const capturedDate = captured ? new Date(captured) : null;
        return {
          id: image.id,
          filename: image.filename,
          directoryPath: image.directoryPath,
          capturedAt: capturedDate,
          capturedAtIso: capturedDate ? capturedDate.toISOString() : null,
        };
      })
    : [];

  return {
    id: payload.id,
    start: startDate ? startDate.toISOString() : null,
    end: endDate ? endDate.toISOString() : null,
    startMs: startDate ? startDate.getTime() : null,
    endMs: endDate ? endDate.getTime() : null,
    identityIds,
    identities,
    images,
  };
}

function extractImageTimestamps(images) {
  if (!Array.isArray(images)) {
    return [];
  }
  return images
    .map((image) => {
      if (!image || !image.capturedAt) {
        return null;
      }
      const date = image.capturedAt instanceof Date ? image.capturedAt : new Date(image.capturedAt);
      const time = date.getTime();
      return Number.isNaN(time) ? null : time;
    })
    .filter((time) => typeof time === 'number');
}

function resolveSessionBounds(session) {
  const imageTimes = extractImageTimestamps(session.images);

  let startMs = typeof session.startMs === 'number' && Number.isFinite(session.startMs) ? session.startMs : null;
  let endMs = typeof session.endMs === 'number' && Number.isFinite(session.endMs) ? session.endMs : null;

  if (imageTimes.length > 0) {
    if (startMs === null) {
      startMs = Math.min(...imageTimes);
    }
    if (endMs === null) {
      endMs = Math.max(...imageTimes);
    }
  }

  if (startMs === null && endMs !== null) {
    startMs = endMs;
  }

  if (endMs === null && startMs !== null) {
    endMs = startMs;
  }

  if (startMs !== null && endMs !== null && endMs < startMs) {
    endMs = startMs;
  }

  return {
    startMs,
    endMs,
  };
}

function enhanceSessionForTimeline(session) {
  const bounds = resolveSessionBounds(session);
  return {
    ...session,
    layoutStartMs: bounds.startMs,
    layoutEndMs: bounds.endMs,
  };
}

function sessionOverlapsRange(session, rangeStartMs, rangeEndMs) {
  if (typeof rangeStartMs !== 'number' || typeof rangeEndMs !== 'number') {
    return true;
  }

  const startMs =
    typeof session.layoutStartMs === 'number' && Number.isFinite(session.layoutStartMs)
      ? session.layoutStartMs
      : typeof session.startMs === 'number' && Number.isFinite(session.startMs)
        ? session.startMs
        : null;
  const endMs =
    typeof session.layoutEndMs === 'number' && Number.isFinite(session.layoutEndMs)
      ? session.layoutEndMs
      : typeof session.endMs === 'number' && Number.isFinite(session.endMs)
        ? session.endMs
        : null;

  const resolvedStart = startMs ?? endMs;
  const resolvedEnd = endMs ?? startMs;

  if (resolvedStart === null || resolvedEnd === null) {
    return false;
  }

  return resolvedEnd >= rangeStartMs && resolvedStart <= rangeEndMs;
}

function assignSessionRows(sessions) {
  const rowEndTimes = [];
  return sessions.map((session) => {
    const startMs =
      typeof session.layoutStartMs === 'number' && Number.isFinite(session.layoutStartMs)
        ? session.layoutStartMs
        : typeof session.layoutEndMs === 'number' && Number.isFinite(session.layoutEndMs)
          ? session.layoutEndMs
          : 0;

    const rawEndMs =
      typeof session.layoutEndMs === 'number' && Number.isFinite(session.layoutEndMs)
        ? session.layoutEndMs
        : startMs + 60_000;
    const endMs = rawEndMs > startMs ? rawEndMs : startMs + 60_000;

    let rowIndex = 0;
    while (rowEndTimes[rowIndex] && rowEndTimes[rowIndex] > startMs) {
      rowIndex += 1;
    }
    rowEndTimes[rowIndex] = endMs;

    return {
      ...session,
      layoutStartMs: startMs,
      layoutEndMs: endMs,
      rowIndex,
    };
  });
}

export default {
  name: 'TimelineView',
  components: {
    DialogLogin,
  },
  data() {
    const now = new Date();
    const defaultEnd = formatDateTimeLocal(now);
    const defaultStart = formatDateTimeLocal(new Date(now.getTime() - 1000 * 60 * 60 * 4));

    return {
      showLogin: !hasActiveSession(),
      rangeStart: defaultStart,
      rangeEnd: defaultEnd,
      sessions: [],
      allIdentities: [],
      loading: false,
      errorMessage: '',
      successMessage: '',
      popover: {
        sessionId: null,
        focusImageId: null,
        left: 0,
        top: 0,
      },
      popoverTimer: null,
      sessionForms: {},
      sessionOriginals: {},
    };
  },
  computed: {
    rangeStartDate() {
      return parseLocalInput(this.rangeStart);
    },
    rangeEndDate() {
      return parseLocalInput(this.rangeEnd);
    },
    timelineDurationMs() {
      const start = this.rangeStartDate?.getTime();
      const end = this.rangeEndDate?.getTime();
      if (!start || !end || end <= start) {
        return 1;
      }
      return end - start;
    },
    timelineWidth() {
      const hours = this.timelineDurationMs / (1000 * 60 * 60);
      return Math.max(TIMELINE_MIN_WIDTH, Math.ceil(hours * PIXELS_PER_HOUR));
    },
    axisHeight() {
      return AXIS_HEIGHT;
    },
    rowHeight() {
      return ROW_HEIGHT;
    },
    rowCount() {
      return this.timelineSessions.reduce((max, session) => Math.max(max, (session.rowIndex ?? 0) + 1), 0);
    },
    bodyHeight() {
      const rows = Math.max(1, this.rowCount);
      return rows * this.rowHeight + ROW_VERTICAL_PADDING * 2;
    },
    timelineHeight() {
      return this.axisHeight + this.bodyHeight;
    },
    timelineSessions() {
      return this.sessions;
    },
    imageMarkers() {
      const rangeStart = this.rangeStartDate?.getTime();
      const rangeEnd = this.rangeEndDate?.getTime();

      return this.timelineSessions.flatMap((session) => {
        const sessionFallback =
          typeof session.layoutStartMs === 'number' && Number.isFinite(session.layoutStartMs)
            ? session.layoutStartMs
            : typeof rangeStart === 'number'
              ? rangeStart
              : 0;

        return session.images
          .map((image) => {
            const timestamp = image.capturedAt ? image.capturedAt.getTime() : sessionFallback;
            return {
              key: `${session.id}-${image.id}`,
              session,
              image,
              timestamp,
            };
          })
          .filter((marker) => {
            if (typeof rangeStart !== 'number' || typeof rangeEnd !== 'number') {
              return true;
            }
            return marker.timestamp >= rangeStart && marker.timestamp <= rangeEnd;
          });
      });
    },
    axisTicks() {
      const ticks = [];
      if (!this.rangeStartDate || !this.rangeEndDate) {
        return ticks;
      }

      const start = new Date(this.rangeStartDate);
      start.setMinutes(0, 0, 0);
      if (start.getTime() > this.rangeStartDate.getTime()) {
        start.setHours(start.getHours() - 1);
      }
      const endMs = this.rangeEndDate.getTime();

      for (let cursor = start.getTime(); cursor <= endMs; cursor += 60 * 60 * 1000) {
        const cursorDate = new Date(cursor);
        ticks.push({
          iso: cursorDate.toISOString(),
          local: cursorDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          utc: formatUtcShort(cursorDate),
          position: this.getPositionForTime(cursor),
        });
      }

      return ticks;
    },
    popoverStyle() {
      if (!this.popover.sessionId) {
        return {};
      }
      return {
        left: `${this.popover.left}px`,
        top: `${this.popover.top}px`,
      };
    },
    popoverSession() {
      return this.timelineSessions.find((session) => session.id === this.popover.sessionId) || null;
    },
    popoverSubtitle() {
      const session = this.popoverSession;
      if (!session) {
        return '';
      }
      const start = this.formatDisplay(session.start);
      const end = this.formatDisplay(session.end);
      return `${start} → ${end}`;
    },
    activeForm() {
      if (!this.popover.sessionId) {
        return null;
      }
      return this.sessionForms[this.popover.sessionId] || null;
    },
    identityOptions() {
      const map = new Map();
      this.allIdentities.forEach((identity) => {
        map.set(identity.id, buildIdentity(identity));
      });

      this.timelineSessions.forEach((session) => {
        session.identities.forEach((identity) => {
          if (!map.has(identity.id)) {
            map.set(identity.id, buildIdentity(identity));
          }
        });
      });

      return Array.from(map.values());
    },
    selectedIdentities() {
      if (!this.activeForm) {
        return [];
      }
      const selectedSet = new Set(this.activeForm.identityIds);
      return this.identityOptions.filter((identity) => selectedSet.has(identity.id));
    },
    filteredIdentityOptions() {
      if (!this.activeForm) {
        return [];
      }
      const query = (this.activeForm.identitySearch || '').toLowerCase();
      const selectedSet = new Set(this.activeForm.identityIds);
      return this.identityOptions.filter((identity) => {
        if (selectedSet.has(identity.id)) {
          return true;
        }
        if (!query) {
          return true;
        }
        return (
          identity.fullName?.toLowerCase().includes(query)
          || identity.campusLabel?.toLowerCase().includes(query)
          || identity.gradeLabel?.toLowerCase().includes(query)
          || identity.houseLabel?.toLowerCase().includes(query)
        );
      });
    },
  },
  async created() {
    if (this.showLogin) {
      return;
    }
    await this.initialize();
  },
  methods: {
    async initialize() {
      await this.loadIdentities();
      await this.loadSessions();
    },
    async handleAuthenticated() {
      this.showLogin = false;
      await this.initialize();
    },
    formatDisplay(value) {
      if (!value) {
        return '—';
      }
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) {
        return '—';
      }
      return date.toLocaleString();
    },
    formatUtc(value) {
      return formatUtcLabel(value);
    },
    formatIdentityOption(identity) {
      const segments = [identity.fullName];
      if (identity.campusLabel) {
        segments.push(identity.campusLabel);
      }
      if (identity.gradeLabel) {
        segments.push(identity.gradeLabel);
      }
      if (identity.houseLabel) {
        segments.push(identity.houseLabel);
      }
      return segments.filter(Boolean).join(' • ');
    },
    handleRangeInput() {
      this.successMessage = '';
    },
    async loadIdentities() {
      try {
        this.allIdentities = await fetchIdentities();
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          this.handleSessionExpired();
        } else {
          console.error('Failed to load identities', error);
        }
      }
    },
    async loadSessions(options = {}) {
      if (!hasActiveSession()) {
        this.handleSessionExpired();
        return;
      }

      const startDate = this.rangeStartDate;
      const endDate = this.rangeEndDate;
      if (!startDate || !endDate || endDate <= startDate) {
        this.errorMessage = 'Please provide a valid date range where the end is after the start.';
        return;
      }

      this.loading = true;
      this.errorMessage = '';
      if (!options.preserveSuccessMessage) {
        this.successMessage = '';
      }

      try {
        const results = await fetchSessionsWithinRange(startDate.toISOString(), endDate.toISOString());
        const normalized = results.map((session) => enhanceSessionForTimeline(normalizeSession(session)));
        const rangeStartMs = startDate.getTime();
        const rangeEndMs = endDate.getTime();
        const filtered = normalized.filter((session) => sessionOverlapsRange(session, rangeStartMs, rangeEndMs));
        const ordered = filtered.sort((a, b) => {
          const aStart = typeof a.layoutStartMs === 'number' ? a.layoutStartMs : a.startMs ?? 0;
          const bStart = typeof b.layoutStartMs === 'number' ? b.layoutStartMs : b.startMs ?? 0;
          return aStart - bStart;
        });
        const withRows = assignSessionRows(ordered);
        this.sessions = withRows;

        const originals = {};
        withRows.forEach((session) => {
          originals[session.id] = JSON.parse(JSON.stringify(session));
        });
        this.sessionOriginals = originals;
        this.sessionForms = {};

        if (options.preserveSessionId) {
          const sessionToRestore = withRows.find((session) => session.id === options.preserveSessionId);
          if (sessionToRestore) {
            const restoredForm = this.ensureSessionForm(sessionToRestore);
            restoredForm.successMessage = options.restoredSuccessMessage || '';
            this.popover = {
              sessionId: sessionToRestore.id,
              focusImageId: options.focusImageId ?? null,
              left: options.position?.left ?? Math.min(this.timelineWidth - 320, 24),
              top: options.position?.top ?? this.axisHeight + ROW_VERTICAL_PADDING,
            };
            return;
          }
        }

        this.closePopover();
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          this.handleSessionExpired();
        } else {
          console.error('Failed to load sessions', error);
          this.errorMessage = error.message || 'Unable to load sessions.';
        }
      } finally {
        this.loading = false;
      }
    },
    ensureSessionForm(session) {
      if (this.sessionForms[session.id]) {
        return this.sessionForms[session.id];
      }

      const form = {
        startLocal: formatDateTimeLocal(session.start),
        endLocal: formatDateTimeLocal(session.end),
        startUtc: formatUtcLabel(session.start),
        endUtc: formatUtcLabel(session.end),
        identityIds: [...session.identityIds],
        identitySearch: '',
        images: session.images.map((image) => ({
          id: image.id,
          filename: image.filename,
          directoryPath: image.directoryPath,
          timestampLocal: formatDateTimeLocal(image.capturedAtIso),
          timestampUtc: formatUtcLabel(image.capturedAtIso),
          originalTimestamp: image.capturedAtIso,
          included: true,
        })),
        addImageId: '',
        pendingImageIds: [],
        isSaving: false,
        errorMessage: '',
        successMessage: '',
      };

      this.sessionForms = {
        ...this.sessionForms,
        [session.id]: form,
      };

      return form;
    },
    getPositionForTime(timestamp) {
      if (!this.rangeStartDate || !this.rangeEndDate) {
        return 0;
      }
      const value = timestamp instanceof Date ? timestamp.getTime() : Number(timestamp);
      const start = this.rangeStartDate.getTime();
      const end = this.rangeEndDate.getTime();
      const duration = end - start;
      if (duration <= 0) {
        return 0;
      }
      const clamped = Math.min(Math.max(value - start, 0), duration);
      return (clamped / duration) * this.timelineWidth;
    },
    getSessionBlockStyle(session) {
      const fallback = this.rangeStartDate?.getTime() ?? 0;
      const start = typeof session.layoutStartMs === 'number' && Number.isFinite(session.layoutStartMs)
        ? session.layoutStartMs
        : typeof session.startMs === 'number' && Number.isFinite(session.startMs)
          ? session.startMs
          : fallback;
      const end = typeof session.layoutEndMs === 'number' && Number.isFinite(session.layoutEndMs)
        ? session.layoutEndMs
        : typeof session.endMs === 'number' && Number.isFinite(session.endMs)
          ? session.endMs
          : start;
      const clampedStart = Math.min(start, end);
      const clampedEnd = Math.max(start, end);
      const left = this.getPositionForTime(clampedStart);
      const right = this.getPositionForTime(clampedEnd);
      const width = Math.max(right - left, 6);
      return {
        left: `${left}px`,
        top: `${ROW_VERTICAL_PADDING + session.rowIndex * this.rowHeight}px`,
        width: `${width}px`,
      };
    },
    getImageMarkerStyle(marker) {
      const fallback =
        (marker.session
          && typeof marker.session.layoutStartMs === 'number'
          && Number.isFinite(marker.session.layoutStartMs)
          ? marker.session.layoutStartMs
          : this.rangeStartDate?.getTime()) ?? 0;
      const time = typeof marker.timestamp === 'number' && Number.isFinite(marker.timestamp)
        ? marker.timestamp
        : fallback;
      const position = this.getPositionForTime(time);
      const top = ROW_VERTICAL_PADDING + marker.session.rowIndex * this.rowHeight - 18;
      return {
        left: `${position}px`,
        top: `${top}px`,
      };
    },
    sessionLabel(session) {
      const start = session.start ? new Date(session.start) : null;
      const end = session.end ? new Date(session.end) : null;
      const startLabel = start ? start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
      const endLabel = end ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
      return `${startLabel} → ${endLabel}`;
    },
    openSessionPopover(session, event) {
      this.openPopover(session, null, event);
    },
    openImagePopover(session, image, event) {
      this.openPopover(session, image, event);
    },
    openPopover(session, image, event) {
      const canvas = this.$refs.timelineCanvas;
      if (!canvas) {
        return;
      }

      const containerRect = canvas.getBoundingClientRect();
      const targetRect = event.currentTarget.getBoundingClientRect();
      const halfWidth = targetRect.width / 2;
      const left = Math.min(
        Math.max(targetRect.left - containerRect.left + halfWidth, 16),
        containerRect.width - 16,
      );
      const top = Math.max(targetRect.bottom - containerRect.top + 12, this.axisHeight + ROW_VERTICAL_PADDING);

      this.popover = {
        sessionId: session.id,
        focusImageId: image ? image.id : null,
        left,
        top,
      };

      const form = this.ensureSessionForm(session);
      if (image) {
        const targetImage = form.images.find((item) => item.id === image.id);
        if (targetImage) {
          targetImage.included = true;
        }
      }

      this.clearPopoverTimer();
    },
    schedulePopoverClose() {
      this.clearPopoverTimer();
      this.popoverTimer = setTimeout(() => {
        this.closePopover();
      }, POPOVER_HIDE_DELAY);
    },
    clearPopoverTimer() {
      if (this.popoverTimer) {
        clearTimeout(this.popoverTimer);
        this.popoverTimer = null;
      }
    },
    closePopover() {
      this.clearPopoverTimer();
      this.popover = {
        sessionId: null,
        focusImageId: null,
        left: 0,
        top: 0,
      };
    },
    syncSessionUtc(form, which) {
      if (!form) {
        return;
      }
      if (which === 'start') {
        const date = parseLocalInput(form.startLocal);
        form.startUtc = formatUtcLabel(date);
      } else if (which === 'end') {
        const date = parseLocalInput(form.endLocal);
        form.endUtc = formatUtcLabel(date);
      }
    },
    syncImageUtc(image) {
      const date = parseLocalInput(image.timestampLocal);
      image.timestampUtc = formatUtcLabel(date);
    },
    toggleIdentity(form, identityId) {
      if (!form) {
        return;
      }
      const exists = form.identityIds.includes(identityId);
      if (exists) {
        form.identityIds = form.identityIds.filter((id) => id !== identityId);
      } else {
        form.identityIds = [...form.identityIds, identityId];
      }
    },
    queueNewImageId(form) {
      if (!form) {
        return;
      }
      const candidate = (form.addImageId || '').trim();
      if (!candidate) {
        return;
      }
      if (
        form.pendingImageIds.includes(candidate)
        || form.images.some((image) => image.id === candidate)
      ) {
        form.addImageId = '';
        return;
      }
      form.pendingImageIds = [...form.pendingImageIds, candidate];
      form.addImageId = '';
    },
    removePendingImageId(form, imageId) {
      if (!form) {
        return;
      }
      form.pendingImageIds = form.pendingImageIds.filter((id) => id !== imageId);
    },
    async saveSessionEdits(sessionId) {
      const form = this.sessionForms[sessionId];
      const original = this.sessionOriginals[sessionId];
      if (!form || !original) {
        return;
      }

      const startDate = parseLocalInput(form.startLocal);
      const endDate = parseLocalInput(form.endLocal);
      if (!startDate || !endDate || endDate <= startDate) {
        form.errorMessage = 'Please ensure the session start is before the session end.';
        form.successMessage = '';
        return;
      }

      const identityIds = Array.from(new Set(form.identityIds.filter((value) => typeof value === 'string' && value.trim() !== '')));

      const includedImages = form.images
        .filter((image) => image.included)
        .map((image) => image.id)
        .filter((value) => typeof value === 'string' && value.trim() !== '');

      const pendingImageIds = form.pendingImageIds.filter((value) => value && value.trim() !== '');
      const imageIds = Array.from(new Set([...includedImages, ...pendingImageIds]));

      const originalImageMap = new Map((original.images || []).map((image) => [image.id, image.capturedAtIso || null]));

      const imageUpdates = [];
      form.images.forEach((image) => {
        if (!image.included) {
          return;
        }
        const parsed = parseLocalInput(image.timestampLocal);
        if (!parsed) {
          return;
        }
        const iso = parsed.toISOString();
        const originalIso = originalImageMap.get(image.id) || null;
        if (iso !== originalIso) {
          imageUpdates.push({
            imageId: image.id,
            exif_date_time_original: iso,
          });
        }
      });

      const sessionPayload = {
        session_start_dt: startDate.toISOString(),
        session_end_dt: endDate.toISOString(),
        identityIds,
        imageIds,
      };

      form.isSaving = true;
      form.errorMessage = '';
      form.successMessage = '';

      try {
        await updateSessionAndImages(sessionId, sessionPayload, imageUpdates);
        const previousPosition = { left: this.popover.left, top: this.popover.top };
        await this.loadSessions({
          preserveSessionId: sessionId,
          position: previousPosition,
          focusImageId: this.popover.focusImageId,
          preserveSuccessMessage: true,
          restoredSuccessMessage: 'Session updated successfully.',
        });
        this.successMessage = 'Session updated successfully.';
        const refreshedForm = this.sessionForms[sessionId];
        if (refreshedForm) {
          refreshedForm.successMessage = 'Session updated successfully.';
          refreshedForm.pendingImageIds = [];
        }
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          this.handleSessionExpired();
        } else {
          console.error('Failed to update session', error);
          form.errorMessage = error.message || 'Unable to update the session.';
        }
      } finally {
        form.isSaving = false;
      }
    },
    resetSessionForm(sessionId) {
      const session = this.sessionOriginals[sessionId];
      if (!session) {
        return;
      }
      const refreshed = this.ensureSessionForm(session);
      refreshed.startLocal = formatDateTimeLocal(session.start);
      refreshed.endLocal = formatDateTimeLocal(session.end);
      refreshed.startUtc = formatUtcLabel(session.start);
      refreshed.endUtc = formatUtcLabel(session.end);
      refreshed.identityIds = [...session.identityIds];
      refreshed.identitySearch = '';
      refreshed.images = session.images.map((image) => ({
        id: image.id,
        filename: image.filename,
        directoryPath: image.directoryPath,
        timestampLocal: formatDateTimeLocal(image.capturedAtIso),
        timestampUtc: formatUtcLabel(image.capturedAtIso),
        originalTimestamp: image.capturedAtIso,
        included: true,
      }));
      refreshed.addImageId = '';
      refreshed.pendingImageIds = [];
      refreshed.errorMessage = '';
      refreshed.successMessage = '';
    },
    handleSessionExpired() {
      clearSessionCookies();
      this.showLogin = true;
      this.loading = false;
      this.sessions = [];
      this.sessionForms = {};
      this.sessionOriginals = {};
      this.errorMessage = '';
      this.successMessage = '';
      this.closePopover();
    },
  },
};
</script>

<style scoped>
.timeline-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  background: #f5f6fa;
  min-height: 100%;
}

.timeline-shell {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  background: #ffffff;
  border-radius: 1.25rem;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
  padding: 1.75rem;
}

.timeline-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1.25rem;
  align-items: center;
}

.toolbar-titles h1 {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 600;
  color: #0f172a;
}

.toolbar-titles p {
  margin: 0.25rem 0 0;
  color: #475569;
  max-width: 36rem;
}

.toolbar-range {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
}

.toolbar-range label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: #1e293b;
}

.toolbar-range input {
  border: 1px solid #cbd5f5;
  border-radius: 0.75rem;
  padding: 0.55rem 0.75rem;
  min-width: 14rem;
  font-size: 0.95rem;
}

.toolbar-range button {
  border: none;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  color: #f8fafc;
  font-weight: 600;
  padding: 0.65rem 1.25rem;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.toolbar-range button:disabled {
  opacity: 0.6;
  cursor: wait;
  box-shadow: none;
  transform: none;
}

.toolbar-range button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.25);
}

.timeline-range-summary {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.95rem;
  color: #334155;
}

.range-summary__row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.alert {
  border-radius: 0.85rem;
  padding: 0.85rem 1.1rem;
  font-weight: 500;
}

.alert--error {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.alert--success {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.timeline-empty {
  padding: 2.5rem;
  border: 2px dashed #cbd5f5;
  border-radius: 1rem;
  text-align: center;
  color: #475569;
  background: #f8fafc;
}

.timeline-canvas {
  position: relative;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 1.25rem;
  overflow: auto;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 65%);
}

.timeline-scroll {
  position: relative;
  min-height: 320px;
}

.timeline-axis {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(248, 250, 252, 0.92);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-end;
}

.timeline-axis__tick {
  position: absolute;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translateX(-50%);
  font-size: 0.75rem;
  gap: 0.1rem;
  color: #475569;
}

.axis-label {
  padding: 0.2rem 0.45rem;
  border-radius: 0.5rem;
  background: rgba(226, 232, 240, 0.7);
}

.axis-label--utc {
  background: rgba(190, 242, 100, 0.25);
}

.timeline-body {
  position: absolute;
  left: 0;
  width: 100%;
}

.timeline-session-block {
  position: absolute;
  height: 48px;
  border-radius: 1.25rem;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.9), rgba(99, 102, 241, 0.9));
  box-shadow: 0 12px 24px rgba(59, 130, 246, 0.25);
  color: #ffffff;
  display: flex;
  align-items: center;
  padding: 0 1.1rem;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.timeline-session-block:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 40px rgba(59, 130, 246, 0.35);
}

.timeline-session-block--active {
  border: 2px solid #fbbf24;
}

.session-block__label {
  font-weight: 600;
  font-size: 0.95rem;
}

.timeline-image-marker {
  position: absolute;
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  transform: translate(-50%, 0);
  cursor: pointer;
}

.marker-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #f97316;
  display: block;
  transition: transform 0.2s ease;
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.15);
}

.timeline-image-marker:hover .marker-dot,
.timeline-image-marker--active .marker-dot {
  transform: scale(1.3);
  box-shadow: 0 0 0 6px rgba(249, 115, 22, 0.25);
}

.marker-tooltip {
  position: absolute;
  top: -110px;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.6rem 0.75rem;
  border-radius: 0.75rem;
  background: rgba(15, 23, 42, 0.92);
  color: #f8fafc;
  font-size: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
  transform-origin: bottom;
}

.timeline-image-marker:hover .marker-tooltip,
.timeline-image-marker--active .marker-tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(-4px);
}

.timeline-popover {
  position: absolute;
  min-width: 420px;
  max-width: 480px;
  background: #ffffff;
  border-radius: 1.25rem;
  box-shadow: 0 22px 45px rgba(15, 23, 42, 0.22);
  padding: 1.5rem;
  border: 1px solid rgba(148, 163, 184, 0.25);
  z-index: 5;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.popover-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.popover-header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #0f172a;
}

.popover-header p {
  margin: 0.25rem 0 0;
  color: #475569;
  font-size: 0.9rem;
}

.icon-button {
  border: none;
  background: rgba(148, 163, 184, 0.18);
  color: #0f172a;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  font-size: 1.1rem;
  cursor: pointer;
}

.popover-body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.popover-section header h3 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  color: #1e293b;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.field-grid label {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  font-size: 0.85rem;
  color: #1f2937;
}

.field-grid input {
  border-radius: 0.75rem;
  border: 1px solid #cbd5f5;
  padding: 0.55rem 0.75rem;
  font-size: 0.95rem;
}

.field-grid--readonly {
  color: #475569;
}

.field-grid--readonly code {
  font-family: 'Fira Code', Menlo, monospace;
  background: rgba(226, 232, 240, 0.45);
  padding: 0.35rem 0.5rem;
  border-radius: 0.55rem;
  display: inline-block;
}
.identity-editor {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.identity-editor__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.identity-chip {
  border: none;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.15);
  color: #1d4ed8;
  padding: 0.35rem 0.8rem;
  font-size: 0.8rem;
  cursor: pointer;
}

.identity-editor__search {
  border-radius: 0.75rem;
  border: 1px solid #cbd5f5;
  padding: 0.55rem 0.75rem;
  font-size: 0.95rem;
}

.identity-editor__list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  max-height: 180px;
  overflow-y: auto;
}

.identity-editor__list label {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.9rem;
  color: #1f2937;
}

.identity-editor__list input[type='checkbox'] {
  width: 16px;
  height: 16px;
}

.image-editor {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.image-editor__row {
  display: grid;
  grid-template-columns: auto 1fr 1fr;
  gap: 0.75rem;
  align-items: center;
  padding: 0.65rem 0.85rem;
  border-radius: 0.85rem;
  background: rgba(226, 232, 240, 0.45);
  border: 1px solid transparent;
}

.image-editor__row--focused {
  border-color: rgba(249, 115, 22, 0.45);
  background: rgba(254, 215, 170, 0.3);
}

.image-editor__include {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: #1f2937;
}

.image-editor__meta {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.image-editor__name {
  font-weight: 600;
  color: #1e293b;
}

.image-editor__path {
  font-size: 0.8rem;
  color: #64748b;
}

.image-editor__inputs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  align-items: start;
}

.image-editor__inputs input {
  border-radius: 0.75rem;
  border: 1px solid #cbd5f5;
  padding: 0.45rem 0.65rem;
  font-size: 0.9rem;
}

.image-editor__utc {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: #475569;
}

.image-editor__utc code {
  font-family: 'Fira Code', Menlo, monospace;
  background: rgba(226, 232, 240, 0.45);
  padding: 0.3rem 0.45rem;
  border-radius: 0.55rem;
}

.add-image {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.add-image__controls {
  display: flex;
  gap: 0.5rem;
}

.add-image__controls input {
  flex: 1 1 auto;
  border-radius: 0.75rem;
  border: 1px solid #cbd5f5;
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
}

.add-image__controls button {
  border-radius: 0.75rem;
  border: none;
  background: #2563eb;
  color: #f8fafc;
  padding: 0.55rem 1.05rem;
  font-weight: 600;
  cursor: pointer;
}

.add-image__pending {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
  font-size: 0.8rem;
  color: #475569;
}

.add-image__pending button {
  border: none;
  background: rgba(148, 163, 184, 0.25);
  border-radius: 999px;
  padding: 0.25rem 0.65rem;
  cursor: pointer;
}

.popover-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.popover-actions .primary {
  border: none;
  border-radius: 0.85rem;
  padding: 0.6rem 1.25rem;
  font-weight: 600;
  color: #f8fafc;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  cursor: pointer;
}

.popover-actions .ghost {
  border: 1px solid rgba(148, 163, 184, 0.5);
  border-radius: 0.85rem;
  padding: 0.6rem 1.25rem;
  font-weight: 600;
  color: #1f2937;
  background: transparent;
  cursor: pointer;
}

.popover-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.popover-status {
  margin: 0;
  font-size: 0.85rem;
  text-align: right;
}

.popover-status--error {
  color: #b91c1c;
}

.popover-status--success {
  color: #047857;
}

.empty-list {
  padding: 1rem;
  border-radius: 0.85rem;
  background: rgba(226, 232, 240, 0.5);
  color: #475569;
  font-size: 0.9rem;
}

@media (max-width: 960px) {
  .timeline-shell {
    padding: 1.25rem;
  }

  .toolbar-range {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-range label,
  .toolbar-range button {
    width: 100%;
  }

  .timeline-popover {
    position: fixed;
    left: 1.5rem !important;
    right: 1.5rem !important;
    top: auto !important;
    bottom: 1.5rem;
    max-width: none;
  }
}
</style>
