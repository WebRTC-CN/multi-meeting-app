<template>
  <i class="fa" :class="iconName" :style="style" aria-hidden="true"></i>
</template>

<script>
export default {
  name: 'fa-icon',
  props: {
    name: {
      type: String,
      require: true
    },
    size: {
      type: [Number, String]
    }
  },
  computed: {
    iconName() {
      return `fa-${this.name}`;
    },
    style() {
      return +this.size > 0 ? { fontSize: `this.sizepx` } : {};
    }
  }
};
</script>
