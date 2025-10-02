<template>
    <li>
        <div>
            <h2>{{ identity.firstName }} <span v-if="identity.firstName != identity.commonName && identity.commonName != undefined">({{ identity.commonName }})</span> {{ identity.lastName }}</h2>
            <p v-if="identity.grade==0">Faculty</p>
            <p v-else>
                <span v-if="identity.grade == -2"> Junior Kindergarten</span>
                <span v-if="identity.grade == -1"> Kindergarten</span>
                <span v-if="identity.grade == 1"> First Grade</span>
                <span v-if="identity.grade == 2"> Second Grade</span>
                <span v-if="identity.grade == 3"> Third Grade</span>
                <span v-if="identity.grade == 4"> Fourth Grade</span>
                <span v-if="identity.grade == 5"> Fifth Grade</span>
                <span v-if="identity.grade == 6"> Sixth Grade</span>
                <span v-if="identity.grade == 7"> Seventh Grade</span>
                <span v-if="identity.grade == 8"> Eighth Grade</span>
                <span v-if="identity.grade == 9"> Ninth Grade</span>
                <span v-if="identity.grade == 10"> Tenth Grade</span>
                <span v-if="identity.grade == 11"> Eleventh Grade</span>
                <span v-if="identity.grade == 12"> Twelfth Grade</span>
                @
                <span v-if="identity.campus == 'SM'">Spring Meadows</span>
                <span v-if="identity.campus == 'CHBC'">Crescent Hill</span>
                <span v-if="identity.campus == 'HLCS'">Cottage School</span>
            </p>
        </div>
        <img @click="handleClick" :src="image">
    </li>
</template>

<script>
export default {
    props: {
        identity: {
            type: Object,
            required: true,
        },
        image: {
            type: String,
            required: true
        },
        addIdentity: {
            type: Boolean,
            required: true
        }
    },
    methods: {
        handleClick() {
            if (this.addIdentity) {
                this.$emit('add-identity', this.identity);
            } else {
                this.$emit('remove-identity', this.identity)
            }
        }
    }
};
</script>

<style scoped>
li {
    display: flex;
    justify-content: space-between;
    padding: .7rem;
    border-radius: 0.5rem;
    background-color: #444;
    color: #fff;
    border: 1px solid #666;
}

h2 {
    margin: 0;
    font-size: 1.5rem;
    color: #fff;
}

p {
    margin: 0;
    font-size: .75rem;
    color: #ccc;
}

img {
    width: 35px;
    height: auto;
}
</style>