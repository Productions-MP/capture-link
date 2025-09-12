<template>
  <DialogBase>
    <div class="input-section">
      <h2>Add Identity</h2>
      <input v-model.trim="identity.firstName" placeholder="First Name" required />
      <input v-model.trim="identity.lastName" placeholder="Last Name" required />

      <div>
        <label for="campus">Campus (Optional)</label>
        <select id="campus" v-model="identity.campus">
          <option :value="null"></option>
          <option v-for="option in filterObject.campus" :key="option" :value="option">
            {{ getCampusString(option) }}
          </option>
        </select>
      </div>

      <div>
        <label for="grade">Grade (Optional)</label>
        <select id="grade" v-model="identity.grade">
          <option :value="null"></option>
          <option v-for="option in filterObject.grade" :key="option" :value="option">
            {{ getGradeString(option) }}
          </option>
        </select>
      </div>

      <div>
        <label for="section">Section (Optional)</label>
        <select id="section" v-model="identity.section">
          <option :value="null"></option>
          <option v-for="option in filterObject.section" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </div>

      <div>
        <label for="house">House (Optional)</label>
        <select id="house" v-model="identity.house">
          <option :value="null"></option>
          <option v-for="option in filterObject.house" :key="option" :value="option">
            {{ getHouseString(option) }}
          </option>
        </select>
      </div>
    </div>

    <div class="input-section">
      <div v-for="(email, index) in identity.contactIds" :key="index" class="email-field">
        <input v-model="identity.contactIds[index]" placeholder="Contact Email (Optional)" />
        <button type="button" @click="removeContactEmail(index)">X</button>
      </div>
      <button type="button" @click="addContactEmail">Add Contact Email</button>
    </div>

    <div class="input-section">
      <StyledButton v-if="this.identity.firstName !== '' && this.identity.lastName !== ''" @click="submitIdentityForm"
        text-color="#fff" button-color="#39B357" :disabled="loading">{{ loading ? 'Submitting...' : 'Submit' }}</StyledButton>
      <StyledButton v-else @click="this.$emit('hide-add-identity')" text-color="#fff" button-color="#ff6644">Close
      </StyledButton>
    </div>
  </DialogBase>
</template>

<script>
import DialogBase from './DialogBase.vue';
import StyledButton from './StyledButton.vue';
import { createMongoCaptureLinkIdentity, getCampusString, getGradeString, getHouseString } from '@/utils/app';

export default {
  props: {
    filterObject: {
      type: Object,
      required: true
    }
  },
  components: {
    DialogBase,
    StyledButton
  },
  data() {
    return {
      identity: {
        id: null,
        firstName: '',
        lastName: '',
        campus: null,
        grade: null,
        section: null,
        house: null,
        contactIds: [null],
      },
      loading: false
    };
  },
  methods: {
    getCampusString,
    getGradeString,
    getHouseString,
    addContactEmail() {
      this.identity.contactIds.push(null);
    },
    removeContactEmail(index) {
      this.identity.contactIds.splice(index, 1);
    },
    async submitIdentityForm() {
      this.loading = true
      if (!this.identity.firstName || !this.identity.lastName) {
        alert('First name and last name are required');
        return;
      }

      const insertedId = await createMongoCaptureLinkIdentity(
        this.identity.firstName,
        this.identity.lastName,
        this.identity.campus,
        this.identity.grade,
        this.identity.section,
        this.identity.house,
        [...new Set(this.identity.contactIds)]
      )

        console.log(insertedId)
      if (insertedId != null) {
        this.identity.id = insertedId
        this.$emit('identity-created', this.identity)
        this.closeDialog()
      }

      this.loading = false
    },
    closeDialog() {
      this.identity = {
        id: null,
        firstName: '',
        lastName: '',
        campus: null,
        grade: null,
        section: null,
        house: null,
        contactIds: [],
      };
      this.$emit('close');
    },
  },
};
</script>


<style scoped>
.input-section {
  display: flex;
  flex-direction: column;
  gap: .5rem;
}

.email-field {
  display: grid;
  grid-template-columns: 4fr 1fr;
  gap: .5rem;
  justify-content: start;
}
</style>