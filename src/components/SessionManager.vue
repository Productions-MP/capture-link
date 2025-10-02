<template>
    <div class="session-manager">
        <div>
            <div></div>
            <div class="identity-pane__header">
                <span>Session Identities</span>
                <span>{{ activeIdentities.length }}</span>
            </div>
        </div>

        <div>
            <div class="control-panel">
                <div>
                    <StyledButton v-if="!isSessionActive" @click="startSession" :disabled="isStartDisabled"
                        text-color="#222" button-color="#39B357" :disabled-button-color="'#222'">
                        {{ this.isDisabled ? 'Starting...' : 'Start Session' }}
                    </StyledButton>

                    <StyledButton v-if="isSessionActive" @click="endSession" text-color="#222" button-color="#ff6644">
                        {{ this.isDisabled ? 'Ending...' : 'End Session' }}
                    </StyledButton>

                    <StyledButton v-if="!isSessionActive" @click="clearSession" :disabled="!canClearSession"
                        text-color="#222" button-color="#fff">
                        Clear Session
                    </StyledButton>
                </div>

                <div class="secondary-actions">
                    <StyledButton v-if="!isSessionActive" @click="this.$emit('show-add-identity')" text-color="#222"
                        button-color="#fff">
                        Create Identity
                    </StyledButton>

                    <StyledButton v-if="!isSessionActive" @click="handleRefresh()" text-color="#ccc"
                        button-color="#222">
                        Refresh Page
                    </StyledButton>

                    <StyledButton @click="logOut()" text-color="#ccc" button-color="#222">
                        Log Out
                    </StyledButton>
                </div>
            </div>

            <div class="identity-pane">
                <IdentityCardPane ref="identityPane">
                    <IdentityCard v-for="identity in activeIdentities" :key="identity.firstName + identity.lastName"
                        :identity="identity" :image="require('@/assets/minus-circle.svg')" :addIdentity="false"
                        @remove-identity="$emit('remove-identity', $event)" />
                </IdentityCardPane>
            </div>
        </div>
    </div>
</template>

<script>
import { clearSessionCookies } from '@/utils/app';
import IdentityCard from './IdentityCard.vue';
import IdentityCardPane from './IdentityCardPane.vue';
import StyledButton from './StyledButton.vue';

export default {
    props: {
        activeIdentities: {
            type: Array,
            required: true,
        },
        isSessionActive: {
            type: Boolean,
            required: true,
        },
        isDisabled: {
            type: Boolean,
            required: true,
        },
    },
    components: {
        IdentityCard,
        IdentityCardPane,
        StyledButton,
    },
    computed: {
        canClearSession() {
            return !this.isSessionActive && this.activeIdentities.length > 0;
        },
        canStartSession() {
            return !this.isSessionActive && this.activeIdentities.length > 0;
        },
        isStartDisabled() {
            return this.isDisabled || !this.canStartSession;
        }
    },
    watch: {
        activeIdentities: {
            handler() {
                this.$nextTick(() => this.scrollToBottom());
            },
            deep: true,
        },
    },
    methods: {
        startSession() {
            this.$emit('start-session');
        },
        endSession() {
            this.$emit('end-session');
        },
        clearSession() {
            this.$emit('clear-identities');
        },
        logOut() {
            clearSessionCookies();
            window.location.reload();
        },
        handleRefresh() {
            window.location.reload()
        },
        scrollToBottom() {
            const pane = this.$refs.identityPane.$refs.list;
            if (pane) {
                pane.scrollTop = pane.scrollHeight;
            }
        },
    },
};
</script>

<style scoped>
.session-manager {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.session-manager>div {
    display: grid;
    grid-template-columns: 1fr 3fr;
    align-items: start;
    gap: .7rem;
}

.session-manager>div:last-child {
    height: 95%;
}

.session-manager>div>* {
    min-height: 0;
}

.control-panel {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.control-panel>div {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: .7rem;
}

.identity-pane {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.identity-pane__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1rem .25rem 1rem;
    font-weight: bold;
    text-transform: uppercase;
    font-size: .75rem;
    letter-spacing: .05em;
    color: #ccc;
}
</style>
