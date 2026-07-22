export type Direction = '请求' | '响应'
export type ParseStatus = '成功' | '否定响应' | '解析异常'

export interface CanFrame {
  index: number
  offsetMs: number
  time: string
  rawDirection: 'Rx' | 'Tx'
  direction: Direction
  can: string
  ecu: string
  type: 'Single Frame' | 'First Frame' | 'Consecutive Frame' | 'Flow Control' | 'Unknown'
  length: number
  data: number[]
  dataHex: string
}

export interface UdsField {
  label: string
  value: string
}

export interface UdsRecord {
  id: number
  index: number
  time: string
  offsetMs: number
  direction: Direction
  can: string
  ecu: string
  service: string
  sid: string
  sub: string
  length: number
  status: ParseStatus
  note: string
  payload: number[]
  payloadHex: string
  fields: UdsField[]
  frames: CanFrame[]
  error?: string
}

export interface ParseResult {
  startTime?: string
  frames: CanFrame[]
  records: UdsRecord[]
}

const serviceNames: Record<number, string> = {
  0x10: 'Diagnostic Session Control',
  0x11: 'ECU Reset',
  0x14: 'Clear Diagnostic Information',
  0x19: 'Read DTC Information',
  0x22: 'Read Data By Identifier',
  0x27: 'Security Access',
  0x28: 'Communication Control',
  0x2e: 'Write Data By Identifier',
  0x2f: 'Input Output Control By Identifier',
  0x31: 'Routine Control',
  0x34: 'Request Download',
  0x35: 'Request Upload',
  0x36: 'Transfer Data',
  0x37: 'Request Transfer Exit',
  0x3e: 'Tester Present',
  0x85: 'Control DTC Setting',
}

const nrcNames: Record<number, string> = {
  0x10: '一般拒绝',
  0x11: '服务不支持',
  0x12: '子功能不支持',
  0x13: '消息长度或格式错误',
  0x22: '条件不满足',
  0x24: '请求序列错误',
  0x31: '请求超出范围',
  0x33: '安全访问被拒绝',
  0x35: '无效密钥',
  0x36: '超过尝试次数',
  0x37: '要求延时未到',
  0x70: '上传下载未接受',
  0x71: '传输数据暂停',
  0x72: '一般编程失败',
  0x73: '错误块序号',
  0x78: '响应等待中',
}

const hex = (value: number) => `0x${value.toString(16).toUpperCase().padStart(2, '0')}`
const bytesHex = (bytes: number[]) =>
  bytes.map((byte) => byte.toString(16).toUpperCase().padStart(2, '0')).join(' ')
const addressInfo = (canId: number): Pick<CanFrame, 'direction' | 'ecu'> => {
  if (canId === 0x7df) return { direction: '请求', ecu: '广播' }
  if (canId >= 0x7e8 && canId <= 0x7ef)
    return { direction: '响应', ecu: `ECU-${String(canId - 0x7e7).padStart(2, '0')}` }
  if (canId >= 0x7e0 && canId <= 0x7e7)
    return { direction: '请求', ecu: `ECU-${String(canId - 0x7df).padStart(2, '0')}` }
  return { direction: '请求', ecu: '未知 ECU' }
}

const formatTime = (offsetMs: number) => {
  const total = Math.max(0, Math.round(offsetMs * 1000))
  const ms = Math.floor(total / 1000)
  const micros = total % 1000
  const seconds = Math.floor(ms / 1000) % 60
  const minutes = Math.floor(ms / 60000) % 60
  const hours = Math.floor(ms / 3600000)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}.${String(micros).padStart(3, '0')}`
}

const frameType = (firstByte: number | undefined): CanFrame['type'] => {
  if (firstByte === undefined) return 'Unknown'
  switch (firstByte >> 4) {
    case 0:
      return 'Single Frame'
    case 1:
      return 'First Frame'
    case 2:
      return 'Consecutive Frame'
    case 3:
      return 'Flow Control'
    default:
      return 'Unknown'
  }
}

const fieldsFor = (
  payload: number[],
  direction: Direction,
): {
  service: string
  sid: string
  sub: string
  status: ParseStatus
  note: string
  fields: UdsField[]
} => {
  const sid = payload[0] ?? 0
  if (sid === 0x7f) {
    const requestSid = payload[1] ?? 0
    const nrc = payload[2] ?? 0
    const nrcName = nrcNames[nrc] ?? '未定义否定响应码'
    return {
      service: 'Negative Response',
      sid: hex(sid),
      sub: hex(requestSid),
      status: '否定响应',
      note: `NRC: ${hex(nrc)}（${nrcName}）`,
      fields: [
        { label: '请求 SID', value: hex(requestSid) },
        { label: 'NRC', value: `${hex(nrc)} - ${nrcName}` },
      ],
    }
  }
  const requestSid = direction === '响应' && sid >= 0x40 ? sid - 0x40 : sid
  const service = serviceNames[requestSid] ?? 'Unknown UDS Service'
  const sub = payload.length > 1 ? hex(payload[1] ?? 0) : '-'
  const fields: UdsField[] = [{ label: 'SID', value: hex(sid) }]
  if (payload.length > 1) fields.push({ label: '子功能 / 参数', value: sub })
  if ((requestSid === 0x22 || requestSid === 0x2e || requestSid === 0x2f) && payload.length >= 3)
    fields.push({
      label: 'DID',
      value: `0x${(payload[1] ?? 0).toString(16).toUpperCase().padStart(2, '0')}${(payload[2] ?? 0).toString(16).toUpperCase().padStart(2, '0')}`,
    })
  if (requestSid === 0x31 && payload.length >= 4)
    fields.push({
      label: '例程 ID',
      value: `0x${(payload[2] ?? 0).toString(16).toUpperCase().padStart(2, '0')}${(payload[3] ?? 0).toString(16).toUpperCase().padStart(2, '0')}`,
    })
  const note =
    service === 'Unknown UDS Service'
      ? '未知服务，保留原始数据'
      : direction === '响应'
        ? '肯定响应'
        : '服务请求'
  return { service, sid: hex(sid), sub, status: '成功', note, fields }
}

const buildRecord = (
  id: number,
  frames: CanFrame[],
  payload: number[],
  error?: string,
): UdsRecord => {
  const first = frames[0]!
  if (error)
    return {
      id,
      index: id,
      time: first.time,
      offsetMs: first.offsetMs,
      direction: first.direction,
      can: first.can,
      ecu: first.ecu,
      service: 'ISO-TP Parse Error',
      sid: payload.length ? hex(payload[0]!) : '-',
      sub: '-',
      length: payload.length,
      status: '解析异常',
      note: error,
      payload,
      payloadHex: bytesHex(payload),
      fields: [],
      frames,
      error,
    }
  const parsed = fieldsFor(payload, first.direction)
  return {
    id,
    index: id,
    time: first.time,
    offsetMs: first.offsetMs,
    direction: first.direction,
    can: first.can,
    ecu: first.ecu,
    length: payload.length,
    payload,
    payloadHex: bytesHex(payload),
    frames,
    ...parsed,
  }
}

export const parseTrc = (content: string): ParseResult => {
  const startMatch = content.match(/^;\$STARTTIME=(.+)$/m)
  const frames: CanFrame[] = []
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(
      /^\s*(\d+)\s+(\d+(?:\.\d+)?)\s+\S+\s+([0-9A-Fa-f]+)\s+(Rx|Tx)\s+(\d+)\s+(.+)$/,
    )
    if (!match) continue
    const index = Number(match[1])
    const offsetMs = Number(match[2])
    const canNumber = Number.parseInt(match[3]!, 16)
    const length = Number(match[5])
    const data = (match[6]?.trim().split(/\s+/) ?? [])
      .slice(0, length)
      .map((byte) => Number.parseInt(byte, 16))
      .filter((byte) => Number.isFinite(byte))
    const info = addressInfo(canNumber)
    frames.push({
      index,
      offsetMs,
      time: formatTime(offsetMs),
      rawDirection: match[4] as 'Rx' | 'Tx',
      direction: info.direction,
      can: `0x${match[3]!.toUpperCase()}`,
      ecu: info.ecu,
      type: frameType(data[0]),
      length,
      data,
      dataHex: bytesHex(data),
    })
  }
  if (!frames.length) throw new Error('未找到 PCAN-View TRC 2.0 数据帧，请确认文件格式。')

  const records: UdsRecord[] = []
  let recordId = 1
  const pending = new Map<
    string,
    { frames: CanFrame[]; payload: number[]; expected: number; nextSequence: number }
  >()
  const emit = (item: { frames: CanFrame[]; payload: number[] }, error?: string) =>
    records.push(buildRecord(recordId++, item.frames, item.payload, error))
  for (const frame of frames) {
    const pci = frame.data[0] ?? 0
    const type = pci >> 4
    const key = frame.can
    if (type === 0) {
      const length = pci & 0x0f
      emit(
        { frames: [frame], payload: frame.data.slice(1, 1 + length) },
        length > frame.data.length - 1 ? '单帧长度超过 DLC' : undefined,
      )
      continue
    }
    if (type === 1) {
      const existing = pending.get(key)
      if (existing) emit(existing, '新的首帧到达前，上一个多帧报文未完成')
      const expected = ((pci & 0x0f) << 8) | (frame.data[1] ?? 0)
      pending.set(key, { frames: [frame], payload: frame.data.slice(2), expected, nextSequence: 1 })
      continue
    }
    if (type === 2) {
      const item = pending.get(key)
      if (!item) continue
      const sequence = pci & 0x0f
      item.frames.push(frame)
      if (sequence !== item.nextSequence) {
        emit(item, `连续帧序号错误：期望 ${item.nextSequence}，收到 ${sequence}`)
        pending.delete(key)
        continue
      }
      item.nextSequence = (item.nextSequence + 1) & 0x0f
      item.payload.push(...frame.data.slice(1))
      if (item.payload.length >= item.expected) {
        item.payload.length = item.expected
        emit(item)
        pending.delete(key)
      }
    }
  }
  for (const item of pending.values())
    emit(item, `多帧报文不完整：期望 ${item.expected} bytes，收到 ${item.payload.length} bytes`)
  return { startTime: startMatch?.[1]?.trim(), frames, records }
}
