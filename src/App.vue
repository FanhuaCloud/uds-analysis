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
      <el-space :size="22" class="header-actions">
        <el-button text :icon="Document">打开示例</el-button>
        <el-button text :icon="Download">导出分析报告</el-button>
        <el-button text :icon="Setting">设置</el-button>
        <el-dropdown>
          <el-button text
            ><el-avatar :size="24">工</el-avatar><span>工程师</span><el-icon><ArrowDown /></el-icon
          ></el-button>
          <template #dropdown
            ><el-dropdown-menu
              ><el-dropdown-item>个人设置</el-dropdown-item
              ><el-dropdown-item>退出</el-dropdown-item></el-dropdown-menu
            ></template
          >
        </el-dropdown>
      </el-space>
    </el-header>

    <main class="workspace">
      <section class="toolbar">
        <el-button type="primary" :icon="Upload" @click="notify('请选择 TRC 文件')"
          >导入 TRC 文件</el-button
        >
        <el-button class="file-button" :icon="Document"
          ><span>Demo_20250520.trc</span><small>2.48 MB</small
          ><el-tag type="success" size="small" effect="plain">已解析</el-tag></el-button
        >
        <el-input
          v-model="keyword"
          placeholder="搜索：SID、名称、说明..."
          :prefix-icon="Search"
          clearable
          class="search-input"
        />
        <el-select v-model="filters.protocol" class="filter"
          ><el-option label="ISO 14229 (UDS)" value="uds"
        /></el-select>
        <el-select v-model="filters.ecu" class="filter"
          ><el-option label="全部" value="all" /><el-option label="ECU-01" value="ecu01"
        /></el-select>
        <el-select v-model="filters.service" class="filter wide"
          ><el-option label="全部服务" value="all" /><el-option
            label="Security Access"
            value="security"
        /></el-select>
        <el-date-picker
          v-model="filters.range"
          type="daterange"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          class="date-filter"
        />
        <div class="toolbar-end">
          <el-switch v-model="mergeSessions" active-text="自动合并多帧会话" /><el-checkbox
            v-model="onlyExceptions"
            >仅显示异常</el-checkbox
          >
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
            <el-tab-pane label="解析结果" name="result" />
            <el-tab-pane label="原始报文" name="raw" />
            <el-tab-pane label="服务视图" name="service" />
            <el-tab-pane label="时序视图" name="timeline" />
          </el-tabs>
          <el-table
            :data="filteredRecords"
            row-key="id"
            border
            size="small"
            height="calc(100vh - 364px)"
            :expand-row-keys="expanded"
            @row-click="selectRecord"
            @expand-change="onExpand"
            :row-class-name="rowClass"
          >
            <el-table-column type="expand" width="38">
              <template #default="scope">
                <div class="frame-area">
                  <b>原始帧（{{ scope.row.frames.length }} 帧）</b
                  ><el-table :data="scope.row.frames" size="small" border
                    ><el-table-column prop="time" label="时间戳" width="145" /><el-table-column
                      prop="direction"
                      label="方向"
                      width="82" /><el-table-column
                      prop="can"
                      label="CAN ID"
                      width="88" /><el-table-column
                      prop="type"
                      label="类型"
                      width="140" /><el-table-column
                      prop="length"
                      label="长度"
                      width="70" /><el-table-column
                      prop="data"
                      label="数据 (Hex)" /><el-table-column prop="note" label="说明"
                  /></el-table>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="index" label="#" width="42" />
            <el-table-column prop="time" label="时间戳" width="126" sortable />
            <el-table-column label="方向" width="62"
              ><template #default="{ row }"
                ><el-tag :type="row.direction === '请求' ? 'primary' : 'success'" size="small">{{
                  row.direction
                }}</el-tag></template
              ></el-table-column
            >
            <el-table-column prop="can" label="CAN ID" width="72" />
            <el-table-column prop="ecu" label="ECU" width="74" />
            <el-table-column prop="service" label="服务" min-width="158" show-overflow-tooltip />
            <el-table-column prop="sid" label="SID" width="54" />
            <el-table-column prop="sub" label="子功能" width="65" />
            <el-table-column prop="length" label="长度" width="48" />
            <el-table-column label="状态" width="72"
              ><template #default="{ row }"
                ><el-tag :type="row.status === '否定响应' ? 'danger' : 'success'" size="small">{{
                  row.status
                }}</el-tag></template
              ></el-table-column
            >
            <el-table-column label="合并记录数" width="91"
              ><template #default="{ row }"
                ><el-tag v-if="row.frames.length > 1" size="small" effect="plain"
                  >{{ row.frames.length }} (多帧)</el-tag
                ><span v-else>1</span></template
              ></el-table-column
            >
            <el-table-column prop="note" label="说明" min-width="135" show-overflow-tooltip />
          </el-table>
          <footer class="table-footer">
            <span>共 {{ filteredRecords.length }} 条记录</span
            ><el-pagination
              v-model:current-page="page"
              small
              background
              layout="prev, pager, next, sizes, jumper"
              :total="1248"
              :page-size="10"
            />
          </footer>
        </article>

        <aside class="detail-panel">
          <div class="detail-title">
            <strong>记录详情</strong><el-button :icon="Close" text circle />
          </div>
          <div class="detail-head">
            <b>#{{ selected.index }}</b
            ><span>{{ selected.service }} ({{ selected.sid }})</span
            ><el-tag type="success" size="small">成功</el-tag
            ><el-tag size="small" effect="plain">已合并 {{ selected.frames.length }} 帧</el-tag>
          </div>
          <el-tabs v-model="detailTab" stretch class="detail-tabs"
            ><el-tab-pane label="基本信息" name="basic" /><el-tab-pane
              label="原始帧序列"
              name="frames" /><el-tab-pane label="UDS 解析结果" name="uds" /><el-tab-pane
              label="十六进制数据"
              name="hex"
          /></el-tabs>
          <template v-if="detailTab === 'basic'">
            <h4>基本信息</h4>
            <el-descriptions :column="2" size="small"
              ><el-descriptions-item label="时间戳">{{ selected.time }}.789</el-descriptions-item
              ><el-descriptions-item label="长度">{{ selected.length }} bytes</el-descriptions-item
              ><el-descriptions-item label="方向">请求 (TX)</el-descriptions-item
              ><el-descriptions-item label="SID">{{ selected.sid }}</el-descriptions-item
              ><el-descriptions-item label="CAN ID">{{ selected.can }}</el-descriptions-item
              ><el-descriptions-item label="子功能">{{ selected.sub }}</el-descriptions-item
              ><el-descriptions-item label="ECU">{{ selected.ecu }}</el-descriptions-item
              ><el-descriptions-item label="状态"
                ><el-tag type="success" size="small">成功</el-tag></el-descriptions-item
              ></el-descriptions
            >
            <el-divider />
            <h4>原始帧序列（{{ selected.frames.length }} 帧）</h4>
            <el-table :data="selected.frames" size="small" border max-height="150"
              ><el-table-column type="index" label="序号" width="48" /><el-table-column
                prop="time"
                label="时间戳"
                width="116" /><el-table-column
                prop="can"
                label="CAN ID"
                width="67" /><el-table-column
                prop="type"
                label="类型"
                width="105" /><el-table-column prop="data" label="数据 (Hex)"
            /></el-table>
            <el-divider />
            <h4>UDS 解析结果</h4>
            <el-descriptions :column="1" size="small"
              ><el-descriptions-item label="服务名称">{{ selected.service }}</el-descriptions-item
              ><el-descriptions-item label="服务描述"
                >诊断会话控制，用于请求 ECU 切换到指定的诊断会话。</el-descriptions-item
              ><el-descriptions-item label="请求 / 响应">请求</el-descriptions-item
              ><el-descriptions-item label="响应 SID">0x50</el-descriptions-item></el-descriptions
            >
            <h4>十六进制数据</h4>
            <div class="hex-box">10 02 15 00 00 00 00 00 00 00</div>
            <h4>服务说明</h4>
            <p class="service-text">
              该服务用于控制 ECU 的诊断会话。会话类型决定了后续可用的诊断服务和权限级别。
            </p>
          </template>
          <div v-else class="empty-detail">
            <el-empty description="切换到基本信息查看解析详情" />
          </div>
        </aside>
      </section>
    </main>
  </el-container>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ArrowDown,
  Close,
  DataAnalysis,
  Document,
  Download,
  Menu,
  Search,
  Setting,
  Upload,
  WarningFilled,
  Connection,
  Tickets,
  Monitor,
} from '@element-plus/icons-vue'

type Frame = {
  time: string
  direction: string
  can: string
  type: string
  length: number
  data: string
  note: string
}
type Record = {
  id: number
  index: number
  time: string
  direction: string
  can: string
  ecu: string
  service: string
  sid: string
  sub: string
  length: number
  status: string
  note: string
  frames: Frame[]
}
const makeFrames = (sid: string, sub: string): Frame[] => [
  {
    time: '09:15:23.456.789',
    direction: '请求',
    can: '0x7E0',
    type: 'First Frame',
    length: 8,
    data: `${sid.replace('0x', '')} ${sub.replace('0x', '')} 15 00 00 00 00 00`,
    note: 'FF - 首帧，后续 2 帧',
  },
  {
    time: '09:15:23.456.845',
    direction: '请求',
    can: '0x7E0',
    type: 'Consecutive Frame',
    length: 8,
    data: '21 00 00 00 00 00 00 00',
    note: 'CF - 连续帧 (1/2)',
  },
  {
    time: '09:15:23.456.901',
    direction: '请求',
    can: '0x7E0',
    type: 'Consecutive Frame',
    length: 5,
    data: '22',
    note: 'CF - 连续帧 (2/2)',
  },
]
const records = ref<Record[]>([
  {
    id: 1,
    index: 1,
    time: '09:15:23.456',
    direction: '请求',
    can: '0x7E0',
    ecu: 'ECU-01',
    service: 'Diagnostic Session Control',
    sid: '0x10',
    sub: '0x02',
    length: 2,
    status: '成功',
    note: 'Extended Diagnostic Session',
    frames: makeFrames('0x10', '0x02'),
  },
  {
    id: 2,
    index: 2,
    time: '09:15:23.460',
    direction: '响应',
    can: '0x7E8',
    ecu: 'ECU-01',
    service: 'Diagnostic Session Control',
    sid: '0x50',
    sub: '0x02',
    length: 2,
    status: '成功',
    note: '会话已切换',
    frames: makeFrames('0x50', '0x02'),
  },
  {
    id: 3,
    index: 3,
    time: '09:15:23.480',
    direction: '请求',
    can: '0x7E0',
    ecu: 'ECU-01',
    service: 'Security Access',
    sid: '0x27',
    sub: '0x01',
    length: 2,
    status: '成功',
    note: '请求种子 (Level 1)',
    frames: [
      {
        time: '09:15:23.480.456',
        direction: '请求',
        can: '0x7E0',
        type: 'Single Frame',
        length: 8,
        data: '27 01',
        note: '请求种子',
      },
    ],
  },
  {
    id: 4,
    index: 4,
    time: '09:15:24.100',
    direction: '响应',
    can: '0x7E8',
    ecu: 'ECU-01',
    service: 'Security Access',
    sid: '0x67',
    sub: '0x01',
    length: 6,
    status: '成功',
    note: '返回种子',
    frames: makeFrames('0x67', '0x01'),
  },
  {
    id: 5,
    index: 5,
    time: '09:15:24.780',
    direction: '请求',
    can: '0x7E0',
    ecu: 'ECU-01',
    service: 'Security Access',
    sid: '0x27',
    sub: '0x02',
    length: 18,
    status: '成功',
    note: '发送密钥 (Level 1)',
    frames: makeFrames('0x27', '0x02'),
  },
  {
    id: 6,
    index: 6,
    time: '09:15:24.790',
    direction: '响应',
    can: '0x7E8',
    ecu: 'ECU-01',
    service: 'Security Access',
    sid: '0x67',
    sub: '0x02',
    length: 2,
    status: '成功',
    note: '安全访问通过',
    frames: [
      {
        time: '09:15:24.790.112',
        direction: '响应',
        can: '0x7E8',
        type: 'Single Frame',
        length: 8,
        data: '67 02',
        note: '访问通过',
      },
    ],
  },
  {
    id: 7,
    index: 7,
    time: '09:15:25.512',
    direction: '请求',
    can: '0x7E0',
    ecu: 'ECU-01',
    service: 'Read Data By Identifier',
    sid: '0x22',
    sub: '0xF186',
    length: 4,
    status: '成功',
    note: 'VIN（车辆识别码）',
    frames: makeFrames('0x22', '0xF186'),
  },
  {
    id: 8,
    index: 8,
    time: '09:15:25.520',
    direction: '响应',
    can: '0x7E8',
    ecu: 'ECU-01',
    service: 'Negative Response',
    sid: '0x7F',
    sub: '0x22',
    length: 3,
    status: '否定响应',
    note: '条件不满足',
    frames: [
      {
        time: '09:15:25.520.456',
        direction: '响应',
        can: '0x7E8',
        type: 'Single Frame',
        length: 8,
        data: '7F 22 22',
        note: 'NRC: 0x22（条件不满足）',
      },
    ],
  },
  {
    id: 9,
    index: 9,
    time: '09:15:26.000',
    direction: '请求',
    can: '0x7E0',
    ecu: 'ECU-01',
    service: 'Tester Present',
    sid: '0x3E',
    sub: '0x80',
    length: 2,
    status: '成功',
    note: '保持会话',
    frames: [
      {
        time: '09:15:26.000.321',
        direction: '请求',
        can: '0x7E0',
        type: 'Single Frame',
        length: 8,
        data: '3E 80',
        note: '保持会话',
      },
    ],
  },
])
const stats = [
  {
    label: '总报文数',
    value: '8,732',
    unit: '帧',
    note: '原始帧总数',
    icon: Tickets,
    color: 'blue',
  },
  {
    label: '服务请求数',
    value: '1,248',
    unit: '条',
    note: '合并后请求记录',
    icon: Monitor,
    color: 'green',
  },
  {
    label: '诊断会话',
    value: '16',
    unit: '个',
    note: '会话切换记录',
    icon: Connection,
    color: 'purple',
  },
  {
    label: '异常响应',
    value: '24',
    unit: '条',
    note: '否定响应 / 错误',
    icon: WarningFilled,
    color: 'red',
  },
  {
    label: '已合并记录',
    value: '376',
    unit: '条',
    note: '多帧合并记录数',
    icon: DataAnalysis,
    color: 'teal',
  },
]
const keyword = ref(''),
  page = ref(1),
  activeTab = ref('result'),
  detailTab = ref('basic'),
  mergeSessions = ref(true),
  onlyExceptions = ref(false),
  expanded = ref<number[]>([1, 5]),
  selected = ref<Record>(records.value[0]!)
const filters = reactive({ protocol: 'uds', ecu: 'all', service: 'all', range: [] })
const filteredRecords = computed(() =>
  records.value.filter(
    (r) =>
      (!keyword.value ||
        `${r.service} ${r.sid} ${r.note}`.toLowerCase().includes(keyword.value.toLowerCase())) &&
      (!onlyExceptions.value || r.status === '否定响应'),
  ),
)
const selectRecord = (row: Record) => (selected.value = row)
const onExpand = (row: Record, rows: Record[]) => (expanded.value = rows.map((item) => item.id))
const rowClass = ({ row }: { row: Record }) =>
  row.id === selected.value.id ? 'selected-row' : row.status === '否定响应' ? 'error-row' : ''
const notify = (message: string) => ElMessage.info(message)
</script>

<style>
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  min-width: 1240px;
  background: #f5f7fb;
  color: #1d2939;
  font-family: Inter, 'Microsoft YaHei', sans-serif;
  font-size: 13px;
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
.header-actions,
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
.header-actions .el-button {
  color: #344054;
}
.workspace {
  padding: 16px 12px 8px;
}
.toolbar {
  gap: 16px;
  height: 56px;
  padding: 0 6px;
  background: #fff;
  border-bottom: 1px solid #e7ebf1;
}
.toolbar .el-button {
  height: 36px;
}
.file-button {
  color: #344054;
}
.file-button small {
  color: #98a2b3;
  margin-left: 8px;
}
.search-input {
  width: 230px;
}
.filter {
  width: 158px;
}
.filter.wide {
  width: 140px;
}
.date-filter {
  width: 165px;
}
.toolbar-end {
  margin-left: auto;
  gap: 22px;
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
.records-panel .el-table th.el-table__cell {
  color: #475467;
  font-weight: 500;
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
  background: #fff;
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
.detail-title strong {
  font-size: 14px;
}
.detail-head {
  gap: 8px;
  height: 47px;
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
  width: 64px;
}
.detail-panel .el-descriptions__content {
  color: #344054;
}
.detail-panel .el-descriptions__cell {
  padding-bottom: 6px;
}
.detail-panel .el-divider {
  margin: 10px 0;
}
.detail-panel .el-table .cell {
  font-size: 11px;
  white-space: nowrap;
  padding: 0 4px;
}
.hex-box {
  padding: 9px;
  border-radius: 4px;
  background: #f5f7fa;
  color: #667085;
  font-family: Consolas, monospace;
  font-size: 11px;
}
.service-text {
  margin: 0;
  color: #667085;
  line-height: 1.65;
  font-size: 12px;
}
.empty-detail {
  padding-top: 120px;
}
</style>
