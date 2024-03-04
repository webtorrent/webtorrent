/**
 * @typedef {Object} MinimalSelectionItem
 * @property {number} from
 * @property {number} to
 */

/** A selection of pieces to download.
 * @typedef {MinimalSelectionItem & {
 *  offset: number,
 *  priority: number,
 *  notify: function,
 *  isStreamSelection?: boolean
 * }} SelectionItem
 */

export class Selections {
  /**
   * @type {Array<SelectionItem>}
   */
  _items = []

  /**
   * @param {SelectionItem} item Interval to be removed from the selection
   */
  remove (item) {
    for (let i = 0; i < this._items.length; i++) {
      const existing = this._items[i]

      if (existing.isStreamSelection) {
        if (item.isStreamSelection) {
          // If both are stream selections and they match, then we remove the first matching item, then we break the loop
          if (existing.from === item.from && existing.to === item.to && existing.priority === item.priority) {
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
        existing.to = item.from - 1
        continue
      }
      if (isUpperIntersecting(item, existing)) {
        existing.from = item.to + 1
        continue
      }
      if (isInsideExisting(item, existing)) {
        const existingStart = { ...existing, to: item.from - 1 }
        const existingEnd = { ...existing, from: item.to + 1 }
        this._items.splice(i, 1, existingStart, existingEnd)
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
   * @param {SelectionItem} newItem
   */
  insert (newItem) {
    if (newItem.from > newItem.to) {
      throw new Error('Invalid interval')
    }
    if (!newItem.isStreamSelection) {
      this.remove(newItem)
    }
    this._items.push({ ...newItem })
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
 * @param {MinimalSelectionItem} newItem
 * @param {MinimalSelectionItem} existing
 * @returns {boolean} returns true if the new item's lower end is intersecting with the existing item
 */
export function isLowerIntersecting (newItem, existing) {
  return (newItem.from <= existing.to) && (newItem.from > existing.from) && (newItem.to > existing.to)
}

/**
 * @param {MinimalSelectionItem} newItem
 * @param {MinimalSelectionItem} existing
 * @returns {boolean} returns true if the new item's upper end is intersecting with the existing item
 */
export function isUpperIntersecting (newItem, existing) {
  return (newItem.to >= existing.from) && (newItem.to < existing.to) && (newItem.from < existing.from)
}

/**
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
 * @param {MinimalSelectionItem} newItem
 * @param {MinimalSelectionItem} existing
 * @returns {boolean} returns true if the new item is covering the existing item
 */
export function isCoveringExisting (newItem, existing) {
  return newItem.from <= existing.from && newItem.to >= existing.to
}
