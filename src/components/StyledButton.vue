<template>
    <button :style="buttonStyles" class="styled-button">
      <span v-if="icon" class="icon">{{ icon }}</span>
      <slot></slot>
    </button>
  </template>
  
  <script>
  export default {
    name: 'StyledButton',
    props: {
      icon: {
        type: String,
        default: ''
      },
      textColor: {
        type: String,
        default: '#fff'
      },
      buttonColor: {
        type: String,
        default: '#007bff'
      }
    },
    computed: {
      buttonStyles() {
        return {
          color: this.textColor,
          backgroundColor: this.buttonColor,
          border: 'none',
          padding: '.5rem .7rem',
          borderRadius: '.5rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        };
      }
    }
  };
  </script>

<style scoped>
  .styled-button {
    width: 100%;
    transition: background-color 0.3s, color 0.3s;
    font-size: .9rem;
    font-weight: bold;
    text-transform: capitalize;
  }
  
  .styled-button:hover {
    filter: brightness(0.9);
  }

</style>
