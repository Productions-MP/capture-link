<template>
  <DialogLogin v-if="this.showLogIn" @authenticated="handleGotSession" />

  <DialogAddIdentity v-if="this.showAddIdentity" :filterObject="this.identitiesFilterObject"
    @identity-created="handleIdentityCreated" @hide-add-identity="this.showAddIdentity = false"
    @session-expired="handleSessionExpired" />

  <div class="top-section">
    <identity-search :identities="identities" :filterObject="identitiesFilterObject"
      :isSessionActive="this.isSessionActive" @add-identity="addIdentityToActive"
      @add-all-from-filter="addAllFromFilter" />
  </div>

  <div class="bottom-section">
    <session-manager :activeIdentities="activeIdentities" :isSessionActive="this.isSessionActive" :isDisabled="this.isDisabled"
      @start-session="startSession" @end-session="endSession" @remove-identity="removeIdentityFromActive"
      @clear-identities="clearIdentitiesFromActive" @show-add-identity="this.showAddIdentity = true" />
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
    identitiesFilterObject() {
      return getObjectArrayFilterObject(this.identities)
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
          (aI) => aI.firstName === identity.firstName && aI.lastName === identity.lastName
        );
        if (index !== -1) {
          this.activeIdentities.push(this.identities.splice(index, 1)[0]);
        }
      }
    },
    removeIdentityFromActive(identity) {
      if (!this.isSessionActive) {
        const index = this.activeIdentities.findIndex(
          (aI) => aI.firstName === identity.firstName && aI.lastName === identity.lastName
        );
        if (index !== -1) {
          this.identities.push(this.activeIdentities.splice(index, 1)[0]);
        }
      }
    },
    addAllFromFilter(filteredIdentities) {
      if (!this.isSessionActive) {
        filteredIdentities.forEach(identity => {
          const index = this.identities.findIndex(
            (aI) => aI.firstName === identity.firstName && aI.lastName === identity.lastName
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
    }
  },
};
</script>

<style>
#app {
  height: 100vh;
  font-family: sans-serif;
  display: flex;
  flex-direction: column;
  gap: 1%;
  padding: 0.7rem;
}

.top-section {
  height: 44.5%;
  flex-shrink: 0;
}

.bottom-section {
  height: 54.5%;
  flex-shrink: 0;
}
</style>
