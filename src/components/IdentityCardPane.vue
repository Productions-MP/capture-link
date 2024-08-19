<template>
    <ul>
        <slot></slot>
    </ul>
</template>

<script>
    export default {
        name: "IdentityCardPane"
    }
</script>

<style scoped>
ul {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: .75rem;
    list-style: none;
    list-style-position: inside;
    background-color: #333;
    border: 1px solid #444;
    border-radius: 0.5rem;
    margin: 0;
    padding: .7rem;
    padding-bottom: 0;
    overflow: scroll;
}
</style>