<template>
    <div class="session-manager">
        <div class="control-panel">
            <div>
                <StyledButton v-if="!isSessionActive" @click="startSession" :disabled="this.isDisabled" text-color="#fff" button-color="#39B357">
                    {{ this.isDisabled ? 'Starting...' : 'Start Session' }} ({{ this.activeIdentities.length }})
                </StyledButton>

                <StyledButton v-if="isSessionActive" @click="endSession" :disabled="this.isDisabled" text-color="#fff" button-color="#ff6644">
                    {{ this.isDisabled ? 'Ending...' : 'End Session' }} ({{ this.activeIdentities.length }})
                </StyledButton>

                <StyledButton v-if="!isSessionActive" @click="clearSession" :disabled="!canClearSession" text-color="#fff" button-color="#444">
                    Clear Session
                </StyledButton>
            </div>

            <div class="secondary-actions">
                <StyledButton v-if="!isSessionActive" @click="this.$emit('show-add-identity')" text-color="#fff" button-color="#444">
                    Create Identity
                </StyledButton>

                <StyledButton v-if="!isSessionActive" @click="handleRefresh()" text-color="#fff" button-color="#444">
                    Refresh Page
                </StyledButton>

                <StyledButton @click="logOut()" text-color="#fff" button-color="#444">
                    Log Out
                </StyledButton>
            </div>
        </div>
        <IdentityCardPane ref="identityPane">
            <IdentityCard v-for="identity in activeIdentities" :key="identity.firstName + identity.lastName"
                :identity="identity" :image="require('@/assets/minus-circle.svg')" :addIdentity="false"
                @remove-identity="$emit('remove-identity', $event)" />
        </IdentityCardPane>
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
    display: grid;
    grid-template-columns: 1fr 4fr;
    align-items: start;
    gap: .7rem;
}

.control-panel {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.control-panel > div {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: .7rem;
}
</style>
