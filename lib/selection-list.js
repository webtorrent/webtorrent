const { Interval, NonOverlappingIntervalTree } = require('nonoverlapping-interval-tree')
const { IBplusTree, FlatInterval } = require('i2bplustree')

class SelectionInterval extends Interval {
  get priority () {
    return this.data
  }

  set priority (priority) {
    this.data = priority
  }
}

class NotificationInterval extends FlatInterval {
  constructor (from, to, notify) {
    if (typeof notify !== 'function') throw new Error('notify must be a function')

    super(from, to)
    this.notify = notify
  }

  get from () {
    return this.lowerBound
  }

  set from (from) {
    this.lowerBound = from
  }

  get to () {
    return this.upperBound
  }

  set to (to) {
    this.upperBound = to
  }
}

class SelectionList {
  constructor () {
    this._list = []
    this._tree = new NonOverlappingIntervalTree({}, SelectionInterval)

    // Synchronize tree with map
    this._tree.on('insert', (interval) => {
      this._onTreeInsert(interval)
    })
    this._tree.on('delete', (interval) => {
      this._onTreeDelete(interval)
    })

    this._notifications = new IBplusTree()
  }

  get (i) {
    return this._list[i]
  }

  set (i, elem) {
    if (i < 0 || i > this._list.length) throw new Error('index is out of bounds')
    this._list[i] = elem
  }

  add (from, to, priority, notify) {
    this._tree.add(from, to, priority)

    // Add (optional) notify
    if (notify) this._notifications.insert(new NotificationInterval(from, to, notify))
  }

  remove (from, to) {
    this._tree.remove(from, to)

    // Remove notifications from the range
    const notificationIntervals = this._notifications.containedRangeSearch(from, to)
    for (const n of notificationIntervals) {
      this._notifications.delete(n)
    }
  }

  get length () {
    return this._list.length
  }

  [Symbol.iterator] () {
    return this._list.values()
  }

  getNotificationsByRange (from, to) {
    return this._notifications.allRangeSearch(from, to)
  }

  removeNotification (notification) {
    this._notifications.delete(notification)
  }

  _onTreeInsert (interval) {
    this._list.push(interval)

    this._list.sort((a, b) => {
      if (a.priority > b.priority) return -1
      else if (a.priority < b.priority) return 1
      else return 0
    })
  }

  _onTreeDelete (interval) {
    // The list might be unsorted
    for (let i = 0; i < this._list.length; i++) {
      const int = this._list[i]
      if (int.from === interval.from && int.to === interval.to) {
        this._list.splice(i, 1)
        break
      }
    }
  }

  destroy () {
    this._list = null
    this._tree = null
    this._notifications = null
  }
}

module.exports = SelectionList
