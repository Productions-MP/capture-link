<template>
  <div id="app">
    <component :is="activeComponent" />
    <nav class="page-switcher">
      <button
        type="button"
        :class="{ active: activePage === 'sessions' }"
        @click="navigate('sessions')"
      >
        Session Manager
      </button>
      <button
        type="button"
        :class="{ active: activePage === 'timeline' }"
        @click="navigate('timeline')"
      >
        Timeline
      </button>
    </nav>
  </div>
</template>

<script>
import CaptureSessionsView from '@/views/CaptureSessionsView.vue';
import TimelineView from '@/views/TimelineView.vue';

function getHashPage() {
  if (typeof window === 'undefined') {
    return 'sessions';
  }
  const raw = window.location.hash ? window.location.hash.replace('#', '').toLowerCase() : '';
  return raw === 'timeline' ? 'timeline' : 'sessions';
}

export default {
  name: 'App',
  components: {
    CaptureSessionsView,
    TimelineView,
  },
  data() {
    return {
      activePage: getHashPage(),
    };
  },
  computed: {
    activeComponent() {
      return this.activePage === 'timeline' ? TimelineView : CaptureSessionsView;
    },
  },
  methods: {
    navigate(page) {
      if (page !== 'sessions' && page !== 'timeline') {
        return;
      }
      this.activePage = page;
    },
    syncHash() {
      if (typeof window === 'undefined') {
        return;
      }
      const desired = this.activePage === 'timeline' ? '#timeline' : '#sessions';
      if (window.location.hash !== desired) {
        window.location.hash = desired;
      }
    },
    handleHashChange() {
      const page = getHashPage();
      if (page !== this.activePage) {
        this.activePage = page;
      }
    },
  },
  watch: {
    activePage() {
      this.syncHash();
    },
  },
  mounted() {
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', this.handleHashChange);
      this.syncHash();
    }
  },
  beforeUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('hashchange', this.handleHashChange);
    }
  },
};
</script>

<style>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f3f4f6;
}

.page-switcher {
  position: fixed;
  top: 1.25rem;
  right: 1.5rem;
  display: flex;
  gap: 0.5rem;
  z-index: 20;
}

.page-switcher button {
  border: none;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.68);
  color: #f8fafc;
  padding: 0.45rem 0.85rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.page-switcher button:hover {
  background: rgba(59, 130, 246, 0.85);
}

.page-switcher button.active {
  background: #2563eb;
}

.page-switcher button:focus {
  outline: 2px solid rgba(59, 130, 246, 0.65);
  outline-offset: 2px;
}
</style>
