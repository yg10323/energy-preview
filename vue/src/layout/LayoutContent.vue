<template>
  <div class="layout-content" :style="extraStyle">
    <div class="layout-content__main">
      <slot name="content"></slot>
    </div>
    <div class="layout-content__corner">
      <img
        v-if="cornerVisible"
        class="corner-img"
        :class="cornerPosition"
        src="../assets/corner.png"
        alt=""
      />
    </div>
  </div>
</template>

<script>
export default {
  name: "",
  props: {
    title: String,
    cornerVisible: {
      type: Boolean,
      default: true,
    },
    cornerPosition: {
      type: String,
      default: "bottom-left",
    },
    extraStyle: Object,
  },
};
</script>

<style scoped lang="less">
@import url("../styles/layout/layoutContent.less");
</style>