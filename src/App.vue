<template>
  <DialogLogin v-if="this.showLogIn" @authenticated="handleGotSession" />

  <DialogAddIdentity v-if="this.showAddIdentity" :filterObject="this.identitiesFilterObject"
    @identity-created="handleIdentityCreated" @hide-add-identity="this.showAddIdentity = false"
    @session-expired="handleSessionExpired" />

  <div class="app-shell">
    <header class="hero">
      <div class="hero__background">
        <span class="hero__glow hero__glow--one"></span>
        <span class="hero__glow hero__glow--two"></span>
        <span class="hero__glow hero__glow--three"></span>
      </div>

      <div class="hero__content">
        <p class="hero__eyebrow">CaptureLink Sessions</p>
        <h1>Orchestrate identity capture with gradients of control</h1>
        <p class="hero__description">
          Search, filter, and activate identities in a single, immersive workspace inspired by the latest n8n
          experience. Craft vibrant sessions with confidence and keep operations flowing in real time.
        </p>

        <div class="hero__actions">
          <button class="hero__cta" type="button" @click="openCreateIdentity">Create identity</button>
          <button class="hero__cta hero__cta--ghost" type="button" @click="refreshIdentities">
            Refresh identities
          </button>
        </div>

        <div class="hero__stats">
          <div class="hero__stat">
            <span class="hero__stat-value">{{ availableIdentitiesCount }}</span>
            <span class="hero__stat-label">Available identities</span>
          </div>
          <div class="hero__stat">
            <span class="hero__stat-value">{{ activeIdentityCount }}</span>
            <span class="hero__stat-label">In session queue</span>
          </div>
          <div class="hero__stat">
            <span class="hero__stat-value" :class="{ 'is-live': isSessionActive }">{{ sessionStatusText }}</span>
            <span class="hero__stat-label">Session status</span>
          </div>
        </div>
      </div>

      <div class="hero__visual">
        <div class="hero__orb hero__orb--left"></div>
        <div class="hero__orb hero__orb--right"></div>
        <div class="hero__orb hero__orb--bottom"></div>
      </div>
    </header>

    <main class="dashboard">
      <section class="panel panel--identities">
        <div class="panel__intro">
          <h2>Identity library</h2>
          <p>Discover and filter the right identities before activating a capture session.</p>
        </div>

        <identity-search :identities="identities" :filterObject="identitiesFilterObject"
          :isSessionActive="this.isSessionActive" @add-identity="addIdentityToActive"
          @add-all-from-filter="addAllFromFilter" />
      </section>

      <section class="panel panel--session">
        <div class="panel__intro">
          <h2>Session builder</h2>
          <p>Stage identities, control the queue, and launch a capture link at the perfect moment.</p>
        </div>

        <session-manager :activeIdentities="activeIdentities" :isSessionActive="this.isSessionActive"
          :isDisabled="this.isDisabled" @start-session="startSession" @end-session="endSession"
          @remove-identity="removeIdentityFromActive" @clear-identities="clearIdentitiesFromActive"
          @show-add-identity="this.showAddIdentity = true" />
      </section>
    </main>
  </div>
</template>

<script>
import {
  hasActiveSession,
  fetchIdentities,
  startCaptureLinkSession,
  endCaptureLinkSession,
  getObjectArrayFilterObject,
  clearSessionCookies,
  UnauthorizedError
} from '@/utils/app'
import DialogLogin from '@/components/DialogLogin.vue';
import DialogAddIdentity from '@/components/DialogAddIdentity.vue';
import IdentitySearch from "./components/IdentitySearch.vue";
import SessionManager from "./components/SessionManager.vue";


export default {
  data() {
    return {
      showLogIn: !hasActiveSession(),
      showAddIdentity: false,
      identities: [],
      activeIdentities: [],
      isSessionActive: false,
      isDisabled: false,
      sessionId: null,
    };
  },
  async created() {
    await this.loadIdentities()
  },
  components: {
    IdentitySearch,
    SessionManager,
    DialogLogin,
    DialogAddIdentity
  },
  computed: {
    availableIdentitiesCount() {
      return this.identities.length;
    },
    activeIdentityCount() {
      return this.activeIdentities.length;
    },
    identitiesFilterObject() {
      const allKnownIdentities = [
        ...this.identities,
        ...this.activeIdentities
      ]

      return getObjectArrayFilterObject(allKnownIdentities)
    },
    sessionStatusText() {
      return this.isSessionActive ? 'Live session' : 'Idle';
    }
  },
  methods: {
    async loadIdentities() {
      if (!hasActiveSession()) {
        this.showLogIn = true
        return
      }

      try {
        this.identities = await fetchIdentities()
      } catch (error) {
        this.handlePotentialUnauthorized(error)
      }
    },
    getObjectArrayFilterObject,
    async handleGotSession() {
      this.showLogIn = false
      await this.loadIdentities()
    },
    addIdentityToActive(identity) {
      if (!this.isSessionActive) {
        const index = this.identities.findIndex(
          (aI) => aI.id === identity.id
        );
        if (index !== -1) {
          this.activeIdentities.push(this.identities.splice(index, 1)[0]);
        }
      }
    },
    removeIdentityFromActive(identity) {
      if (!this.isSessionActive) {
        const index = this.activeIdentities.findIndex(
          (aI) => aI.id === identity.id
        );
        if (index !== -1) {
          this.identities.push(this.activeIdentities.splice(index, 1)[0]);
        }
      }
    },
    addAllFromFilter(filteredIdentities) {
      if (!this.isSessionActive) {
        const toAdd = [...filteredIdentities];
        toAdd.forEach(identity => {
          const index = this.identities.findIndex(
            (aI) => aI.id === identity.id
          );
          if (index !== -1) {
            this.activeIdentities.push(this.identities.splice(index, 1)[0]);
          }
        });
      }
    },
    clearIdentitiesFromActive() {
      if (!this.isSessionActive) {
        this.identities.push(...this.activeIdentities);
        this.activeIdentities = [];
      }
    },
    async startSession() {
      if (this.activeIdentities.length === 0) {
        return
      }

      this.isDisabled = true
      try {
        this.sessionId = await startCaptureLinkSession(this.activeIdentities)
        if (this.sessionId) {
          this.isSessionActive = true
        }
      } catch (error) {
        this.handlePotentialUnauthorized(error)
      } finally {
        this.isDisabled = false
      }
    },
    async endSession() {
      if (!this.sessionId) {
        return
      }

      this.isDisabled = true
      try {
        const isSuccess = await endCaptureLinkSession(this.sessionId)
        if (isSuccess) {
          this.sessionId = null
          this.isSessionActive = false
        }
      } catch (error) {
        this.handlePotentialUnauthorized(error)
      } finally {
        this.isDisabled = false
      }
    },
    handleIdentityCreated(identity) {
      this.activeIdentities.push(identity)
      this.showAddIdentity = false
    },
    handlePotentialUnauthorized(error) {
      if (error instanceof UnauthorizedError) {
        this.handleSessionExpired()
      } else {
        console.error(error)
      }
    },
    handleSessionExpired() {
      clearSessionCookies()
      this.showLogIn = true
      this.showAddIdentity = false
      this.isSessionActive = false
      this.isDisabled = false
      this.sessionId = null
      if (this.activeIdentities.length > 0) {
        this.identities = [...this.activeIdentities, ...this.identities]
        this.activeIdentities = []
      }
    },
    openCreateIdentity() {
      if (!this.isSessionActive) {
        this.showAddIdentity = true
      }
    },
    refreshIdentities() {
      this.loadIdentities()
    }
  },
};
</script>

<style>
:root {
  color-scheme: dark;
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
  background-color: #060b1a;
}

body {
  background: radial-gradient(circle at top left, rgba(111, 82, 255, 0.35), transparent 40%),
    radial-gradient(circle at 80% 0%, rgba(255, 122, 195, 0.35), transparent 45%),
    #050712;
  min-height: 100vh;
  margin: 0;
  color: #f4f5ff;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 2.5rem clamp(1.5rem, 4vw, 3.5rem) 3rem;
  box-sizing: border-box;
}

.app-shell {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.hero {
  position: relative;
  overflow: hidden;
  border-radius: 2.25rem;
  padding: clamp(2.5rem, 5vw, 4rem);
  background: radial-gradient(circle at 20% 20%, rgba(255, 145, 234, 0.45) 0%, transparent 60%),
    linear-gradient(135deg, rgba(17, 27, 54, 0.95) 10%, rgba(33, 18, 78, 0.92) 90%);
  box-shadow: 0 25px 80px rgba(16, 18, 52, 0.55);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: clamp(2rem, 5vw, 4rem);
  isolation: isolate;
}

.hero__background {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.hero__glow {
  position: absolute;
  width: clamp(18rem, 40vw, 28rem);
  height: clamp(18rem, 40vw, 28rem);
  filter: blur(60px);
  opacity: 0.65;
  animation: drift 18s ease-in-out infinite alternate;
}

.hero__glow--one {
  top: -25%;
  left: -10%;
  background: radial-gradient(circle, rgba(129, 88, 255, 0.85), transparent 65%);
}

.hero__glow--two {
  top: 10%;
  right: 5%;
  background: radial-gradient(circle, rgba(255, 134, 194, 0.85), transparent 60%);
  animation-duration: 22s;
}

.hero__glow--three {
  bottom: -20%;
  left: 40%;
  background: radial-gradient(circle, rgba(94, 211, 255, 0.65), transparent 60%);
  animation-duration: 26s;
}

@keyframes drift {
  from {
    transform: translate3d(-5%, -5%, 0) scale(1);
  }
  to {
    transform: translate3d(5%, 5%, 0) scale(1.1);
  }
}

.hero__content,
.hero__visual {
  position: relative;
  z-index: 1;
}

.hero__content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.hero__eyebrow {
  font-size: 0.85rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: rgba(228, 232, 255, 0.75);
}

.hero__description {
  max-width: 32rem;
  color: rgba(235, 238, 255, 0.75);
  line-height: 1.7;
  font-size: 1.05rem;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
}

.hero__cta {
  border: none;
  border-radius: 999px;
  padding: 0.85rem 1.65rem;
  font-weight: 600;
  font-size: 0.95rem;
  letter-spacing: 0.02em;
  cursor: pointer;
  color: #091021;
  background: linear-gradient(120deg, #ff9ad7 0%, #8a7dff 50%, #5f9dff 100%);
  box-shadow: 0 18px 45px rgba(108, 99, 255, 0.45);
  transition: transform 0.4s ease, box-shadow 0.4s ease;
}

.hero__cta:hover {
  transform: translateY(-4px);
  box-shadow: 0 25px 60px rgba(108, 99, 255, 0.55);
}

.hero__cta:active {
  transform: translateY(0);
}

.hero__cta--ghost {
  background: rgba(8, 11, 27, 0.55);
  border: 1px solid rgba(160, 173, 255, 0.5);
  color: rgba(226, 230, 255, 0.9);
  box-shadow: none;
}

.hero__cta--ghost:hover {
  border-color: rgba(226, 230, 255, 0.8);
  box-shadow: 0 18px 45px rgba(47, 55, 126, 0.35);
}

.hero__stats {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(1rem, 3vw, 2.5rem);
}

.hero__stat {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.hero__stat-value {
  font-size: clamp(1.4rem, 3vw, 2rem);
  font-weight: 600;
  color: #f8f7ff;
}

.hero__stat-value.is-live {
  color: #66f0c6;
}

.hero__stat-label {
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(218, 225, 255, 0.6);
}

.hero__visual {
  display: grid;
  place-items: center;
  position: relative;
  min-height: 18rem;
}

.hero__orb {
  position: absolute;
  width: clamp(8rem, 22vw, 16rem);
  height: clamp(8rem, 22vw, 16rem);
  border-radius: 50%;
  filter: blur(0px);
  opacity: 0.8;
  animation: float 14s ease-in-out infinite;
}

.hero__orb--left {
  background: radial-gradient(circle, rgba(255, 145, 234, 0.8), transparent 70%);
  top: 10%;
  left: 12%;
}

.hero__orb--right {
  background: radial-gradient(circle, rgba(126, 155, 255, 0.9), transparent 70%);
  top: -5%;
  right: 10%;
  animation-duration: 18s;
}

.hero__orb--bottom {
  background: radial-gradient(circle, rgba(80, 223, 255, 0.75), transparent 70%);
  bottom: -5%;
  right: 25%;
  animation-duration: 20s;
}

@keyframes float {
  0% {
    transform: translate3d(-10%, 5%, 0) scale(0.95);
  }
  50% {
    transform: translate3d(5%, -5%, 0) scale(1.05);
  }
  100% {
    transform: translate3d(-5%, 10%, 0) scale(0.97);
  }
}

.dashboard {
  display: grid;
  gap: 2rem;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

.panel {
  position: relative;
  padding: clamp(1.5rem, 3vw, 2.5rem);
  border-radius: 1.75rem;
  background: linear-gradient(160deg, rgba(13, 19, 42, 0.85), rgba(10, 13, 30, 0.65));
  border: 1px solid rgba(128, 140, 255, 0.25);
  box-shadow: 0 30px 60px rgba(5, 8, 21, 0.45);
  backdrop-filter: blur(24px);
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.panel::after {
  content: '';
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(140deg, rgba(146, 109, 255, 0.12), rgba(76, 205, 255, 0.08));
  mix-blend-mode: screen;
  opacity: 0.5;
}

.panel__intro {
  position: relative;
  z-index: 1;
}

.panel__intro h2 {
  margin: 0 0 0.35rem;
  font-size: 1.4rem;
  color: #f5f7ff;
}

.panel__intro p {
  margin: 0;
  color: rgba(216, 223, 255, 0.7);
  line-height: 1.6;
}

@media (max-width: 768px) {
  #app {
    padding: 1.5rem 1rem 2.5rem;
  }

  .hero {
    border-radius: 1.75rem;
  }
}
</style>
