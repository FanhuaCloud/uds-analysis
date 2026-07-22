<template>
  <div class="timeline-view">
    <button
      v-for="record in records"
      :key="record.id"
      class="timeline-item"
      :class="{ 'timeline-error': record.status !== '成功' }"
      @click="emit('select', record)"
    >
      {{ record.time }} {{ record.direction }} {{ record.sid }} {{ record.service }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { UdsRecord } from '@/lib/udsParser'

defineProps<{ records: UdsRecord[] }>()
const emit = defineEmits<{ select: [record: UdsRecord] }>()
</script>

<style scoped>
.timeline-view {
  padding: 12px;
  min-height: calc(100vh - 364px);
  overflow: auto;
}
.timeline-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  margin-bottom: 5px;
  text-align: left;
  border: 1px solid #e7ebf1;
  border-left: 3px solid #409eff;
  background: #fff;
  color: #344054;
  cursor: pointer;
}
.timeline-error {
  border-left-color: #f56c6c;
}
</style>
