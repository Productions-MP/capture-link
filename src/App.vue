<template>
    <DialogLogin v-if="!hasMongoSessionCookies()" @gotMongoSession="handleGotMongoSession"/>
    <div class="top-section">
        <identity-search :identities="identities" :filterObject="identitiesFilterObject" :isSessionActive="this.isSessionActive"
            @add-identity="addIdentityToActive" />
    </div>
    <div class="bottom-section">
        <session-manager :activeIdentities="activeIdentities" :isSessionActive="this.isSessionActive"
            @start-session="startSession" @end-session="endSession" @remove-identity="removeIdentityFromActive"
            @clear-identities="clearIdentitesFromActive" />
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
import IdentitySearch from "./components/IdentitySearch.vue";
import SessionManager from "./components/SessionManager.vue";


export default {
    data() {
        return {
            identities: [],
            activeIdentities: [],
            isSessionActive: false,
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
        DialogLogin
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
            this.identities = await getIdentities()
        },
        addIdentityToActive(identity) {
            if (!this.isSessionActive) {
                if (!this.activeIdentities.some((aI) => {
                    aI.firstName + aI.lastName === identity.firstName + identity.lastName
                })) {
                    this.activeIdentities.push(identity);
                }
            }
        },
        removeIdentityFromActive(identity) {
            if (!this.isSessionActive) {
                this.activeIdentities = this.activeIdentities.filter(
                    (aI) => aI.firstName + aI.lastName !== identity.firstName + identity.lastName
                );
            }
        },
        clearIdentitesFromActive() {
            if (!this.isSessionActive) {
                this.activeIdentities = [];
            }
        },
        async startSession() {
            if (this.activeIdentities.length > 0) {
                this.sessionId = await postMongoCaptureLinkSessionStart(this.activeIdentities)
                if (this.sessionId) this.isSessionActive = true
            }
        },
        async endSession() {
            const isSuccess = await postMongoCaptureLinkSessionEnd(this.sessionId)
            if (isSuccess) {
                this.sessionId = null
                this.isSessionActive = false
            }
        },
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
