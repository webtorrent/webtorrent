/*!
 * Fast node `require('process')` for modern browsers
 *
 * @author   Mathias Rasmussen <mathiasvr@gmail.com>
 * @license  MIT
 */
import queueMicrotask from 'queue-microtask'

const title = 'browser'
const browser = true
const env = {}
const argv = []
const version = ''
const versions = {}

function noop () {}

const on = noop
const addListener = noop
const once = noop
const off = noop
const removeListener = noop
const removeAllListeners = noop
const emit = noop
const prependListener = noop
const prependOnceListener = noop

const nextTick = (func, ...args) => queueMicrotask(() => func(...args))

const listeners = (name) => []

const cwd = () => '/'
const umask = () => 0
const binding = (name) => { throw new Error('process.binding is not supported') }
const chdir = (dir) => { throw new Error('process.chdir is not supported') }

export {
  title, browser, env, argv, version, versions, on, addListener, once, off, removeListener,
  removeAllListeners, emit, prependListener, prependOnceListener, nextTick, listeners, cwd, umask, binding, chdir
}
