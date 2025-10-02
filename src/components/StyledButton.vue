<template>
  <button
    :style="buttonStyles"
    class="styled-button"
    :disabled="disabled"
  >
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
    },
    disabledButtonColor: {
      type: String,
      default: null
    },
    disabledTextColor: {
      type: String,
      default: null
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    buttonStyles() {
      const backgroundColor = this.disabled
        ? this.disabledButtonColor || this.adjustColor(this.buttonColor, 0.65)
        : this.buttonColor;
      const color = this.disabled
        ? this.disabledTextColor || this.adjustColor(this.textColor, 0.8)
        : this.textColor;

      return {
        color,
        backgroundColor,
        border: 'none',
        padding: '.5rem .7rem',
        borderRadius: '.5rem',
        cursor: this.disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: this.disabled ? 'none' : 'auto'
      };
    }
  },
  methods: {
    adjustColor(hexColor, factor) {
      if (!hexColor) {
        return hexColor;
      }

      let hex = hexColor.replace('#', '');

      if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
      }

      if (hex.length !== 6) {
        return hexColor;
      }

      const clamp = (value) => Math.min(255, Math.max(0, value));
      const channels = hex.match(/.{2}/g);

      if (!channels) {
        return hexColor;
      }

      const adjusted = channels
        .map(channel => {
          const decimal = parseInt(channel, 16);
          if (Number.isNaN(decimal)) {
            return channel;
          }
          return clamp(Math.round(decimal * factor)).toString(16).padStart(2, '0');
        })
        .join('');

      return `#${adjusted}`;
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

.styled-button:disabled {
  filter: none;
}
</style>
