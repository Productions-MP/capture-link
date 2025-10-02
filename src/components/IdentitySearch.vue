<template>
  <div class="controls-results">
    <div>
      <div></div>
      <div class="identity-pane__header">
        <span>Active Identities</span>
        <span>{{ filteredIdentities.length }}</span>
      </div>
    </div>

    <div>
      <div class="controls">
        <div class="filters">
          <div class="filter-row">
            <label>Search</label>
            <div class="search-bar">
              <div class="search-input">
                <input type="text" v-model="searchQuery" @input="handleSearch" />
                <button v-if="searchQuery" type="button" @click="clearSearch">
                  X
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="rocker-switch">
          <input type="radio" id="a-z" :value="1" v-model="sortDirection">
          <label class="left" for="a-z">a - z</label>
          <input type="radio" id="z-a" :value="-1" v-model="sortDirection">
          <label class="right" for="z-a">z - a</label>
        </div>

        <div class="filters">
          <div v-for="(values, key) in filterObject" :key="key" class="filter-row">
            <label :for="key">{{ key }}</label>
            <select :id="key" v-model="selectedFiltersOptions[key]">
              <option></option>
              <option v-for="option in values" :key="option" :value="option">
                {{ getOptionString(key, option) }}
              </option>
            </select>
          </div>
        </div>

        <StyledButton @click="clearDropdownFilters" text-color="#222" button-color="#fff" :disabled="!hasActiveFilters">
          Clear Filters
        </StyledButton>

        <StyledButton @click="addAllFromFilter" text-color="#222" button-color="#fff" :disabled="!canAddAllToSession">
          Add All To Session
        </StyledButton>
      </div>

      <div class="identity-pane">
        <IdentityCardPane>
          <IdentityCard v-for="identity in filteredIdentities" :key="identity.id" :identity="identity"
            :image="require('@/assets/plus-circle.svg')" :addIdentity="true"
            @add-identity="$emit('add-identity', $event)" />
        </IdentityCardPane>
      </div>
    </div>
  </div>
</template>

<script>
import IdentityCard from './IdentityCard.vue';
import IdentityCardPane from './IdentityCardPane.vue';
import StyledButton from './StyledButton.vue';

import {
  getCampusString,
  getGradeString,
  getHouseString
} from '@/utils/app';

export default {
  props: {
    identities: {
      type: Array,
      required: true,
    },
    filterObject: {
      type: Object,
      required: true
    },
    isSessionActive: {
      type: Boolean,
      required: true
    }
  },
  components: {
    IdentityCard,
    IdentityCardPane,
    StyledButton
  },
  data() {
    return {
      searchQuery: '',
      selectedFiltersOptions: {},
      sortDirection: 1
    };
  },
  created() {
    this.resetDropdownModel();
  },
  watch: {
    // If filterObject changes dynamically, keep the model keys in sync
    filterObject: {
      handler() {
        this.resetDropdownModel();
      },
      deep: true
    }
  },
  computed: {
    filteredIdentities() {
      const filtered = this.identities.filter((identity) => {
        const searchWords = this.searchQuery.toLowerCase().split(' ').filter(Boolean);

        const matchesQuery = searchWords.every(word =>
          [identity.firstName, identity.commonName, identity.lastName]
            .some(name => (name || '').toLowerCase().includes(word))
        );

        const matchesFilters = Object.keys(this.selectedFiltersOptions).every((key) => {
          const selectedOption = this.selectedFiltersOptions[key];
          if (selectedOption !== "") {
            const identityValue = identity[key];
            if (identityValue !== null && identityValue !== "") {
              return identityValue === selectedOption;
            }
            return false;
          }
          return true;
        });

        return matchesQuery && matchesFilters;
      });

      if (this.sortDirection !== 0) {
        return filtered.sort((a, b) => {
          const nameA = `${a.lastName || ''}${a.firstName || ''}`.toLowerCase();
          const nameB = `${b.lastName || ''}${b.firstName || ''}`.toLowerCase();

          if (nameA < nameB) return this.sortDirection === 1 ? -1 : 1;
          if (nameA > nameB) return this.sortDirection === 1 ? 1 : -1;
          return 0;
        });
      }

      return filtered;
    },
    hasActiveFilters() {
      return Object.values(this.selectedFiltersOptions || {}).some(value => value !== '');
    },
    canAddAllToSession() {
      return this.filteredIdentities.length > 0;
    }
  },
  methods: {
    getCampusString,
    getGradeString,
    getHouseString,
    getOptionString(key, option) {
      switch (key) {
        case 'campus': return getCampusString(option);
        case 'grade': return getGradeString(option);
        case 'house': return getHouseString(option);
        default: return option;
      }
    },
    addAllFromFilter() {
      this.$emit('add-all-from-filter', this.filteredIdentities);
    },
    handleSearch() {
      // No-op to preserve existing hook if used elsewhere
    },
    clearSearch() {
      this.searchQuery = "";
      this.handleSearch && this.handleSearch();
    },
    resetDropdownModel() {
      // ensure all filter keys exist and are reactive
      const base = {};
      Object.keys(this.filterObject || {}).forEach(k => {
        base[k] = this.selectedFiltersOptions[k] ?? "";
      });
      this.selectedFiltersOptions = base; // replace object to keep reactivity tidy
    },
    clearDropdownFilters() {
      // clear existing keys without this.$set
      const cleared = {};
      Object.keys(this.selectedFiltersOptions).forEach(k => (cleared[k] = ""));
      this.selectedFiltersOptions = cleared; // replace for atomic update
    }
  }
};
</script>

<style scoped>
.search-bar {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: .7rem;
}

.identity-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.identity-pane__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem .25rem 1rem;
  font-weight: bold;
  text-transform: uppercase;
  font-size: .75rem;
  letter-spacing: .05em;
  color: #ccc;
}

.search-input {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 8%;
}

.filters>label {
  display: block;
  margin-bottom: .4rem;
  color: #ccc;
  text-transform: capitalize;
  font-size: small;
}

.search-input input {
  width: 100%;
  height: 100%;
  border-radius: 0.5rem;
  background-color: #222;
  border: 1px solid #444;
  color: #fff;
  padding: .4rem;
}

input::placeholder {
  color: #ccc;
}

.search-input button {
  position: absolute;
  right: .1rem;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: #2220;
  /* border: 1px solid #444; */
  color: #ccc;
  padding: .4rem;
  border-radius: .45rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  /* font-weight: bold; */
}

.search-input button:hover {
  background: #333;
}

.controls-results {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.controls-results>div {
  display: grid;
  grid-template-columns: 1fr 3fr;
  align-items: start;
  gap: .7rem;
}

.controls-results>div:last-child {
  height: 95%;
}

.controls-results>div>* {
  min-height: 0;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: .7rem;
}

.filters {
  display: flex;
  flex-direction: column;
  gap: .7rem;
  background-color: #222;
  border-radius: .5rem;
  border: 1px solid #444;
  padding: .7rem;
}

.filter-row label {
  display: block;
  margin-bottom: .4rem;
  color: #ccc;
  text-transform: capitalize;
  font-size: small;
}

.filter-row select {
  width: 100%;
  border-radius: .5rem;
  background-color: #222;
  border: 1px solid #444;
  color: #ccc;
  padding: .4rem;
}

.rocker-switch {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rocker-switch input[type="radio"] {
  display: none;
}

.rocker-switch input[type="radio"]+label {
  display: block;
  width: 50%;
  text-align: center;
  font-size: .7rem;
  padding: 0.3rem;
  background-color: #222;
  color: #ccc;
  cursor: pointer;
}

.rocker-switch label {
  margin: 0;
}

.rocker-switch .left {
  border-radius: 0.5rem 0 0 0.5rem;
}

.rocker-switch .right {
  border-radius: 0 0.5rem 0.5rem 0;
}

.rocker-switch input[type="radio"]:checked+label {
  background-color: #333;
}
</style>