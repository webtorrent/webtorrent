/** A selection of pieces to download.
 * @typedef {Object} SelectionItem
 * @property {number} from
 * @property {number} to
 * @property {number} offset
 * @property {number} priority
 * @property {function} notify
 */

export class Selection {
  /**
   * @type {Array<SelectionItem>}
   * @private
   */
  _items = []

  /**
   * @public
   * @param {{from: number, to: number}} item Interval to be removed from the selection
   */
  remove (item) {
    for (let i = 0; i < this._items.length; i++) {
      const existing = this._items[i]
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
   * @public
   * @param {SelectionItem} newItem
   */
  insert (newItem) {
    if (newItem.from > newItem.to) {
      throw new Error('Invalid interval')
    }
    this.remove(newItem)
    this._items.push(newItem)
  }

  /**
   * @public
   * @param {(a: SelectionItem, b: SelectionItem) => number} sortFn
   */
  sort (sortFn = (a, b) => a.from - b.from) {
    this._items.sort(sortFn)
  }

  /**
   * @public
   */
  isEmpty () {
    return this._items.length === 0
  }

  /**
   * @public
   */
  get length () {
    return this._items.length
  }

  /**
   * Takes an index and returns the item at that index
   * @public
   * @param {number} index
   */
  get (index) {
    return this._items[index]
  }

  /**
   * Takes an index and an item and replaces the item at the index with the new item
   * @public
   * @param {number} index
   * @param {SelectionItem} item
   */
  set (index, item) {
    this._items[index] = item
  }

  /**
   * Takes two indexes and swaps the items at those indexes
   * @public
   * @param {number} i
   * @param {number} j
   */
  swap (i, j) {
    const temp = this._items[i]
    this._items[i] = this._items[j]
    this._items[j] = temp
  }

  /**
   * @public
   */
  clear () {
    this._items.length = 0
  }

  * [Symbol.iterator] () {
    const self = this
    for (let i = 0; i < this._items.length; i++) {
      const item = this._items[i]
      yield {
        ...item,
        remove () {
          self._items.splice(i, 1)
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
 * @param {SelectionItem} newItem
 * @param {SelectionItem} existing
 * @returns {boolean} returns true if the new item's lower end is intersecting with the existing item
 */
export function isLowerIntersecting (newItem, existing) {
  return (newItem.from <= existing.to) && (newItem.from > existing.from) && (newItem.to > existing.to)
}

/**
 * Examples:
 * existing: 20-25 | 20-25
 * new_item: 15-22 | 15-20
 * @param {SelectionItem} newItem
 * @param {SelectionItem} existing
 * @returns {boolean} returns true if the new item's upper end is intersecting with the existing item
 */
export function isUpperIntersecting (newItem, existing) {
  return (newItem.to >= existing.from) && (newItem.to < existing.to) && (newItem.from < existing.from)
}

/**
 * Examples:
 * existing: 10-20 | 10-20 | 10-20
 * new_item: 12-15 | 20-20 | 15-20
 * @param {SelectionItem} newItem
 * @param {SelectionItem} existing
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
 * @param {SelectionItem} newItem
 * @param {SelectionItem} existing
 * @returns {boolean} returns true if the new item is covering the existing item
 */
export function isCoveringExisting (newItem, existing) {
  return newItem.from <= existing.from && newItem.to >= existing.to
}
