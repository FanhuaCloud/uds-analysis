<template>
  <el-container class="app-shell">
    <el-header class="app-header">
      <div class="brand">
        <el-icon class="menu-icon"><Menu /></el-icon>
        <div class="shield">
          <el-icon><DataAnalysis /></el-icon>
        </div>
        <strong>UDS ISO14229 协议分析工具</strong>
      </div>
      <el-space :size="20"><el-button text :icon="Setting">设置</el-button></el-space>
    </el-header>
    <el-main class="workspace">
      <section class="toolbar">
        <el-button type="primary" :icon="Upload" @click="fileInput?.click()"
          >导入 TRC 文件</el-button
        >
        <input
          ref="fileInput"
          class="hidden-input"
          type="file"
          accept=".trc,text/plain"
          @change="importFile"
        />
        <el-button v-if="fileMeta.name" class="file-button" :icon="Document"
          ><span>{{ fileMeta.name }}</span
          ><small>{{ fileMeta.size }}</small
          ><el-tag :type="fileMeta.error ? 'danger' : 'success'" size="small" effect="plain">{{
            fileMeta.error || '已解析'
          }}</el-tag></el-button
        >
        <el-input
          v-model="keyword"
          placeholder="搜索：SID、名称、说明..."
          :prefix-icon="Search"
          clearable
          class="search-input"
        />
        <el-select v-model="filters.ecu" class="filter" placeholder="ECU"
          ><el-option label="全部 ECU" value="all" /><el-option
            v-for="ecu in ecus"
            :key="ecu"
            :label="ecu"
            :value="ecu"
        /></el-select>
        <el-select v-model="filters.service" class="filter wide" placeholder="服务"
          ><el-option label="全部服务" value="all" /><el-option
            v-for="service in services"
            :key="service"
            :label="service"
            :value="service"
        /></el-select>
        <div v-if="records.length" class="range-filter">
          <span>时间范围</span
          ><el-slider
            v-model="filters.timeRange"
            range
            :min="0"
            :max="maxOffset"
            :show-tooltip="false"
          />
        </div>
        <div class="toolbar-end">
          <el-checkbox v-model="onlyExceptions">仅显示异常</el-checkbox>
        </div>
      </section>
      <section class="stat-grid">
        <div v-for="item in stats" :key="item.label" class="stat-card">
          <div class="stat-icon" :class="item.color">
            <el-icon><component :is="item.icon" /></el-icon>
          </div>
          <div>
            <span>{{ item.label }}</span
            ><strong
              >{{ item.value }} <small>{{ item.unit }}</small></strong
            ><em>{{ item.note }}</em>
          </div>
        </div>
      </section>
      <section class="content-grid">
        <article class="records-panel">
          <el-tabs v-model="activeTab" class="record-tabs">
            <el-tab-pane label="解析结果" name="result" /><el-tab-pane
              label="原始报文"
              name="raw"
            /><el-tab-pane label="服务视图" name="service" /><el-tab-pane
              label="时序视图"
              name="timeline"
            />
          </el-tabs>
          <template v-if="activeTab === 'result'"
            ><el-table
              v-if="records.length"
              :data="pagedRecords"
              row-key="id"
              border
              height="calc(100vh - 364px)"
              :expand-row-keys="expanded"
              @row-click="selectRecord"
              @expand-change="onExpand"
              :row-class-name="rowClass"
            >
              <el-table-column type="expand" width="38"
                ><template #default="scope"
                  ><div class="frame-area">
                    <b>原始帧（{{ scope.row.frames.length }} 帧）</b
                    ><frame-table :frames="scope.row.frames" /></div></template
              ></el-table-column>
              <el-table-column prop="index" label="#" width="50" /><el-table-column
                prop="time"
                label="时间戳"
                width="125"
              /><el-table-column label="方向" width="62"
                ><template #default="{ row }"
                  ><el-tag :type="row.direction === '请求' ? 'primary' : 'success'" size="small">{{
                    row.direction
                  }}</el-tag></template
                ></el-table-column
              ><el-table-column prop="can" label="CAN ID" width="75" /><el-table-column
                prop="ecu"
                label="ECU"
                width="75"
              /><el-table-column
                prop="service"
                label="服务"
                min-width="155"
                show-overflow-tooltip
              /><el-table-column prop="sid" label="SID" width="58" /><el-table-column
                prop="sub"
                label="子功能"
                width="70"
              /><el-table-column prop="length" label="长度" width="50" /><el-table-column
                label="状态"
                width="78"
                ><template #default="{ row }"
                  ><el-tag :type="statusType(row.status)" size="small">{{
                    row.status
                  }}</el-tag></template
                ></el-table-column
              ><el-table-column label="合并记录数" width="90"
                ><template #default="{ row }"
                  ><el-tag v-if="row.frames.length > 1" size="small" effect="plain"
                    >{{ row.frames.length }} 帧</el-tag
                  ><span v-else>1</span></template
                ></el-table-column
              ><el-table-column
                prop="note"
                label="说明"
                min-width="150"
                show-overflow-tooltip
              /> </el-table
            ><el-empty
              v-else
              description="请选择 PCAN-View TRC 2.0 文件开始分析"
              class="content-empty"
          /></template>
          <frame-table
            v-else-if="activeTab === 'raw'"
            :frames="pagedFrames"
            max-height="calc(100vh - 364px)"
          /><service-view
            v-else-if="activeTab === 'service'"
            :records="filteredRecords"
            @select="selectRecord"
          /><timeline-view v-else :records="pagedRecords" @select="selectRecord" />
          <footer
            v-if="activeTab !== 'service' && (records.length || frames.length)"
            class="table-footer"
          >
            <span
              >共
              {{ activeTab === 'raw' ? filteredFrames.length : filteredRecords.length }}
              条记录</span
            ><el-pagination
              v-model:current-page="page"
              v-model:page-size="pageSize"
              small
              background
              layout="prev, pager, next, sizes, jumper"
              :total="activeTab === 'raw' ? filteredFrames.length : filteredRecords.length"
              :page-sizes="[10, 25, 50, 100]"
            />
          </footer>
        </article>
        <aside class="detail-panel">
          <div class="detail-title">
            <strong>记录详情</strong
            ><el-button :icon="Close" text circle @click="selected = undefined" />
          </div>
          <template v-if="selected"
            ><div class="detail-head">
              <b>#{{ selected.index }}</b
              ><span>{{ selected.service }} ({{ selected.sid }})</span
              ><el-tag :type="statusType(selected.status)" size="small">{{
                selected.status
              }}</el-tag>
            </div>
            <el-tabs v-model="detailTab" stretch class="detail-tabs"
              ><el-tab-pane label="基本信息" name="basic" /><el-tab-pane
                label="原始帧序列"
                name="frames" /><el-tab-pane label="UDS 解析结果" name="uds" /><el-tab-pane
                label="十六进制数据"
                name="hex"
            /></el-tabs>
            <template v-if="detailTab === 'basic'"
              ><h4>基本信息</h4>
              <el-descriptions :column="2" size="small"
                ><el-descriptions-item label="时间戳">{{ selected.time }}</el-descriptions-item
                ><el-descriptions-item label="长度"
                  >{{ selected.length }} bytes</el-descriptions-item
                ><el-descriptions-item label="方向">{{ selected.direction }}</el-descriptions-item
                ><el-descriptions-item label="SID">{{ selected.sid }}</el-descriptions-item
                ><el-descriptions-item label="CAN ID">{{ selected.can }}</el-descriptions-item
                ><el-descriptions-item label="ECU">{{ selected.ecu }}</el-descriptions-item
                ><el-descriptions-item label="状态"
                  ><el-tag :type="statusType(selected.status)" size="small">{{
                    selected.status
                  }}</el-tag></el-descriptions-item
                ></el-descriptions
              ><el-divider />
              <h4>服务说明</h4>
              <p class="service-text">{{ selected.description }}</p></template
            >
            <template v-else-if="detailTab === 'frames'"
              ><h4>原始帧序列（{{ selected.frames.length }} 帧）</h4>
              <frame-table :frames="selected.frames"
            /></template>
            <template v-else-if="detailTab === 'uds'"
              ><h4>UDS 解析结果</h4>
              <el-descriptions :column="1" size="small"
                ><el-descriptions-item label="服务名称">{{ selected.service }}</el-descriptions-item
                ><el-descriptions-item label="服务说明">{{
                  selected.description
                }}</el-descriptions-item
                ><el-descriptions-item
                  v-for="field in selected.fields"
                  :key="field.label"
                  :label="field.label"
                  >{{ field.value }}</el-descriptions-item
                ></el-descriptions
              ></template
            >
            <template v-else
              ><h4>UDS 有效载荷</h4>
              <div class="hex-box">{{ selected.payloadHex || '无有效载荷' }}</div>
              <h4>原始 CAN 数据</h4>
              <div class="hex-box" v-for="frame in selected.frames" :key="frame.index">
                {{ frame.dataHex }}
              </div></template
            > </template
          ><el-empty v-else description="选择一条解析记录查看详情" class="detail-empty" />
        </aside>
      </section>
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Close,
  DataAnalysis,
  Document,
  Menu,
  Search,
  Setting,
  Upload,
  WarningFilled,
  Connection,
  Tickets,
  Monitor,
} from '@element-plus/icons-vue'
import { parseTrc, type CanFrame, type ParseStatus, type UdsRecord } from './lib/udsParser'
import FrameTable from './components/FrameTable.vue'
import ServiceView from './components/ServiceView.vue'
import TimelineView from './components/TimelineView.vue'

const fileInput = ref<HTMLInputElement>()
const frames = ref<CanFrame[]>([])
const records = ref<UdsRecord[]>([])
const selected = ref<UdsRecord>()
const keyword = ref('')
const page = ref(1)
const pageSize = ref(10)
const activeTab = ref('result')
const detailTab = ref('basic')
const onlyExceptions = ref(false)
const expanded = ref<number[]>([])
const fileMeta = reactive({ name: '', size: '', error: '' })
const filters = reactive({ ecu: 'all', service: 'all', timeRange: [0, 0] as [number, number] })
const formatSize = (size: number) =>
  size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1024 / 1024).toFixed(2)} MB`
const maxOffset = computed(() => frames.value.at(-1)?.offsetMs ?? 0)
const ecus = computed(() => [...new Set(records.value.map((record) => record.ecu))].sort())
const services = computed(() => [...new Set(records.value.map((record) => record.service))].sort())
const matches = (value: string) =>
  !keyword.value || value.toLowerCase().includes(keyword.value.toLowerCase())
const filteredRecords = computed(() =>
  records.value.filter(
    (record) =>
      matches(
        `${record.service} ${record.sid} ${record.sub} ${record.note} ${record.payloadHex}`,
      ) &&
      (filters.ecu === 'all' || record.ecu === filters.ecu) &&
      (filters.service === 'all' || record.service === filters.service) &&
      record.offsetMs >= filters.timeRange[0] &&
      record.offsetMs <= filters.timeRange[1] &&
      (!onlyExceptions.value || record.status !== '成功'),
  ),
)
const filteredFrames = computed(() =>
  frames.value.filter(
    (frame) =>
      matches(`${frame.can} ${frame.dataHex}`) &&
      (filters.ecu === 'all' || frame.ecu === filters.ecu) &&
      frame.offsetMs >= filters.timeRange[0] &&
      frame.offsetMs <= filters.timeRange[1],
  ),
)
const pagedRecords = computed(() =>
  filteredRecords.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value),
)
const pagedFrames = computed(() =>
  filteredFrames.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value),
)
const stats = computed(() => [
  {
    label: '总报文数',
    value: frames.value.length.toLocaleString(),
    unit: '帧',
    note: '原始 CAN 帧总数',
    icon: Tickets,
    color: 'blue',
  },
  {
    label: '服务记录数',
    value: records.value.length.toLocaleString(),
    unit: '条',
    note: 'ISO-TP 重组后记录',
    icon: Monitor,
    color: 'green',
  },
  {
    label: '诊断会话',
    value: records.value
      .filter((record) => record.sid === '0x10' || record.sid === '0x50')
      .length.toLocaleString(),
    unit: '个',
    note: '会话控制记录',
    icon: Connection,
    color: 'purple',
  },
  {
    label: '异常响应',
    value: records.value.filter((record) => record.status !== '成功').length.toLocaleString(),
    unit: '条',
    note: '否定响应 / 解析异常',
    icon: WarningFilled,
    color: 'red',
  },
  {
    label: '多帧记录',
    value: records.value.filter((record) => record.frames.length > 1).length.toLocaleString(),
    unit: '条',
    note: 'ISO-TP 多帧重组',
    icon: DataAnalysis,
    color: 'teal',
  },
])
watch(
  [keyword, onlyExceptions, () => filters.ecu, () => filters.service, () => filters.timeRange],
  () => (page.value = 1),
  { deep: true },
)
watch(activeTab, () => (page.value = 1))
const statusType = (status: ParseStatus) =>
  status === '成功' ? 'success' : status === '否定响应' ? 'danger' : 'warning'
const selectRecord = (record: UdsRecord) => {
  selected.value = record
  detailTab.value = 'basic'
}
const onExpand = (_row: UdsRecord, rows: UdsRecord[]) =>
  (expanded.value = rows.map((record) => record.id))
const rowClass = ({ row }: { row: UdsRecord }) =>
  row.id === selected.value?.id ? 'selected-row' : row.status !== '成功' ? 'error-row' : ''
const importFile = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  fileMeta.name = file.name
  fileMeta.size = formatSize(file.size)
  fileMeta.error = ''
  try {
    const result = parseTrc(await file.text())
    frames.value = result.frames
    records.value = result.records
    filters.timeRange = [0, maxOffset.value]
    selected.value = records.value[0]
    page.value = 1
    ElMessage.success(`已解析 ${result.frames.length.toLocaleString()} 帧 CAN 报文`)
  } catch (error) {
    frames.value = []
    records.value = []
    selected.value = undefined
    fileMeta.error = error instanceof Error ? error.message : '文件解析失败'
    ElMessage.error(fileMeta.error)
  } finally {
    ;(event.target as HTMLInputElement).value = ''
  }
}
</script>

<style>
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  min-width: 1240px;
  background: #f5f7fb;
}
.app-shell {
  min-height: 100vh;
}
.app-header {
  height: 54px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #e8edf5;
}
.brand,
.toolbar,
.toolbar-end,
.detail-head {
  display: flex;
  align-items: center;
}
.brand {
  gap: 11px;
  font-size: 18px;
  color: #1c2635;
}
.menu-icon {
  font-size: 18px;
  color: #667085;
}
.shield {
  display: grid;
  place-items: center;
  width: 26px;
  height: 29px;
  color: #fff;
  background: #2878e5;
  clip-path: polygon(50% 0, 94% 15%, 88% 70%, 50% 100%, 12% 70%, 6% 15%);
}
.workspace {
  padding: 16px 12px 8px;
}
.toolbar {
  gap: 12px;
  height: 56px;
  padding: 0 6px;
  background: #fff;
  border-bottom: 1px solid #e7ebf1;
}
.hidden-input {
  display: none;
}
.file-button {
  color: #344054;
  max-width: 260px;
}
.file-button small {
  color: #98a2b3;
  margin-left: 8px;
}
.search-input {
  width: 215px;
}
.filter {
  width: 142px;
}
.filter.wide {
  width: 150px;
}
.range-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 160px;
  color: #667085;
}
.range-filter .el-slider {
  flex: 1;
}
.toolbar-end {
  margin-left: auto;
  gap: 15px;
  white-space: nowrap;
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin: 8px 0;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  height: 86px;
  padding: 14px;
  background: #fff;
  border: 1px solid #edf0f5;
  border-radius: 6px;
  box-shadow: 0 2px 6px #10182809;
}
.stat-icon {
  display: grid;
  place-items: center;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  font-size: 21px;
}
.blue {
  color: #2775e9;
  background: #eaf2ff;
}
.green {
  color: #3bae57;
  background: #eaf8ec;
}
.purple {
  color: #805ae9;
  background: #f1ebff;
}
.red {
  color: #ef5b55;
  background: #fff0ef;
}
.teal {
  color: #10aa9b;
  background: #e5f9f6;
}
.stat-card span,
.stat-card em {
  display: block;
  color: #667085;
  font-size: 12px;
  font-style: normal;
}
.stat-card strong {
  display: block;
  margin: 3px 0;
  font-size: 20px;
}
.stat-card strong small {
  font-size: 11px;
  font-weight: 400;
}
.content-grid {
  display: grid;
  grid-template-columns: minmax(740px, 1fr) 408px;
  gap: 12px;
}
.records-panel,
.detail-panel {
  background: #fff;
  border: 1px solid #edf0f5;
  border-radius: 6px;
  overflow: hidden;
}
.record-tabs {
  padding: 0 14px;
}
.record-tabs .el-tabs__header {
  margin: 0;
}
.record-tabs .el-tabs__item {
  height: 39px;
  font-size: 13px;
}
.records-panel .el-table {
  --el-table-header-bg-color: #fafbfc;
  --el-table-row-hover-bg-color: #f4f8ff;
}
.records-panel .el-table .cell {
  white-space: nowrap;
  padding: 0 5px;
}
.selected-row > td.el-table__cell {
  background: #f0f6ff !important;
}
.error-row > td.el-table__cell {
  background: #fff6f5;
}
.frame-area {
  padding: 6px 22px 4px 35px;
}
.frame-area > b {
  display: block;
  margin-bottom: 6px;
  color: #475467;
}
.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 50px;
  padding: 0 14px;
  color: #667085;
  border-top: 1px solid #edf0f5;
}
.content-empty {
  height: calc(100vh - 364px);
}
.detail-panel {
  min-height: calc(100vh - 182px);
  padding: 0 12px;
}
.detail-title {
  height: 39px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e5e9f0;
}
.detail-head {
  gap: 8px;
  min-height: 47px;
}
.detail-head span {
  font-weight: 600;
}
.detail-tabs .el-tabs__item {
  padding: 0 8px;
  font-size: 12px;
}
.detail-tabs .el-tabs__header {
  margin-bottom: 12px;
}
h4 {
  margin: 13px 0 9px;
  font-size: 12px;
  color: #344054;
}
.detail-panel .el-descriptions__label {
  color: #667085;
  width: 72px;
}
.detail-panel .el-descriptions__cell {
  padding-bottom: 6px;
}
.detail-panel .el-divider {
  margin: 10px 0;
}
.hex-box {
  padding: 9px;
  margin-bottom: 7px;
  border-radius: 4px;
  background: #f5f7fa;
  color: #667085;
  font-family: Consolas, monospace;
  font-size: 11px;
  word-break: break-all;
}
.service-text {
  margin: 0;
  color: #667085;
  line-height: 1.65;
  font-size: 12px;
}
.detail-empty {
  padding-top: 120px;
}
</style>
