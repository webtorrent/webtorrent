const { IntervalTree } = require('node-interval-tree')
const Interval = require('./interval')

class NonOverlappingIntervalList {
  constructor (opts = {}) {
    if (opts.equals && typeof opts.equals !== 'function') throw new Error('equals must be a function')

    this._list = []
    this._equals = equals || this._defaultEquals
  }

  /**
  * "from" and "to" are both inclusive
  */
  add (from, to, data = null) {
    if (typeof from !== 'number' || typeof to !== 'number') throw new Error('from and to must be numbers')
    if (from > to) throw new Error('from must be smaller or equal than to')

    const currentInsertion = new IntervalTree()
    currentInsertion.insert({ low: from, high: to })

    // Check if there are conflicting intervals
    let overlappingIntervals
    while (true) {
      overlappingIntervals = this._findOverlappingInterval(from, to)
      if (overlappingIntervals.length === 0) break

      const conflictingIntervals = overlappingIntervals.filter(i => {
        return !this._equals(i.data, data)
      })
      if (conflictingIntervals.length === 0) break

      const firstConflictingInterval = conflictingIntervals[0]

      // Get overlappig zone
      const [overlappingFrom, overlappingTo] = this._getOverlappingZone(firstConflictingInterval, from, to)

      const newIntervals = this._calculateNewIntervals(firstConflictingInterval, overlappingFrom, overlappingTo, data)
      this._findAndReplace(firstConflictingInterval, newIntervals)

      // Try to merge neighbouring intervals
      this._tryMerge(this._list.indexOf(newIntervals[0]))
      if (newIntervals.length > 1) {
        this._tryMerge(this._list.indexOf(newIntervals[newIntervals.length - 1]))
      }
    }

    // Remove overlappings from current insertion
    for (const interval of overlappingIntervals) {
      const [overlappingFrom, overlappingTo] = this._getOverlappingZone(interval, from, to)
      currentInsertion.remove({ low: overlappingFrom, high: overlappingTo })
    }

    // Check if there are more insertions
    if (currentInsertion.size() > 0) {
      for (const key of currentInsertion.keys()) {
        this._insertToList(key.low, key.high, data)
      }
    }
  }

  remove (from, to) {
    if (typeof from !== 'number' || typeof to !== 'number') throw new Error('from and to must be numbers')
    if (from > to) throw new Error('from must be smaller or equal than to')

    // Find overlapping intervals
    const intervals = this._findOverlappingInterval(from, to)

    for (const interval of intervals) {
      // Check if whole interval is out
      if (from <= interval && interval.to <= to) {
        const intervalIndex = this._list.indexOf(interval)
        this._list.splice(intervalIndex, 1)
        continue
      }

      // Partial interval out: just resize the interval
      const [overlappingFrom, overlappingTo] = this._getOverlappingZone(interval, from, to)
      if (overlappingFrom > interval.from) {
        interval.from = overlappingFrom
      }
      if (overlappingTo < interval.to) {
        interval.to = overlappingTo
      }
    }
  }

  getList () {
    return this._list
  }

  size () {
    return this._list.length
  }

  _defaultEquals (a, b) {
    return a === b
  }

  _insertToList (from, to, data = null) {
    if (this._list.length === 0) {
      this._list.push(new Interval(from to, data))
      return
    }

    let leftIndex = 0
    let leftInterval = this._list[leftIndex]
    let rightIndex = this._list.length - 1
    let rightInterval = this._list[rightIndex]

    let foundIndex = null
    let foundInterval = null

    if (from < leftInterval.from) {
      // Add it to the left
      foundIndex = leftIndex
    } else if (rightInterval.to < from) {
      // Add it to the right
      foundIndex = rightIndex + 1
    }

    while (foundIndex !== null && foundInterval !== null) {
      if (leftInterval.from <= from && from <= leftInterval.to) {
        // Add it to left interval
        foundInterval = leftInterval
        break
      } else if (rightInterval.from <= from && from <= rightInterval.to) {
        // Add it to right interval
        foundInterval = rightInterval
        break
      } else {
        if ((rightIndex - leftIndex) === 1) {
          // Add it between left and right
          foundIndex = rightIndex
          break
        }

        // Calculate new indices
        const middleIndex = Math.floor((rightIndex - leftIndex) / 2)
        const middleInterval = this._list[middleIndex]

        if (middleInterval.to < from) {
          leftIndex = middleIndex
          leftInterval = middleInterval
        } else if (from < middleInterval.from) {
          rightIndex = middleIndex
          rightInterval = middleInterval
        } else {
          // Add it in the middle interval
          foundInterval = middleInterval
          break
        }
      }
    }

    if (foundInterval) {
      // Split found interval
      const newIntervals = this._calculateNewIntervals(foundInterval, from, to, data)
      this._findAndReplace(foundInterval, newIntervals)
    } else if (foundIndex) {
      // Add it there
      const newInterval = new Interval(from, to, data)
      this._list.splice(foundIndex, 0, newInterval)
    } else {
      // This should never happen
      throw new Error('No index found to insert (this should never happen)')
    }
  }

  _getOverlappingZone (interval, from, to) {
    const overlappingFrom = Math.max(interval.from, from)
    const overlappingTo = Math.max(interval.to, to)

    return [overlappingFrom, overlappingTo]
  }

  _findOverlappingIntervals (from, to) {
    const res = []

    // Optimize: use binary search?
    for (let i = 0; i < this._list.length; i++) {
      const entry = this._list[i]

      // Check overlapping
      if (from <= entry.to && entry.from <= to) {
        res.push(entry)
      }
    }

    return res
  }

  _calculateNewIntervals (conflictingInterval, from, to, data) {
    if (conflictingInterval.from <= from - 1) {
      const leftNewInterval = new Interval(foundInterval.from, from - 1, foundInterval.data)
      res.push(leftNewInterval)
    }
    const middleNewInterval = new Interval(from, to, data)
    res.push(middleNewInterval)
    if (to + 1 <= conflictingInterval.to) {
      const rightNewInterval = new Interval(to + 1, conflictingInterval.to, foundInterval.data)
      res.push(rightNewInterval)
    }
    return res
  }

  _findAndReplace (interval, newIntervals) {
    const index = this._list.indexOf(interval)
    if (index === -1) return

    // Remove previous
    this._list.splice(index, 1)

    // Add list of intervals
    for (let i = 0; i < newIntervals.length; i++) {
      const newInterval = newIntervals[i]
      this._list.splice(index + i, 0, newInterval)
    }
  }

  _tryMerge (index) {
    const interval = this._list[index]
    if (!interval) return

    // Check left side
    const leftInterval = this._list[index - 1]
    if (leftInterval && ((interval.from - leftInterval.to) <= 1)
        && this._equals(interval.data, leftInterval.data)) {
      const newInterval = new Interval(leftInterval.from, interval.to, interval.data)
      // Remove and replace
      this._list.splice(index - 1, 2, newInterval)
    }

    // Check right side
    const rightInterval = this._list[index + 1]
    if (rightInterval && ((rightInterval.from - interval.to) <= 1)
        && this._equals(interval.data, rightInterval.data)) {
      const newInterval = new Interval(interval.from, rightInterval.to, interval.data)
      // Remove and replace
      this._list.splice(index, 2, newInterval)
    }
  }
}

module.exports = NonOverlappingIntervalList
