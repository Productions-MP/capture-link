<template>
  <div class="search-bar">
    <div class="search-input">
      <input type="text" v-model="searchQuery" placeholder="Search identities..." @input="handleSearch" />
      <button v-if="searchQuery" class="clear-btn" type="button" @click="clearSearch">
        Clear
      </button>
    </div>

    <div class="controls-results">
      <div class="controls">
        <div class="filters">
          <div v-for="(values, key) in filterObject" :key="key" class="filter-row">
            <label :for="key">{{ key }}:</label>
            <select :id="key" v-model="selectedFiltersOptions[key]">
              <option></option>
              <option v-for="option in values" :key="option" :value="option">
                {{ getOptionString(key, option) }}
              </option>
            </select>
          </div>
        </div>

        <div class="rocker-switch">
          <input type="radio" id="a-z" :value="1" v-model="sortDirection">
          <label class="left" for="a-z">a - z</label>
          <input type="radio" id="z-a" :value="-1" v-model="sortDirection">
          <label class="right" for="z-a">z - a</label>
        </div>

        <StyledButton @click="clearDropdownFilters" text-color="#fff" button-color="#444">
          Clear Filters
        </StyledButton>

        <StyledButton @click="addAllFromFilter" text-color="#fff" button-color="#444">
          Add All To Session
        </StyledButton>
      </div>

      <IdentityCardPane>
        <IdentityCard v-for="identity in filteredIdentities" :key="identity.id" :identity="identity"
          :image="require('@/assets/plus-circle.svg')" :addIdentity="true"
          @add-identity="$emit('add-identity', $event)" />
      </IdentityCardPane>
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

.search-input {
  position: relative;
  height: 8%;
}

.search-input input {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 0.5rem;
  background-color: #333;
  border: 1px solid #444;
  color: #fff;
  padding: .7rem 2.2rem .7rem .7rem;
}

input::placeholder {
  color: #ccc;
}

.clear-btn {
  position: absolute;
  right: .4rem;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: #444;
  color: #fff;
  padding: .4rem;
  border-radius: .5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.clear-btn:hover {
  background: #555;
}

.controls-results {
  height: 89.5%;
  display: grid;
  grid-template-columns: 1fr 4fr;
  align-items: start;
  gap: .7rem;
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
  background-color: #333;
  border-radius: .5rem;
  border: 1px solid #444;
  padding: .7rem;
}

.filter-row label {
  display: block;
  margin-bottom: .4rem;
  color: #fff;
  text-transform: capitalize;
}

.filter-row select {
  width: 100%;
  border: none;
  border-radius: .5rem;
  background-color: #444;
  color: #fff;
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
  background-color: #444;
  color: #fff;
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
  background-color: #555;
}
</style>