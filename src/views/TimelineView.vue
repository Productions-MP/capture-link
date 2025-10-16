<template>
  <div class="timeline-view">
    <DialogLogin v-if="showLogin" @authenticated="handleAuthenticated" />

    <section class="timeline-card">
      <header class="timeline-card__header">
        <div>
          <h2>Session Timeline</h2>
          <p>Review capture sessions within a date range and adjust their timing, identities, and images.</p>
        </div>
        <form class="range-form" @submit.prevent="loadSessions">
          <label>
            <span>Start</span>
            <input type="datetime-local" v-model="rangeStart" required />
          </label>
          <label>
            <span>End</span>
            <input type="datetime-local" v-model="rangeEnd" required />
          </label>
          <button type="submit" :disabled="loading">
            <span v-if="loading">Loading…</span>
            <span v-else>Refresh</span>
          </button>
        </form>
      </header>

      <p v-if="errorMessage" class="alert alert--error">{{ errorMessage }}</p>
      <p v-if="successMessage" class="alert alert--success">{{ successMessage }}</p>

      <div v-if="loading" class="empty-state">Fetching sessions…</div>
      <div v-else-if="sessions.length === 0" class="empty-state">
        No sessions found in this range. Try expanding the date window.
      </div>

      <div v-else class="timeline-chart" role="list">
        <div class="timeline-axis">
          <span>{{ formatDisplay(rangeStartDate) }}</span>
          <span>{{ formatDisplay(rangeEndDate) }}</span>
        </div>
        <div class="timeline-rows">
          <button type="button" v-for="session in sessions" :key="session.id" role="listitem"
            class="timeline-row" :class="{ 'timeline-row--active': session.id === selectedSessionId }"
            @click="selectSession(session)">
            <div class="timeline-row__header">
              <div>
                <h3>Session</h3>
                <p>{{ formatSessionWindow(session) }}</p>
              </div>
              <span class="timeline-row__meta">{{ session.images.length }} images · {{ session.identityIds.length }} identities</span>
            </div>
            <div class="timeline-track">
              <div class="session-block" :style="getSessionBlockStyle(session)"></div>
              <div v-for="image in session.images" :key="image.id" class="image-marker"
                :style="getImageMarkerStyle(image)">
                <span class="image-marker__tooltip">
                  <strong>{{ image.filename }}</strong>
                  <small>{{ formatDisplay(image.capturedAt) }}</small>
                </span>
              </div>
            </div>
            <div class="timeline-identities">
              <span v-for="identity in session.identities" :key="identity.id" class="identity-chip">
                {{ identity.fullName }}
              </span>
            </div>
          </button>
        </div>
      </div>
    </section>

    <section v-if="selectedSessionForm" class="timeline-card">
      <header class="timeline-card__header">
        <div>
          <h2>Edit Session</h2>
          <p>Adjust the selected session and update associated images.</p>
        </div>
      </header>

      <form class="editor-form" @submit.prevent="saveSessionEdits">
        <div class="form-grid">
          <label>
            <span>Session start</span>
            <input type="datetime-local" v-model="selectedSessionForm.startLocal" required />
          </label>
          <label>
            <span>Session end</span>
            <input type="datetime-local" v-model="selectedSessionForm.endLocal" required />
          </label>
        </div>

        <label class="full-width">
          <span>Identities in session</span>
          <select multiple v-model="selectedSessionForm.identityIds">
            <option v-for="identity in identityOptions" :key="identity.id" :value="identity.id">
              {{ formatIdentityOption(identity) }}
            </option>
          </select>
        </label>

        <div class="images-editor">
          <div class="images-editor__header">
            <h3>Images</h3>
            <p>Toggle which images belong to this session and adjust their timestamps.</p>
          </div>

          <div v-if="selectedSessionForm.images.length === 0" class="empty-state">
            This session does not currently have any images.
          </div>

          <div v-else class="image-list">
            <div class="image-row" v-for="imageForm in selectedSessionForm.images" :key="imageForm.id">
              <label class="image-row__include">
                <input type="checkbox" v-model="imageForm.included" />
                <span>Include</span>
              </label>
              <div class="image-row__details">
                <span class="image-row__name">{{ imageForm.filename }}</span>
                <span class="image-row__path">{{ imageForm.directoryPath }}</span>
              </div>
              <input type="datetime-local" v-model="imageForm.timestampLocal" />
            </div>
          </div>

          <div class="add-image">
            <label>
              <span>Add image by ID</span>
              <input type="text" v-model.trim="selectedSessionForm.addImageId" placeholder="Image document ID" />
            </label>
          </div>
        </div>

        <div class="editor-actions">
          <button type="submit" :disabled="isSaving">
            <span v-if="isSaving">Saving…</span>
            <span v-else>Save changes</span>
          </button>
          <button type="button" class="ghost" :disabled="isSaving" @click="resetSelection">Cancel</button>
        </div>
      </form>
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

function toIsoString(value) {
  const date = value instanceof Date ? value : parseLocalInput(value);
  if (!date) {
    return null;
  }

  return date.toISOString();
}

function buildIdentityLabel(identity) {
  const name = identity.fullName || [identity.firstName, identity.lastName].filter(Boolean).join(' ');
  const segments = [];
  if (identity.campusLabel) {
    segments.push(identity.campusLabel);
  }
  if (identity.gradeLabel) {
    segments.push(identity.gradeLabel);
  }
  if (identity.houseLabel) {
    segments.push(identity.houseLabel);
  }

  return segments.length > 0 ? `${name} — ${segments.join(' • ')}` : name;
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
      isSaving: false,
      errorMessage: '',
      successMessage: '',
      selectedSessionId: null,
      selectedSessionForm: null,
      selectedSessionOriginal: null,
    };
  },
  computed: {
    rangeStartDate() {
      return parseLocalInput(this.rangeStart);
    },
    rangeEndDate() {
      return parseLocalInput(this.rangeEnd);
    },
    rangeDurationMs() {
      const start = this.rangeStartDate?.getTime();
      const end = this.rangeEndDate?.getTime();
      if (!start || !end || end <= start) {
        return 1;
      }
      return end - start;
    },
    identityOptions() {
      const map = new Map();
      this.allIdentities.forEach((identity) => {
        map.set(identity.id, identity);
      });

      if (this.selectedSessionOriginal?.identities) {
        this.selectedSessionOriginal.identities.forEach((identity) => {
          if (!map.has(identity.id)) {
            map.set(identity.id, identity);
          }
        });
      }

      return Array.from(map.values());
    },
  },
  async created() {
    if (!this.showLogin) {
      await this.initialize();
    }
  },
  methods: {
    async initialize() {
      await this.loadIdentities();
      await this.loadSessions();
    },
    formatDisplay(date) {
      if (!date) {
        return '—';
      }
      const actual = date instanceof Date ? date : new Date(date);
      if (Number.isNaN(actual.getTime())) {
        return '—';
      }
      return actual.toLocaleString();
    },
    formatSessionWindow(session) {
      const startLabel = this.formatDisplay(session.start);
      const endLabel = this.formatDisplay(session.end);
      return `${startLabel} → ${endLabel}`;
    },
    formatIdentityOption(identity) {
      return buildIdentityLabel(identity);
    },
    normalizeSessionPayload(payload) {
      const startIso = payload.session_start_dt || payload.start || null;
      const endIso = payload.session_end_dt || payload.end || null;
      const startDate = startIso ? new Date(startIso) : null;
      const endDate = endIso ? new Date(endIso) : null;

      const identityIds = Array.isArray(payload.identityIds)
        ? payload.identityIds.filter((id) => typeof id === 'string')
        : [];

      const identities = Array.isArray(payload.identities)
        ? payload.identities.map((identity) => ({
          ...identity,
          fullName:
            identity.fullName || [identity.firstName, identity.lastName].filter(Boolean).join(' '),
          campusLabel: identity.campusLabel || getCampusString(identity.campus),
          gradeLabel: identity.gradeLabel || getGradeString(identity.grade),
          houseLabel: identity.houseLabel || getHouseString(identity.house),
        }))
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
    async loadSessions() {
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
      this.successMessage = '';

      try {
        const results = await fetchSessionsWithinRange(startDate.toISOString(), endDate.toISOString());
        const normalized = results.map((session) => this.normalizeSessionPayload(session));
        this.sessions = normalized;

        if (normalized.length === 0) {
          this.selectedSessionId = null;
          this.selectedSessionForm = null;
          this.selectedSessionOriginal = null;
        } else if (!this.selectedSessionId || !normalized.some((session) => session.id === this.selectedSessionId)) {
          this.selectSession(normalized[0]);
        } else {
          const session = normalized.find((item) => item.id === this.selectedSessionId);
          if (session) {
            this.selectSession(session);
          }
        }
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
    selectSession(session) {
      if (!session) {
        return;
      }

      this.selectedSessionId = session.id;
      this.selectedSessionOriginal = JSON.parse(JSON.stringify(session));

      const images = session.images.map((image) => ({
        id: image.id,
        filename: image.filename,
        directoryPath: image.directoryPath,
        timestampLocal: formatDateTimeLocal(image.capturedAtIso),
        originalTimestamp: image.capturedAtIso,
        included: true,
      }));

      this.selectedSessionForm = {
        startLocal: formatDateTimeLocal(session.start),
        endLocal: formatDateTimeLocal(session.end),
        identityIds: [...session.identityIds],
        images,
        addImageId: '',
      };
    },
    resetSelection() {
      if (!this.selectedSessionId) {
        return;
      }

      const session = this.sessions.find((item) => item.id === this.selectedSessionId);
      if (session) {
        this.selectSession(session);
      }
    },
    getSessionBlockStyle(session) {
      const rangeStartMs = this.rangeStartDate ? this.rangeStartDate.getTime() : 0;
      const duration = this.rangeDurationMs || 1;
      const sessionStart = session.startMs ?? rangeStartMs;
      const sessionEnd = session.endMs ?? sessionStart;
      const clamp = (value) => Math.min(100, Math.max(0, value));
      const left = clamp(((sessionStart - rangeStartMs) / duration) * 100);
      const width = clamp(((sessionEnd - sessionStart) / duration) * 100);
      return {
        left: `${left}%`,
        width: `${Math.max(width, 1)}%`,
      };
    },
    getImageMarkerStyle(image) {
      const rangeStartMs = this.rangeStartDate ? this.rangeStartDate.getTime() : 0;
      const duration = this.rangeDurationMs || 1;
      const capturedMs = image.capturedAt ? image.capturedAt.getTime() : rangeStartMs;
      const position = Math.min(100, Math.max(0, ((capturedMs - rangeStartMs) / duration) * 100));
      return {
        left: `${position}%`,
      };
    },
    async saveSessionEdits() {
      if (!this.selectedSessionId || !this.selectedSessionForm) {
        return;
      }

      const startDate = parseLocalInput(this.selectedSessionForm.startLocal);
      const endDate = parseLocalInput(this.selectedSessionForm.endLocal);
      if (!startDate || !endDate || endDate <= startDate) {
        this.errorMessage = 'Please ensure the session start is before the session end.';
        return;
      }

      const identityIds = Array.isArray(this.selectedSessionForm.identityIds)
        ? [...new Set(this.selectedSessionForm.identityIds.filter((value) => typeof value === 'string' && value.trim() !== ''))]
        : [];

      const includedImages = this.selectedSessionForm.images
        .filter((image) => image.included)
        .map((image) => image.id)
        .filter((value) => typeof value === 'string' && value.trim() !== '');

      const newImageId = this.selectedSessionForm.addImageId;
      if (newImageId) {
        includedImages.push(newImageId);
      }

      const uniqueImageIds = [...new Set(includedImages)];
      const originalImageMap = new Map(
        (this.selectedSessionOriginal?.images || []).map((image) => [image.id, image.capturedAtIso]),
      );

      const imageUpdates = [];
      this.selectedSessionForm.images.forEach((image) => {
        if (!image.included) {
          return;
        }
        const iso = toIsoString(image.timestampLocal);
        const originalIso = originalImageMap.get(image.id) || null;
        if (iso && iso !== originalIso) {
          imageUpdates.push({
            imageId: image.id,
            exif_date_time_original: iso,
          });
        }
      });

      const sessionPayload = {
        session_start_dt: startDate.toISOString(),
        session_end_dt: endDate.toISOString(),
        identityIds: identityIds,
        imageIds: uniqueImageIds,
      };

      this.isSaving = true;
      this.errorMessage = '';
      this.successMessage = '';

      try {
        await updateSessionAndImages(this.selectedSessionId, sessionPayload, imageUpdates);
        await this.loadSessions();
        this.successMessage = 'Session updated successfully.';
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          this.handleSessionExpired();
        } else {
          console.error('Failed to update session', error);
          this.errorMessage = error.message || 'Unable to update the session.';
        }
      } finally {
        this.isSaving = false;
      }
    },
    handleAuthenticated() {
      this.showLogin = false;
      this.initialize();
    },
    handleSessionExpired() {
      clearSessionCookies();
      this.showLogin = true;
      this.sessions = [];
      this.selectedSessionId = null;
      this.selectedSessionForm = null;
      this.selectedSessionOriginal = null;
    },
  },
};
</script>

<style scoped>
.timeline-view {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.timeline-card {
  background: #ffffff;
  border-radius: 1rem;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.timeline-card__header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.timeline-card__header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.timeline-card__header p {
  margin: 0.25rem 0 0;
  color: #4b5563;
  font-size: 0.95rem;
}

.range-form {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
}

.range-form label {
  display: flex;
  flex-direction: column;
  font-size: 0.85rem;
  color: #4b5563;
}

.range-form input[type="datetime-local"] {
  margin-top: 0.25rem;
  padding: 0.45rem 0.6rem;
  border-radius: 0.5rem;
  border: 1px solid #cbd5f5;
  font-size: 0.95rem;
}

.range-form button {
  background: #2563eb;
  color: #ffffff;
  border: none;
  border-radius: 0.75rem;
  padding: 0.55rem 1.25rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.range-form button:disabled {
  opacity: 0.6;
  cursor: wait;
}

.range-form button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
}

.alert {
  padding: 0.65rem 0.85rem;
  border-radius: 0.6rem;
  font-size: 0.9rem;
}

.alert--error {
  background: rgba(220, 38, 38, 0.1);
  color: #b91c1c;
}

.alert--success {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.empty-state {
  background: #f9fafb;
  border-radius: 0.75rem;
  padding: 1.25rem;
  text-align: center;
  color: #4b5563;
  font-size: 0.95rem;
}

.timeline-chart {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.timeline-axis {
  display: flex;
  justify-content: space-between;
  color: #6b7280;
  font-size: 0.85rem;
  padding: 0 0.5rem;
}

.timeline-rows {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.timeline-row {
  background: #f8fafc;
  border: 1px solid transparent;
  border-radius: 1rem;
  padding: 1rem;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.timeline-row--active {
  border-color: #2563eb;
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.15);
  background: #eef2ff;
}

.timeline-row__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.timeline-row__header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.timeline-row__header p {
  margin: 0.25rem 0 0;
  color: #4b5563;
  font-size: 0.9rem;
}

.timeline-row__meta {
  font-size: 0.85rem;
  color: #6b7280;
}

.timeline-track {
  position: relative;
  height: 3rem;
  background: linear-gradient(90deg, rgba(148, 163, 184, 0.2) 0, rgba(148, 163, 184, 0.3) 100%);
  border-radius: 999px;
  overflow: hidden;
}

.session-block {
  position: absolute;
  top: 0.4rem;
  bottom: 0.4rem;
  background: linear-gradient(90deg, #2563eb, #7c3aed);
  border-radius: 999px;
  opacity: 0.9;
}

.image-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0.25rem;
  margin-left: -0.125rem;
  background: #f97316;
  border-radius: 999px;
}

.image-marker__tooltip {
  position: absolute;
  top: -2.75rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(17, 24, 39, 0.9);
  color: #f9fafb;
  padding: 0.35rem 0.5rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  white-space: nowrap;
  display: none;
}

.image-marker:hover .image-marker__tooltip {
  display: block;
}

.timeline-identities {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.identity-chip {
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  font-size: 0.8rem;
}

.editor-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.full-width {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.full-width select {
  border-radius: 0.65rem;
  border: 1px solid #cbd5f5;
  padding: 0.6rem;
  min-height: 8rem;
  font-size: 0.95rem;
}

.images-editor {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.images-editor__header h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: #1f2937;
}

.images-editor__header p {
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
  color: #4b5563;
}

.image-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.image-row {
  display: grid;
  grid-template-columns: auto 1fr 14rem;
  gap: 0.75rem;
  align-items: center;
  background: #f9fafb;
  border-radius: 0.75rem;
  padding: 0.75rem;
}

.image-row__include {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.9rem;
  color: #1f2937;
}

.image-row__details {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.image-row__name {
  font-weight: 600;
  color: #1f2937;
}

.image-row__path {
  font-size: 0.8rem;
  color: #6b7280;
}

.image-row input[type="datetime-local"] {
  border-radius: 0.65rem;
  border: 1px solid #cbd5f5;
  padding: 0.5rem;
  font-size: 0.9rem;
}

.add-image label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: #1f2937;
}

.add-image input[type="text"] {
  border-radius: 0.65rem;
  border: 1px solid #cbd5f5;
  padding: 0.5rem 0.6rem;
  font-size: 0.95rem;
}

.editor-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.editor-actions button {
  border-radius: 0.75rem;
  border: none;
  padding: 0.65rem 1.5rem;
  font-weight: 600;
  cursor: pointer;
}

.editor-actions button:first-child {
  background: #2563eb;
  color: #ffffff;
}

.editor-actions button.ghost {
  background: transparent;
  color: #2563eb;
}

@media (max-width: 1200px) {
  .timeline-view {
    grid-template-columns: 1fr;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .image-row {
    grid-template-columns: 1fr;
  }

  .image-row input[type="datetime-local"] {
    width: 100%;
  }

  .timeline-track {
    height: 2.5rem;
  }
}
</style>
