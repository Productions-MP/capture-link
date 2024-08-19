<template>
  <DialogBase>
    <div class="input-section">
      <h2>Add Identity</h2>
      <input v-model="identity.firstName" placeholder="First Name" required />
      <input v-model="identity.lastName" placeholder="Last Name" required />
      <input v-model="identity.campus" placeholder="Campus (Optional)" />
      <input v-model="identity.grade" placeholder="Grade (Optional)" />
      <input v-model="identity.house" placeholder="House (Optional)" />
    </div>

    <div class="input-section">
      <div v-for="(email, index) in identity.contactIds" :key="index" class="email-field">
        <input v-model="identity.contactIds[index]" placeholder="Contact Email (Optional)" />
        <button type="button" @click="removeContactEmail(index)">X</button>
      </div>
      <button type="button" @click="addContactEmail">Add Contact Email</button>
    </div>

    <div class="input-section">
      <StyledButton v-if="this.identity.firstName !== '' && this.identity.lastName !== ''" @click="submitIdentityForm" text-color="#fff" button-color="#39B357">Submit</StyledButton>
      <StyledButton v-else @click="this.$emit('hide-add-identity')" text-color="#fff" button-color="#ff6644">Close</StyledButton>
    </div>
  </DialogBase>
</template>

<script>
import DialogBase from './DialogBase.vue';
import StyledButton from './StyledButton.vue';
import { createMongoCaptureLinkIdentity } from '@/utils/app';

export default {
  components: {
    DialogBase,
    StyledButton
  },
  data() {
    return {
      identity: {
        firstName: '',
        lastName: '',
        campus: null,
        grade: null,
        house: null,
        contactIds: [null],
      },
    };
  },
  methods: {
    addContactEmail() {
      this.identity.contactIds.push(null);
    },
    removeContactEmail(index) {
      this.identity.contactIds.splice(index, 1);
    },
    async submitIdentityForm() {
      if (!this.identity.firstName || !this.identity.lastName) {
        alert('First name and last name are required');
        return;
      }

      const isSuccess = await createMongoCaptureLinkIdentity(
        this.identity.firstName,
        this.identity.lastName,
        this.identity.campus,
        this.identity.grade,
        this.identity.house,
        [...new Set(this.identity.contactIds)]
      )

      if (isSuccess) {
        this.$emit('identity-created', this.identity)
        this.closeDialog()
      }
    },
    closeDialog() {
      this.identity = {
        firstName: '',
        lastName: '',
        campus: null,
        grade: null,
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