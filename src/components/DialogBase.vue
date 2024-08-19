<template>
    <div class="backdrop">
        <div class="dialog">
            <slot></slot>
        </div>
    </div>
</template>

<style scoped>
.backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.dialog {
    background-color: #333;
    color: #fff;
    border: 1px solid #444;
    border-radius: 0.5rem;
    padding: 2rem;
    width: 300px;
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
    text-align: center;
    position: relative;
}

body {
    pointer-events: none;
}

.dialog {
    pointer-events: auto;
}
</style>

<style>
.dialog input {
    width: 100%;
    padding: 0.7rem;
    margin: 0.5rem 0;
    border: 1px solid #444;
    border-radius: 0.5rem;
    background-color: #222;
    color: #fff;
}

.dialog button {
    width: 100%;
    padding: 0.7rem;
    margin-top: 1rem;
    background-color: #444;
    color: #fff;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
}

.dialog button:hover {
    background-color: #555;
}
</style>