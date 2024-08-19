<template>
    <div class="session-manager">
        <div class="control-panel">
            <div>
                <StyledButton v-if="!isSessionActive" @click="startSession" text-color="#fff" button-color="#39B357">
                    Start Session
                </StyledButton>

                <StyledButton v-if="isSessionActive" @click="endSession" text-color="#fff" button-color="#ff6644">
                    End Session
                </StyledButton>

                <StyledButton v-if="!isSessionActive" @click="clearSession" text-color="#fff" button-color="#444">
                    Clear Session
                </StyledButton>
            </div>

            <StyledButton @click="logOut()" text-color="#fff" button-color="#444">
                Log Out
            </StyledButton>
        </div>
        <IdentityCardPane ref="identityPane">
            <IdentityCard v-for="identity in activeIdentities" :key="identity.firstName + identity.lastName"
                :identity="identity" :image="require('@/assets/minus-circle.svg')" :addIdentity="false"
                @remove-identity="$emit('remove-identity', $event)" />
        </IdentityCardPane>
    </div>
</template>

<script>
import { clearMongoSessionCookies } from '@/utils/app';
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
    },
    components: {
        IdentityCard,
        IdentityCardPane,
        StyledButton,
    },
    watch: {
        activeIdentities: {
            handler() {
                this.$nextTick(() => this.scrollToBottom());
            },
            deep: true,
        },
    },
    mounted() {
        this.$nextTick(() => this.scrollToBottom());
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
            clearMongoSessionCookies();
            window.location.reload();
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
