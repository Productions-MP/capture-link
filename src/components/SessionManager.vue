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
                        text-color="#081124"
                        button-color="linear-gradient(135deg, #63ffc7 0%, #51d5ff 45%, #8e7aff 100%)"
                        :disabled-button-color="'rgba(37, 49, 86, 0.8)'"
                        :disabled-text-color="'rgba(176, 192, 255, 0.6)'">
                        {{ this.isDisabled ? 'Starting...' : 'Start Session' }}
                    </StyledButton>

                    <StyledButton v-if="isSessionActive" @click="endSession" text-color="#ffffff"
                        button-color="linear-gradient(135deg, #ff8f84 0%, #ff64c6 48%, #815cff 100%)"
                        :disabled-button-color="'rgba(58, 39, 68, 0.7)'"
                        :disabled-text-color="'rgba(234, 210, 255, 0.6)'">
                        {{ this.isDisabled ? 'Ending...' : 'End Session' }}
                    </StyledButton>

                    <StyledButton v-if="!isSessionActive" @click="clearSession" :disabled="!canClearSession"
                        text-color="#0b1430" button-color="#f3f6ff">
                        Clear Session
                    </StyledButton>
                </div>

                <div class="secondary-actions">
                    <StyledButton v-if="!isSessionActive" @click="this.$emit('show-add-identity')"
                        text-color="#0b1430" button-color="#fdf3ff">
                        Create Identity
                    </StyledButton>

                    <StyledButton v-if="!isSessionActive" @click="handleRefresh()" text-color="#e2e7ff"
                        button-color="rgba(23, 28, 55, 0.85)"
                        :disabled-button-color="'rgba(23, 28, 55, 0.5)'">
                        Refresh Page
                    </StyledButton>

                    <StyledButton @click="logOut()" text-color="#e2e7ff" button-color="rgba(23, 28, 55, 0.85)">
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
    gap: 1.2rem;
}

.session-manager>div {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 3fr);
    align-items: start;
    gap: 1.1rem;
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
    gap: 1.5rem;
}

.control-panel>div {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: .85rem;
    background: linear-gradient(160deg, rgba(17, 24, 53, 0.9), rgba(10, 13, 30, 0.6));
    border-radius: 1.25rem;
    border: 1px solid rgba(120, 137, 255, 0.2);
    padding: 1.1rem;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(16px);
}

.control-panel .secondary-actions {
    background: linear-gradient(160deg, rgba(17, 24, 53, 0.85), rgba(13, 16, 34, 0.7));
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
    padding: 0 1rem .75rem 1rem;
    font-weight: 600;
    text-transform: uppercase;
    font-size: .75rem;
    letter-spacing: .08em;
    color: rgba(218, 225, 255, 0.75);
}
</style>
