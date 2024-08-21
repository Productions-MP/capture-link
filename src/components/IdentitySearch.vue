<template>
  <div class="search-bar">
    <input type="text" v-model="searchQuery" placeholder="Search identities..." @input="handleSearch" />

    <div class="controls-results">
      <div class="controls">
        <div class="filters">
          <div v-for="(values, key) in filterObject" :key="key">
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

          <StyledButton @click="addAllFromFilter" text-color="#fff" button-color="#444">
            Add All To Session
          </StyledButton>
      </div>

      <IdentityCardPane>
        <IdentityCard v-for="identity in filteredIdentities"
          :key="identity.firstName + identity.lastName + identity.campus" :identity="identity"
          :image="require('@/assets/plus-circle.svg')" :addIdentity="true"
          @add-identity="$emit('add-identity', $event)" />
      </IdentityCardPane>
    </div>
  </div>
</template>

<script>
import IdentityCard from './IdentityCard.vue';
import IdentityCardPane from './IdentityCardPane.vue'
import StyledButton from './StyledButton.vue';

import {
  getCampusString,
  getGradeString,
  getHouseString
} from '@/utils/app'

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
  computed: {
    filteredIdentities() {
      const filtered = this.identities.filter((identity) => {
        const matchesQuery = `${identity.firstName} ${identity.lastName}`
          .toLowerCase()
          .includes(this.searchQuery.toLowerCase());

        const matchesFilters = Object.keys(this.selectedFiltersOptions).every((key) => {
          const selectedOption = this.selectedFiltersOptions[key];
          if (selectedOption !== "") {
            const identityValue = identity[key]
            if (identityValue !== null && identityValue !== "") {
              return false || identityValue === selectedOption;
            }
          } else return true
        });

        return matchesQuery && matchesFilters;
      });

      // Sort identities if a sort direction is specified
      if (this.sortDirection !== 0) {
        return filtered.sort((a, b) => {
          const nameA = `${a.lastName || ''}${a.firstName || ''}`.toLowerCase();
          const nameB = `${b.lastName || ''}${b.firstName || ''}`.toLowerCase();

          if (nameA < nameB) {
            return this.sortDirection === 1 ? -1 : 1;
          }
          if (nameA > nameB) {
            return this.sortDirection === 1 ? 1 : -1;
          }
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
        case 'campus':
          return getCampusString(option);
        case 'grade':
          return getGradeString(option);
        case 'house':
          return getHouseString(option);
        default:
          return option;
      }
    },
    addAllFromFilter() {
      this.$emit('add-all-from-filter', this.filteredIdentities);
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

input {
  height: 12%;
  border: none;
  border-radius: 0.5rem;
  background-color: #333;
  border: 1px solid #444;
  color: #fff;
  padding: .7rem;
}

input::placeholder {
  color: #ccc;
}

.controls-results {
  height: 88%;
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

label {
  display: block;
  margin-bottom: .4rem;
  color: #fff;
  text-transform: capitalize;
}

select {
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
  padding: 0.4rem;
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
