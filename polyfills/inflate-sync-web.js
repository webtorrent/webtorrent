import { inflate } from 'pako'

export const inflateSync = (buffer) => inflate(buffer, { to: 'string' })
