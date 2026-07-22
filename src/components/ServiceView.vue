<template>
  <div class="service-view">
    <el-button v-for="item in serviceSummary" :key="item.name" @click="selectService(item.name)">
      {{ item.name }} {{ item.count }} 条
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { UdsRecord } from '@/lib/udsParser'

const props = defineProps<{ records: UdsRecord[] }>()
const emit = defineEmits<{ select: [record: UdsRecord] }>()

const serviceSummary = computed(() =>
  Object.entries(
    props.records.reduce<Record<string, number>>((total, record) => {
      total[record.service] = (total[record.service] ?? 0) + 1
      return total
    }, {}),
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count),
)

const selectService = (service: string) => {
  const record = props.records.find((item) => item.service === service)
  if (record) emit('select', record)
}
</script>

<style scoped>
.service-view {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 20px;
  align-content: flex-start;
  min-height: calc(100vh - 364px);
}
</style>
