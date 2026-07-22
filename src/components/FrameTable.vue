<template>
  <el-table :data="frames" border :max-height="maxHeight" class="frame-table">
    <el-table-column prop="index" label="#" width="52" />
    <el-table-column prop="time" label="时间戳" width="125" />
    <el-table-column label="方向" width="65">
      <template #default="{ row }">
        <el-tag :type="row.direction === '请求' ? 'primary' : 'success'" size="small">{{
          row.direction
        }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column prop="can" label="CAN ID" width="78" />
    <el-table-column prop="ecu" label="ECU" width="75" />
    <el-table-column prop="type" label="ISO-TP 类型" width="132" />
    <el-table-column prop="length" label="DLC" width="52" />
    <el-table-column prop="dataHex" label="数据 (Hex)" min-width="185" />
    <el-table-column prop="note" label="说明" min-width="220" show-overflow-tooltip />
    <el-table-column prop="rawDirection" label="TRC 方向" width="75" />
  </el-table>
</template>

<script setup lang="ts">
import type { CanFrame } from '@/lib/udsParser'

withDefaults(defineProps<{ frames: CanFrame[]; maxHeight?: number | string }>(), {
  maxHeight: 180,
})
</script>

<style scoped>
.frame-table :deep(.cell) {
  white-space: nowrap;
  padding: 0 5px;
}
</style>
