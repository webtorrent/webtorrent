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
    for (const existing of this) {
      if (existing.isStreamSelection) {
        if (item.isStreamSelection) {
          // If both are stream selections and they match, then we remove the first matching item, then we break the loop
          if (existing.from === item.from && existing.to === item.to) {
            existing.remove()
            // for stream selections, we only remove one item at a time
            // ergo we break the loop after removing the first matching item
            break
          }
        } else {
          // we only remove stream selections when the `isStreamSelection` flag is true and they match
          continue
        }
      }

      const clearedExisting = clearIntersection(item, existing)
      if (clearedExisting !== null) {
        existing.replaceWith(clearedExisting)
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

  /** @param {MinimalSelectionItem} range */
  callNotifyInRange (range) {
    for (const notification of this._notifications) {
      if (isLowerIntersecting(range, notification) ||
            isUpperIntersecting(range, notification) ||
            isInsideExisting(range, notification) ||
            isCoveringExisting(range, notification)
      ) {
        notification.notify()
      }
    }
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

  /** @returns {Generator<SelectionItem & {remove: () => void, replaceWith: (MinimalSelectionItem[]) => void}>} */
  * [Symbol.iterator] () {
    for (let i = 0; i < this._items.length; i++) {
      const item = this._items[i]

      item.replaceWith = (replacingItems) => {
        this._items.splice(i, 1, ...replacingItems)
        i = i - 1 + replacingItems.length // adjust i after splice

        if (replacingItems.length !== 0) return
        // when a selection is finished and removed, we need to also remove this interval from the notifications
        for (let j = 0; j < this._notifications.length; j++) {
          const notification = this._notifications[j]
          const clearedNotification = clearIntersection(item, notification)
          if (clearedNotification !== null) {
            this._notifications.splice(j, 1, ...clearedNotification)
            j = j - 1 + clearedNotification.length // decrement j to offset splice
          }
        }
      }

      item.remove = () => item.replaceWith([])

      yield item

      delete item.replaceWith
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

/**
 * Takes two intervals and returns null if no changes are needed, or an array of intervals that remain
 * after the existing interval is truncated or removed to make space for the new interval
 * @param {MinimalSelectionItem} item
 * @param {MinimalSelectionItem} existing
 * @return {MinimalSelectionItem[] | null}
 */
export const clearIntersection = (item, existing) => {
  if (isLowerIntersecting(item, existing)) {
    existing.to = Math.max(item.from - 1, 0)
    return [existing]
  }
  if (isUpperIntersecting(item, existing)) {
    existing.from = item.to + 1
    return [existing]
  }
  if (isInsideExisting(item, existing)) {
    const returnedArray = []
    const existingStart = { ...existing, to: Math.max(item.from - 1, 0) }
    if (existingStart.to - existingStart.from > 0) returnedArray.push(existingStart)
    const existingEnd = { ...existing, from: item.to + 1 }
    if (existingEnd.to - existingEnd.from > 0) returnedArray.push(existingEnd)
    return returnedArray
  }
  if (isCoveringExisting(item, existing)) {
    return []
  }
  return null
}
