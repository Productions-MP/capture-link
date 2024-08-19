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
    height: 100%; /* Ensure it takes full height of the container */
    display: flex;
    flex-direction: column;
    gap: .75rem;
    list-style: none;
    background-color: #333;
    border: 1px solid #444;
    border-radius: 0.5rem;
    margin: 0;
    padding: .7rem;
    padding-bottom: 0;
    overflow-y: auto; /* Ensure it allows vertical scrolling */
}
</style>
