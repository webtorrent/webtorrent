import test from 'tape'
import { crc32c, computePriority, ipToBytes, bytesToIP } from '../../lib/bep40.js'

test('crc32c test vectors', t => {
  t.equal(crc32c(new Uint8Array(0)), 0x00000000, 'empty buffer')
  t.equal(crc32c(new Uint8Array(4)), 0x48674BC7, '4 zero bytes')
  t.equal(crc32c(new Uint8Array(8)), 0x8C28B28A, '8 zero bytes')
  t.equal(crc32c(new TextEncoder().encode('a')), 0xC1D04330, 'string "a"')
  t.end()
})

test('ipToBytes / bytesToIP round trip', t => {
  t.equal(bytesToIP(ipToBytes('10.0.1.5')), '10.0.1.5', 'IPv4')
  t.equal(bytesToIP(ipToBytes('::1')), '0:0:0:0:0:0:0:1', 'IPv6 ::1')
  t.equal(bytesToIP(ipToBytes('2001:db8::1')), '2001:db8:0:0:0:0:0:1', 'IPv6 2001:db8::1')
  t.equal(bytesToIP(ipToBytes('::ffff:10.0.1.1')), '10.0.1.1', 'IPv4-mapped IPv6 demoted')
  t.end()
})

test('computePriority symmetric — swapping local/remote gives same result', t => {
  const a = computePriority('10.0.1.5', 6881, '10.0.1.1', 6882)
  const b = computePriority('10.0.1.1', 6882, '10.0.1.5', 6881)
  t.equal(a, b, 'same subnet')

  const c = computePriority('1.2.3.4', 6881, '5.6.7.8', 6881)
  const d = computePriority('5.6.7.8', 6881, '1.2.3.4', 6881)
  t.equal(c, d, 'different subnet')

  const e = computePriority('10.0.1.5', 6881, '10.0.1.5', 6882)
  const f = computePriority('10.0.1.5', 6882, '10.0.1.5', 6881)
  t.equal(e, f, 'same IP')

  const g = computePriority('::1', 6881, '::2', 6881)
  const h = computePriority('::2', 6881, '::1', 6881)
  t.equal(g, h, 'IPv6')
  t.end()
})

test('computePriority same-IP falls back to port sort', t => {
  const r1 = computePriority('10.0.1.5', 6881, '10.0.1.5', 6882)
  const r2 = computePriority('10.0.1.5', 6882, '10.0.1.5', 6881)
  t.equal(r1, r2, 'port order swapped gives same result')
  t.notEqual(r1, computePriority('10.0.1.5', 6881, '10.0.1.5', 6881), 'different ports give different result')
  t.end()
})

test('computePriority same-subnet uses /24 mask', t => {
  // 10.0.1.5 and 10.0.1.1 share /24 -> mask = 0xFFFFFFFF -> both masked to 10.0.1.0 -> equal -> port fallback
  const r1 = computePriority('10.0.1.5', 6881, '10.0.1.1', 6882)
  t.equal(r1, computePriority('10.0.1.1', 6882, '10.0.1.5', 6881), 'symmetric')

  const samePort = computePriority('10.0.1.5', 6881, '10.0.1.1', 6881)
  t.equal(samePort, 0xE43A84A7, 'same port same subnet -> port buffer')
  t.end()
})

test('computePriority different subnet', t => {
  const r = computePriority('1.2.3.4', 6881, '5.6.7.8', 6881)
  t.equal(r, 0x3099D763, 'known reference value')
  t.end()
})

test('computePriority IPv6', t => {
  const r1 = computePriority('::1', 6881, '::2', 6881)
  const r2 = computePriority('::2', 6881, '::1', 6881)
  t.equal(r1, r2, 'symmetric')
  t.equal(r1, 0x78FAB5A9, 'known reference value')
  t.end()
})

test('BEP 40 canonical test vectors', t => {
  // From https://www.bittorrent.org/beps/bep_0040.html:
  //   crc32-c(624C14007BD50000) -> ec2d7224
  //   123.213.32.10 vs 98.76.54.32, diff /16 -> mask FF.FF.55.55 -> sorted masked: [98,76,20,0,123,213,0,0]
  t.equal(computePriority('123.213.32.10', 6881, '98.76.54.32', 6881), 0xec2d7224, 'diff subnet')
  t.equal(computePriority('98.76.54.32', 6881, '123.213.32.10', 6881), 0xec2d7224, 'diff subnet (swapped)')

  //   crc32-c(7BD5200A7BD520EA) -> 99568189
  //   123.213.32.10 vs 123.213.32.234, same /24 -> mask FF.FF.FF.FF -> sorted: [123,213,32,10,123,213,32,234]
  t.equal(computePriority('123.213.32.10', 6881, '123.213.32.234', 6881), 0x99568189, 'same /24')
  t.equal(computePriority('123.213.32.234', 6881, '123.213.32.10', 6881), 0x99568189, 'same /24 (swapped)')
  t.end()
})

test('computePriority mixed IPv4 and IPv4-mapped IPv6 produces identical results', t => {
  const ips = [
    ['10.0.1.5', 6881, '10.0.1.1', 6881],
    ['10.0.1.5', 6882, '::ffff:10.0.1.1', 6881],
    ['::ffff:10.0.1.5', 6881, '10.0.1.1', 6881]
  ]
  const ref = computePriority('10.0.1.5', 6881, '::ffff:10.0.1.1', 6881)
  for (const [a, pa, b, pb] of ips) {
    t.equal(computePriority(a, pa, b, pb), ref, `${a}:${pa} vs ${b}:${pb}`)
  }
  t.end()
})
