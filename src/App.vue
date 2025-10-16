<template>
  <div id="app">
    <header class="app-header">
      <h1 class="app-title">Capture Link</h1>
      <nav class="app-nav">
        <button type="button" class="nav-link" :class="{ active: activePage === 'sessions' }"
          @click="navigate('sessions')">Session Manager</button>
        <button type="button" class="nav-link" :class="{ active: activePage === 'timeline' }"
          @click="navigate('timeline')">Timeline</button>
      </nav>
    </header>
    <main class="app-main">
      <component :is="currentComponent" class="app-view" />
    </main>
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
    currentComponent() {
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
      const desiredHash = this.activePage === 'timeline' ? '#timeline' : '';
      if (window.location.hash !== desiredHash) {
        window.location.hash = desiredHash;
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
  height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f5f5f7;
  color: #1f2933;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #1f2937, #111827);
  color: #f9fafb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.app-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.app-nav {
  display: flex;
  gap: 0.75rem;
}

.nav-link {
  color: #e5e7eb;
  text-decoration: none;
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  transition: background-color 0.2s ease, color 0.2s ease;
  font-weight: 500;
  border: none;
  background: transparent;
  cursor: pointer;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.15);
}

.nav-link.active {
  background-color: #f9fafb;
  color: #111827;
}

.app-main {
  flex: 1 1 auto;
  padding: 1.25rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.app-view {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
}
</style>
