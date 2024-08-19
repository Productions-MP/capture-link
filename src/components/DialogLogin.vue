<template>
    <BaseDialog>
        <h2>Login Required</h2>
        <input ref="username" placeholder="Username" />
        <input ref="password" type="password" placeholder="Password" />
        <StyledButton @click="handleLogInClick" text-color="#fff" button-color="#39B357">Login</StyledButton>
    </BaseDialog>
</template>

<script>
import BaseDialog from './DialogBase.vue';
import StyledButton from './StyledButton.vue';
import { getMongoSessionTokens } from '@/utils/app';

export default {
    components: {
        BaseDialog,
        StyledButton
    },
    methods: {
        handleLogInClick() {
            const username = this.$refs.username.value
            const password = this.$refs.password.value
            this.showDialog = !getMongoSessionTokens(username, password)
            if (!this.showDialog) this.$emit('gotMongoSession')
        }
    },
};
</script>