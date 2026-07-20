import { and, compare, equal } from 'uint8-util'

const TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0x82F63B78 ^ (c >>> 1)) : (c >>> 1)
  }
  TABLE[i] = c
}

export function crc32c (data) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < data.length; i++) {
    crc = TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function demoteIPv4Mapped (bytes) {
  if (bytes.length !== 16) return bytes
  for (let i = 0; i < 10; i++) {
    if (bytes[i] !== 0) return bytes
  }
  if (bytes[10] !== 0xFF || bytes[11] !== 0xFF) return bytes
  return bytes.subarray(12)
}

function parseIPv4 (ip) {
  return new Uint8Array(ip.split('.').slice(0, 4))
}

function parseIPv6 (ip) {
  ip = ip.replace(/^\[|\]$/g, '')

  if (ip.includes('.') && ip.includes(':')) {
    const lastColon = ip.lastIndexOf(':')
    const buf = new Uint8Array(16)
    buf[10] = 0xFF
    buf[11] = 0xFF
    buf.set(parseIPv4(ip.substring(lastColon + 1)), 12)
    return buf
  }

  const buf = new Uint8Array(16)
  const parts = ip.split(':')

  const emptyIdx = parts.indexOf('')
  if (emptyIdx === -1) {
    for (let i = 0; i < 8; i++) {
      const val = parseInt(parts[i], 16)
      buf[i * 2] = val >> 8
      buf[i * 2 + 1] = val & 0xFF
    }
  } else {
    const numBefore = emptyIdx
    const numAfter = parts.length - emptyIdx - 1
    const zeroGroups = 8 - numBefore - numAfter

    for (let i = 0; i < numBefore; i++) {
      const val = parseInt(parts[i], 16)
      buf[i * 2] = val >> 8
      buf[i * 2 + 1] = val & 0xFF
    }

    for (let i = 0; i < numAfter; i++) {
      const val = parseInt(parts[emptyIdx + 1 + i], 16)
      const offset = (numBefore + zeroGroups + i) * 2
      buf[offset] = val >> 8
      buf[offset + 1] = val & 0xFF
    }
  }

  return buf
}

export function bytesToIP (bytes) {
  if (bytes.length === 4) return bytes.join('.')

  const demoted = demoteIPv4Mapped(bytes)
  if (demoted !== bytes) return demoted.join('.')

  const parts = []
  for (let i = 0; i < 16; i += 2) {
    parts.push(((bytes[i] << 8) + bytes[i + 1]).toString(16))
  }
  return parts.join(':')
}

export function ipToBytes (ip) {
  return ip.includes(':') ? parseIPv6(ip) : parseIPv4(ip)
}

function getIPv4Mask (a, b) {
  if (a[0] === b[0] && a[1] === b[1] && a[2] === b[2]) return new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF])
  if (a[0] === b[0] && a[1] === b[1]) return new Uint8Array([0xFF, 0xFF, 0xFF, 0x55])
  return new Uint8Array([0xFF, 0xFF, 0x55, 0x55])
}

function getIPv6Mask (a, b) {
  let same = 0
  while (same < 16 && a[same] === b[same]) same++
  const prefix = same >= 7 ? 8 : same >= 6 ? 7 : 6
  const mask = new Uint8Array(16)
  for (let i = 0; i < prefix; i++) mask[i] = 0xFF
  for (let i = prefix; i < 16; i++) mask[i] = 0x55
  return mask
}

function mapIPv4ToIPv6 (bytes) {
  const mapped = new Uint8Array(16)
  mapped[10] = 0xFF
  mapped[11] = 0xFF
  mapped.set(bytes, 12)
  return mapped
}

export function computePriority (localIP, localPort, remoteIP, remotePort) {
  let localBytes = demoteIPv4Mapped(ipToBytes(localIP))
  let remoteBytes = demoteIPv4Mapped(ipToBytes(remoteIP))

  if (equal(localBytes, remoteBytes)) {
    const low = localPort <= remotePort ? localPort : remotePort
    const high = localPort <= remotePort ? remotePort : localPort
    return crc32c(new Uint8Array([low >> 8, low & 0xFF, high >> 8, high & 0xFF]))
  }

  if (localBytes.length !== remoteBytes.length) {
    if (localBytes.length === 4) localBytes = mapIPv4ToIPv6(localBytes)
    else remoteBytes = mapIPv4ToIPv6(remoteBytes)
  }

  const isV4 = localBytes.length === 4
  const mask = isV4 ? getIPv4Mask(localBytes, remoteBytes) : getIPv6Mask(localBytes, remoteBytes)
  const maskedLocal = and(localBytes, mask)
  const maskedRemote = and(remoteBytes, mask)

  const len = localBytes.length
  const buf = new Uint8Array(len * 2)
  if (compare(maskedLocal, maskedRemote) <= 0) {
    buf.set(maskedLocal)
    buf.set(maskedRemote, len)
  } else {
    buf.set(maskedRemote)
    buf.set(maskedLocal, len)
  }

  return crc32c(buf)
}
