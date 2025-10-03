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

        <StyledButton @click="clearDropdownFilters" text-color="#0e1430" button-color="#f4f6ff"
          :disabled="!hasActiveFilters">
          Clear Filters
        </StyledButton>

        <StyledButton @click="addAllFromFilter" text-color="#ffffff"
          button-color="linear-gradient(135deg, #ff85d8 0%, #7a7dff 45%, #46d7ff 100%)"
          :disabled-button-color="'rgba(38, 46, 84, 0.75)'"
          :disabled-text-color="'rgba(189, 201, 255, 0.6)'"
          :disabled="!canAddAllToSession">
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
  padding: 0 1rem .75rem 1rem;
  font-weight: 600;
  text-transform: uppercase;
  font-size: .75rem;
  letter-spacing: .08em;
  color: rgba(218, 225, 255, 0.75);
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
  border-radius: 0.85rem;
  background-color: rgba(19, 26, 50, 0.85);
  border: 1px solid rgba(126, 140, 255, 0.35);
  color: #f6f7ff;
  padding: .65rem .75rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

input::placeholder {
  color: rgba(202, 211, 255, 0.55);
}

.search-input button {
  position: absolute;
  right: .1rem;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(214, 221, 255, 0.7);
  padding: .35rem .55rem;
  border-radius: .6rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-input button:hover {
  background: rgba(120, 132, 255, 0.18);
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
  background: linear-gradient(160deg, rgba(13, 19, 42, 0.8), rgba(9, 12, 30, 0.65));
  border-radius: 1rem;
  border: 1px solid rgba(134, 150, 255, 0.25);
  padding: .9rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(18px);
}

.filter-row label {
  display: block;
  margin-bottom: .4rem;
  color: rgba(222, 229, 255, 0.75);
  text-transform: capitalize;
  font-size: small;
}

.filter-row select {
  width: 100%;
  border-radius: .75rem;
  background-color: rgba(17, 22, 42, 0.8);
  border: 1px solid rgba(94, 109, 188, 0.35);
  color: #f2f4ff;
  padding: .55rem;
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
  padding: 0.45rem;
  background: rgba(18, 24, 50, 0.75);
  border: 1px solid rgba(120, 136, 240, 0.3);
  color: rgba(216, 223, 255, 0.8);
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
  background: linear-gradient(135deg, rgba(126, 155, 255, 0.85), rgba(65, 215, 255, 0.65));
  color: #091021;
}
</style>