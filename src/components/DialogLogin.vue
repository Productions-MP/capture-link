<template>
    <BaseDialog :class="{ shake: isShaking }">
        <h2>Login Required</h2>
        <input ref="username" placeholder="Username" />
        <input ref="password" type="password" placeholder="Password" />
        <StyledButton @click="handleLogInClick" :text-color="isShaking ? '#fff' : '#fff'"
            :button-color="isShaking ? '#ff4d4d' : '#39B357'">
            Login
        </StyledButton>
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
    data() {
        return {
            isShaking: false,
            hasNetworkError: false
        };
    },
    methods: {
        async handleLogInClick() {
            const username = this.$refs.username.value;
            const password = this.$refs.password.value;
            const statusCode = await getMongoSessionTokens(username, password);

            if (statusCode == 200) {
                this.$emit('gotMongoSession');
            } else if (statusCode == 401) {
                this.triggerFailedLoginEffect();
            }
        },
        triggerFailedLoginEffect() {
            this.isShaking = true;
            setTimeout(() => {
                this.isShaking = false;
            }, 500);
        }
    },
};
</script>

<style scoped>
.shake {
    animation: shake 0.5s;
}

@keyframes shake {
    0% {
        transform: translateX(0);
    }

    25% {
        transform: translateX(-5px);
    }

    50% {
        transform: translateX(5px);
    }

    75% {
        transform: translateX(-5px);
    }

    100% {
        transform: translateX(0);
    }
}
</style>
