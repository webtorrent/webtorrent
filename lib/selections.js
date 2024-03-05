/**
 * @typedef {Object} MinimalSelectionItem
 * @property {number} from
 * @property {number} to
 */

/** A selection of pieces to download.
 * @typedef {MinimalSelectionItem & {
 *  offset: number,
 *  priority: number,
 *  isStreamSelection?: boolean
 * }} SelectionItem
 */

/**
 * @typedef {MinimalSelectionItem & {notify: function}} NotificationItem
 */

export class Selections {
  /** @type {Array<SelectionItem>} */
  _items = []

  /** @type {Array<NotificationItem>} */
  _notifications = []

  /**
   * @param {MinimalSelectionItem & {isStreamSelection?: boolean}} item Interval to be removed from the selection
   */
  remove (item) {
    for (let i = 0; i < this._items.length; i++) {
      const existing = this._items[i]

      if (existing.isStreamSelection) {
        if (item.isStreamSelection) {
          // If both are stream selections and they match, then we remove the first matching item, then we break the loop
          if (existing.from === item.from && existing.to === item.to) {
            this._items.splice(i, 1)
            // for stream selections, we only remove one item at a time
            // ergo we break the loop after removing the first matching item
            break
          }
        } else {
          // we only remove stream selections when the `isStreamSelection` flag is true and they match
          continue
        }
      }

      if (isLowerIntersecting(item, existing)) {
        existing.to = Math.max(item.from - 1, 0)
        continue
      }
      if (isUpperIntersecting(item, existing)) {
        existing.from = item.to + 1
        continue
      }
      if (isInsideExisting(item, existing)) {
        const existingStart = { ...existing, to: Math.max(item.from - 1, 0) }
        const existingEnd = { ...existing, from: item.to + 1 }
        if (existingStart.to - existingStart.from > 0) {
          this._items.splice(i, 1, existingStart, existingEnd)
        } else {
          this._items.splice(i, 1, existingEnd)
        }
        continue
      }
      if (isCoveringExisting(item, existing)) {
        this._items.splice(i, 1)
        i -= 1
        continue
      }
    }
  }

  /**
   * @param {SelectionItem & NotificationItem} newItem
   */
  insert (newItem) {
    const { from, to, notify, isStreamSelection, ...restItem } = newItem
    if (from > to) {
      throw new Error('Invalid interval')
    }
    if (!isStreamSelection) {
      this.remove({ from, to, isStreamSelection })
    }
    this._items.push({ from, to, isStreamSelection, ...restItem })
    if (notify) this._notifications.push({ from, to, notify })
  }

  /**
   * Returns all the notifications that in any way intersect with the given range
   * @param {MinimalSelectionItem} range
   */
  getNotificationsByRange (range) {
    return this._notifications.filter(notification => {
      if ((notification.to - notification.from) <= 0) return false
      return isCoveringExisting(range, notification) ||
        isInsideExisting(range, notification) ||
        isLowerIntersecting(range, notification) ||
        isUpperIntersecting(range, notification)
    })
  }

  /**
   * Removes a notification from the list of notifications by reference
   * @param {NotificationItem} notification
   */
  removeNotification (notification) {
    const index = this._notifications.findIndex(n => n === notification)
    if (index !== -1) {
      this._notifications.splice(index, 1)
    }
  }

  /**
   * @param {(a: SelectionItem, b: SelectionItem) => number} sortFn
   */
  sort (sortFn = (a, b) => a.from - b.from) {
    this._items.sort(sortFn)
  }

  get length () {
    return this._items.length
  }

  /**
   * Takes an index and returns the item at that index
   * @param {number} index
   */
  get (index) {
    return this._items[index]
  }

  /**
   * Takes an index and an item and replaces the item at the index with the new item
   * @param {number} index
   * @param {SelectionItem} item
   */
  set (index, item) {
    this._items[index] = item
  }

  /**
   * Takes two indexes and swaps the items at those indexes
   * @param {number} i
   * @param {number} j
   */
  swap (i, j) {
    const temp = this._items[i]
    this._items[i] = this._items[j]
    this._items[j] = temp
  }

  clear () {
    this._items.length = 0
  }

  * [Symbol.iterator] () {
    for (let i = 0; i < this._items.length; i++) {
      const item = this._items[i]
      yield {
        ...item,
        remove: () => {
          this._items.splice(i, 1)
          i -= 1
        }
      }
    }
  }
}

/**
 * Examples:
 * existing: 1-10 | 1-10
 * new_item: 8-12 | 10-15
 * @param {MinimalSelectionItem} newItem
 * @param {MinimalSelectionItem} existing
 * @returns {boolean} returns true if the new item's lower end is intersecting with the existing item
 */
export function isLowerIntersecting (newItem, existing) {
  return (newItem.from <= existing.to) && (newItem.from > existing.from) && (newItem.to > existing.to)
}

/**
 * Examples:
 * existing: 20-25 | 20-25
 * new_item: 15-22 | 15-20
 * @param {MinimalSelectionItem} newItem
 * @param {MinimalSelectionItem} existing
 * @returns {boolean} returns true if the new item's upper end is intersecting with the existing item
 */
export function isUpperIntersecting (newItem, existing) {
  return (newItem.to >= existing.from) && (newItem.to < existing.to) && (newItem.from < existing.from)
}

/**
 * Examples:
 * existing: 10-20 | 10-20 | 10-20
 * new_item: 12-15 | 20-20 | 15-20
 * @param {MinimalSelectionItem} newItem
 * @param {MinimalSelectionItem} existing
 * @returns {boolean} returns true if the new item is completely inside the existing item
 */
export function isInsideExisting (newItem, existing) {
  const existingIntervalSize = existing.to - existing.from
  const newItemIntervalSize = newItem.to - newItem.from
  return newItem.from >= existing.from && newItem.to <= existing.to && (newItemIntervalSize < existingIntervalSize)
}

/**
 * Examples:
 * existing: 10-20 | 10-20 | 10-20
 * new_item: 10-21 | 09-20 | 10-20
 * @param {MinimalSelectionItem} newItem
 * @param {MinimalSelectionItem} existing
 * @returns {boolean} returns true if the new item is covering the existing item
 */
export function isCoveringExisting (newItem, existing) {
  return newItem.from <= existing.from && newItem.to >= existing.to
}
