<template>
  <div class="overview">
    <div :style="{ width: '100%', height: '1.02rem' }">
      <el-carousel :interval="3000" direction="vertical">
        <el-carousel-item v-for="(item, index) in topDatas" :key="index">
          <div v-for="(item, index) in topDatas" :key="index">
            <div class="overview-section" key="{index}">
              <div class="overview-section__title">
                <span>{{ item.Title }}</span>
                <span>日累计量：{{ item.DayCarbon || 0 }} {{ item.Unit }}</span>
              </div>
              <div class="overview-section__content">
                <div class="overview-section__content--left">
                  <span class="total">{{ item.MonthEnergy }}</span>
                  <span class="unit">{{ item.Unit }}</span>
                </div>
                <!-- <div class="overview-section__content--right">
                  <TongHuanBi title="月同比" value="{item.YearOnYear}" />
                  <TongHuanBi title="月环比" value="{item.MonthOnMonth}" />
                </div> -->
              </div>
            </div>
          </div>
        </el-carousel-item>
      </el-carousel>
    </div>
    <div class="overview-scroll" :style="{ width: '100%', height: '3.34rem' }">
      <el-carousel :interval="3200" direction="vertical">
        <el-carousel-item
          v-for="(item, index) in EnergyDosageSummary"
          :key="index"
        >
          <div v-for="(item, index) in topDatas" :key="index">
            <div class="overview-section" key="{index}">
              <div class="overview-section__title">
                <span>{{ item.Title }}</span>
                <span>日累计量：{{ item.DayCarbon || 0 }} {{ item.Unit }}</span>
              </div>
              <div class="overview-section__content">
                <div class="overview-section__content--left">
                  <span class="total">{{ item.MonthEnergy }}</span>
                  <span class="unit">{{ item.Unit }}</span>
                </div>
                <!-- <div class="overview-section__content--right">
                  <TongHuanBi title="月同比" value="{item.YearOnYear}" />
                  <TongHuanBi title="月环比" value="{item.MonthOnMonth}" />
                </div> -->
              </div>
            </div>
          </div>
        </el-carousel-item>
      </el-carousel>
    </div>
  </div>
</template>

<script>
export default {
  name: "",
  created() {
    this.$api.getSummaryInfo().then((res) => {
      if (res) {
        this.EnergyDosageSummary = res.EnergyDosageSummary;
        this.topDatas = [res.Cons, res.Carbon];
      }
    });
  },
  data() {
    return {
      EnergyDosageSummary: [],
      topDatas: [],
    };
  },
};
</script>

<style scoped lang="less">
@import url("../../styles/modules/overview.less");
</style>