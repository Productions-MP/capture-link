<template>
  <DialogBase :show="showDialog">
    <h2>Add Identity</h2>
    <input v-model="identity.firstName" placeholder="First Name" required />
    <input v-model="identity.lastName" placeholder="Last Name" required />
    <input v-model="identity.campus" placeholder="Campus (Optional)" />
    <input v-model="identity.grade" placeholder="Grade (Optional)" />
    <input v-model="identity.house" placeholder="House (Optional)" />

    <div>
      <label>Contact Ids (Optional):</label>
      <div v-for="(email, index) in identity.contactIds" :key="index" class="email-field">
        <input v-model="identity.contactIds[index]" placeholder="Contact Email" />
        <button type="button" @click="removeContactEmail(index)">Remove</button>
      </div>
      <button type="button" @click="addContactEmail">Add Another Email</button>
    </div>

    <button @click="submitIdentityForm">Add Identity</button>
  </DialogBase>
</template>

<script>
import DialogBase from './DialogBase.vue';
import { createMongoCaptureLinkIdentity } from '@/utils/app';

export default {
  components: {
    DialogBase,
  },
  props: {
    showDialog: {
      type: Boolean,
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      identity: {
        firstName: '',
        lastName: '',
        campus: '',
        grade: null,
        house: '',
        contactIds: [],
      },
    };
  },
  methods: {
    addContactEmail() {
      this.identity.contactIds.push('');
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
        this.identity.contactIds
      )

      if (isSuccess) {
        this.$emit('identityCreated', this.identity)
        this.closeDialog()
      }
    },
    closeDialog() {
      this.identity = {
        firstName: '',
        lastName: '',
        campus: '',
        grade: null,
        house: '',
        contactIds: [],
      };
      this.$emit('close');
    },
  },
};
</script>
