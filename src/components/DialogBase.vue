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
    display: flex;
    flex-direction: column;
    gap: 1.4rem;
    background-color: #222;
    color: #fff;
    border: 1px solid #444;
    border-radius: 0.5rem;
    padding: 2rem;
    width: 400px;
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
input {
    width: 100%;
    padding: .7rem;
    border: 1px solid #444;
    border-radius: 0.5rem;
    background-color: #222;
    color: #fff;
}

::placeholder {
    color: #ccc;
}

.dialog button {
    width: 100%;
    padding: 0.5rem;
    background-color: #222;
    color: #fff;
    border: none;
    border-radius: 0.5rem;
    border: 1px solid #444;
    cursor: pointer;
    font-weight: bold;
    font-size: large;
}

.dialog button:hover {
    background-color: #555;
}

label {
  display: block;
  margin-bottom: .4rem;
  color: #ddd;
  text-transform: capitalize;
  text-align: left;
  font-size: .9rem;
}

select {
  width: 100%;
  border: none;
  border-radius: .5rem;
  background-color: #222;
  border: 1px solid #444;
  color: #ccc;
  padding: .7rem;
}
</style>