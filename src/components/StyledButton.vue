<template>
  <button :style="buttonStyles" class="styled-button" :disabled="disabled">
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
        ? this.disabledButtonColor || this.adjustColor(this.buttonColor, 0.133)
        : this.buttonColor;
      const color = this.disabled
        ? this.disabledTextColor || this.adjustColor(this.textColor, 1)
        : this.textColor;

      const background = backgroundColor;
      const isGradient = typeof background === 'string' && background.includes('gradient');

      return {
        color,
        background,
        backgroundColor: isGradient ? 'transparent' : background,
        border: isGradient ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
        padding: '.65rem .9rem',
        borderRadius: '.85rem',
        cursor: this.disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: this.disabled ? 'none' : 'auto',
        boxShadow: isGradient && !this.disabled ? '0 18px 40px rgba(108, 126, 255, 0.35)' : 'none',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, background 0.3s ease, color 0.3s ease',
        backdropFilter: isGradient ? 'blur(6px)' : 'none'
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
  transition: transform 0.3s ease, box-shadow 0.3s ease, filter 0.3s ease;
  font-size: .95rem;
  font-weight: bold;
  text-transform: capitalize;
}

.styled-button:hover {
  filter: brightness(1.02);
  transform: translateY(-2px);
}

.styled-button:disabled {
  filter: none;
  transform: none;
}
</style>
