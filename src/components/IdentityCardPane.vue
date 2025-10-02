<template>
    <ul ref="list">
        <slot></slot>
    </ul>
</template>

<script>
export default {
    name: "IdentityCardPane"
};
</script>

<style scoped>
ul {
    display: flex;
    flex-direction: column;
    gap: .7rem;
    height: 100%;
    list-style: none;
    background-color: #222;
    border: 1px solid #444;
    border-radius: 0.5rem;
    margin: 0;
    padding: .7rem;
    padding-bottom: 0;
    overflow-y: auto;
}
</style>
