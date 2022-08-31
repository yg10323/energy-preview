<template>
  <div class="route-home">
    <div class="route-home__left">
      <LayoutContent
        :extraStyle="{
          width: '4.9rem',
          height: '4.36rem',
          marginTop: '0.36rem',
        }"
      >
        <template v-slot:content>
          <Overview />
        </template>
      </LayoutContent>
    </div>
    <div class="route-home__center"></div>
    <div class="route-home__right"></div>
  </div>
</template>

<script>
import LayoutContent from "../layout/LayoutContent.vue";
import Overview from "./components/Overview.vue";

export default {
  components: {
    LayoutContent,
    Overview,
  },
  name: "",
  created() {
    this.$api.getBaseConfig().then((res) => {
      res && (this.baseConfig = res);
    });
  },
  data() {
    return {
      baseConfig: null,
    };
  },
  methods: {},
};
</script>

<style scoped lang="less">
@import url("../styles/modules/home.less");
</style>