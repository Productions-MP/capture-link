<template>
  <DialogLogin v-if="this.showLogIn" @gotMongoSession="handleGotMongoSession" />

  <DialogAddIdentity v-if="this.showAddIdentity" :filterObject="this.identitiesFilterObject" @identity-created="handleIdentityCreated"
    @hide-add-identity="this.showAddIdentity = false" />

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
  hasMongoSessionAccessTokenCookie,
  hasMongoSessionRefreshTokenCookie,
  hasMongoSessionCookies,
  refreshMongoSessionAccessToken,
  getIdentities,
  postMongoCaptureLinkSessionStart,
  postMongoCaptureLinkSessionEnd,
  getObjectArrayFilterObject
} from '@/utils/app'
import DialogLogin from '@/components/DialogLogin.vue';
import DialogAddIdentity from '@/components/DialogAddIdentity.vue';
import IdentitySearch from "./components/IdentitySearch.vue";
import SessionManager from "./components/SessionManager.vue";


export default {
  data() {
    return {
      showLogIn: !hasMongoSessionCookies(),
      showAddIdentity: false,
      identities: [],
      activeIdentities: [],
      isSessionActive: false,
      isDisabled: false,
      sessionId: null,
    };
  },
  async created() {
    if (!hasMongoSessionAccessTokenCookie() && hasMongoSessionRefreshTokenCookie()) {
      await refreshMongoSessionAccessToken()
    }
    this.identities = await getIdentities()
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
    hasMongoSessionCookies,
    getObjectArrayFilterObject,
    async handleGotMongoSession() {
      this.showLogIn = false
      this.identities = await getIdentities()
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
      if (this.activeIdentities.length > 0) {
        this.isDisabled = true
        this.sessionId = await postMongoCaptureLinkSessionStart(this.activeIdentities)
        if (this.sessionId) {
          this.isSessionActive = true
          this.isDisabled = false
        }
      }
    },
    async endSession() {
      this.isDisabled = true
      const isSuccess = await postMongoCaptureLinkSessionEnd(this.sessionId)
      if (isSuccess) {
        this.sessionId = null
        this.isSessionActive = false
        this.isDisabled = false
      }
    },
    handleIdentityCreated(identity) {
      this.activeIdentities.push(identity)
      this.showAddIdentity = false
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
  gap: 0.7rem;
  padding: 0.7rem;
}

.top-section {
  height: 40%;
}

.bottom-section {
  height: 60%;
}
</style>
