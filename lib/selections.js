/**
 * @typedef {Object} MinimalSelectionItem
 * @property {number} from
 * @property {number} to
 */

/** A selection of pieces to download.
 * @typedef {MinimalSelectionItem & {
 *  offset: number,
 *  priority?: number,
 *  notify?: function
 *  remove?: function,
 *  isStreamSelection?: boolean
 * }} SelectionItem
 */

/**
 * @typedef {MinimalSelectionItem & {notify: function}} NotificationItem
 */

export class Selections {
  /** @type {Array<SelectionItem>} */
  _items = []

  /**
   * @param {MinimalSelectionItem & {isStreamSelection?: boolean}} item Interval to be removed from the selection
   */
  remove (item) {
    for (let i = 0; i < this._items.length; i++) {
      const existing = this._items[i]
      // we only remove stream selections when the `isStreamSelection` flag match, cast to boolean using !
      if (!existing.isStreamSelection !== !item.isStreamSelection) continue

      if (existing.isStreamSelection) {
        // If both are stream selections and they match, then we remove the first matching item, then we break the loop
        if (existing.from === item.from && existing.to === item.to) {
          this._items.splice(i, 1)
          // for stream selections, we only remove one item at a time
          // ergo we break the loop after removing the first matching item
          // stream selections are non-unique, so this is in a way a count
          break
        }
      } else {
        if (isLowerIntersecting(item, existing)) {
          existing.to = Math.max(item.from - 1, 0)
        } else if (isUpperIntersecting(item, existing)) {
          existing.from = item.to + 1
        } else if (isInsideExisting(item, existing)) {
          const replacingItems = []
          const existingStart = { ...existing, to: Math.max(item.from - 1, 0) }
          if (existingStart.to - existingStart.from >= 0 && item.from !== 0) replacingItems.push(existingStart)
          const existingEnd = { ...existing, from: item.to + 1 }
          if (existingEnd.to - existingEnd.from >= 0) replacingItems.push(existingEnd)
          this._items.splice(i, 1, ...replacingItems)
          i = i - 1 + replacingItems.length // decrement i to offset splice
        } else if (isCoveringExisting(item, existing)) {
          this._items.splice(i, 1)
          i--
        }
      }
    }
  }

  /**
   * Merges the priority and notify functions of two selection items.
   * @param {SelectionItem} newItem
   * @param {SelectionItem} existing
   */
  _mergePriorityAndNotify (newItem, existing) {
    if ((existing.priority ?? 0) > (newItem.priority ?? 0)) {
      newItem.priority = existing.priority
    }

    if (newItem.notify && existing.notify) {
      const oldNotify = newItem.notify
      newItem.notify = () => {
        oldNotify()
        existing.notify?.()
      }
    } else {
      newItem.notify = existing.notify || newItem.notify
    }
  }

  concatenate (newItem) {
    for (let i = 0; i < this._items.length; i++) {
      const existing = this._items[i]

      if (!existing.isStreamSelection) {
        if (isLowerIntersecting(newItem, existing)) {
          newItem.from = existing.from
        } else if (isUpperIntersecting(newItem, existing)) {
          newItem.to = existing.to
        } else if (isInsideExisting(newItem, existing)) {
          newItem.from = existing.from
          newItem.to = existing.to
        } else if (isCoveringExisting(newItem, existing)) {
          continue
        } else {
          continue
        }
        this._mergePriorityAndNotify(newItem, existing)
      }
    }

    this.remove(newItem)
  }

  /**
   * @param {SelectionItem & NotificationItem} newItem
   */
  insert (newItem) {
    if (newItem.from > newItem.to) {
      throw new Error('Invalid interval')
    }
    if (!newItem.isStreamSelection) this.concatenate(newItem)
    this._items.push(newItem)
  }

  /** @param {(a: SelectionItem, b: SelectionItem) => number} sortFn */
  sort (sortFn = (a, b) => a.from - b.from) {
    this._items.sort(sortFn)
  }

  get length () {
    return this._items.length
  }

  /**  @param {number} index */
  get (index) {
    return this._items[index]
  }

  swap (i, j) {
    const temp = this._items[i]
    this._items[i] = this._items[j]
    this._items[j] = temp
  }

  clear () {
    this._items.length = 0
  }

  /** @returns {Generator<SelectionItem & {remove: function}>} */
  * [Symbol.iterator] () {
    for (let i = 0; i < this._items.length; i++) {
      const item = this._items[i]

      item.remove = () => {
        this._items.splice(i, 1)
        i--
      }
      yield item
      delete item.remove
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
  return (newItem.from <= existing.to + 1) && (newItem.from > existing.from) && (newItem.to > existing.to)
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
  return (newItem.to >= existing.from - 1) && (newItem.to < existing.to) && (newItem.from < existing.from)
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

export const isIntersecting = (newItem, existing) => () =>
  isLowerIntersecting(newItem, existing) ||
    isUpperIntersecting(newItem, existing) ||
    isInsideExisting(newItem, existing) ||
    isCoveringExisting(newItem, existing)
