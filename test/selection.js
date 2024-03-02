import { Selection, isCoveringExisting, isInsideExisting, isLowerIntersecting, isUpperIntersecting } from '../lib/selection.js'
import test from 'tape'

const testCases = {
  isLowerIntersecting: {
    fn: isLowerIntersecting,
    cases: [
      { newItem: { from: 8, to: 12 }, existing: { from: 1, to: 10 }, expectedRemoveResult: [{ from: 1, to: 7 }] },
      { newItem: { from: 10, to: 15 }, existing: { from: 1, to: 10 }, expectedRemoveResult: [{ from: 1, to: 9 }] }
    ]
  },
  isUpperIntersecting: {
    fn: isUpperIntersecting,
    cases: [
      { newItem: { from: 15, to: 22 }, existing: { from: 20, to: 25 }, expectedRemoveResult: [{ from: 23, to: 25 }] },
      { newItem: { from: 15, to: 20 }, existing: { from: 20, to: 25 }, expectedRemoveResult: [{ from: 21, to: 25 }] }
    ]
  },
  isInsideExisting: {
    fn: isInsideExisting,
    cases: [
      { newItem: { from: 12, to: 15 }, existing: { from: 10, to: 20 }, expectedRemoveResult: [{ from: 10, to: 11 }, { from: 16, to: 20 }] },
      { newItem: { from: 20, to: 20 }, existing: { from: 10, to: 20 }, expectedRemoveResult: [{ from: 10, to: 19 }] },
      { newItem: { from: 15, to: 20 }, existing: { from: 10, to: 20 }, expectedRemoveResult: [{ from: 10, to: 14 }] }
    ]
  },
  isCoveringExisting: {
    fn: isCoveringExisting,
    cases: [
      { newItem: { from: 10, to: 21 }, existing: { from: 10, to: 20 }, expectedRemoveResult: [] },
      { newItem: { from: 9, to: 20 }, existing: { from: 10, to: 20 }, expectedRemoveResult: [] },
      { newItem: { from: 10, to: 20 }, existing: { from: 10, to: 20 }, expectedRemoveResult: [] },
      { newItem: { from: 0, to: 986 }, existing: { from: 15, to: 986 }, expectedRemoveResult: [] }
    ]
  }
}

test('Selections', (t) => {
  for (const [functionName, { fn, cases }] of Object.entries(testCases)) {
    for (const { newItem, existing } of cases) {
      t.test(`should return true for newItem: ${s(newItem)} and existing: ${s(existing)} and everything else should be false`, (s) => {
        t.equal(fn(newItem, existing), true)
        for (const otherFn of Object.keys(testCases)) {
          if (otherFn !== functionName) {
            t.equal(testCases[otherFn].fn(newItem, existing), false)
          }
        }
        s.end()
      })
    }
  }

  /** @type {Selection} */
  let selection

  for (const { cases } of Object.values(testCases)) {
    for (const { newItem, existing, expectedRemoveResult } of cases) {
      t.test(`should remove the given item: ${s(newItem)} from existing selection: ${s(existing)} and leave: ${s2(expectedRemoveResult)}`, (s) => {
        selection = new Selection()
        selection.insert(existing)
        selection.remove(newItem)
        assertArrayContentsEqual(t, selection._items, expectedRemoveResult)
        s.end()
      })
    }
  }

  for (const { cases } of Object.values(testCases)) {
    for (const { newItem, existing, expectedRemoveResult } of cases) {
      t.test(`should truncate the existing item: ${s(existing)} to prevent overlapping with the new selection: ${s(newItem)}`, (s) => {
        selection = new Selection()
        selection.insert(existing)
        selection.insert(newItem)
        assertArrayContentsEqual(t, selection._items, [...expectedRemoveResult, newItem])
        s.end()
      })
    }
  }

  t.test('should insert large selection and truncate or delete existing selections', (s) => {
    selection = new Selection()
    selection.insert({ from: 5, to: 10 })
    selection.insert({ from: 11, to: 19 })
    selection.insert({ from: 20, to: 40 })

    selection.insert({ from: 9, to: 25 })

    assertArrayContentsEqual(t, selection._items, [{ from: 5, to: 8 }, { from: 9, to: 25 }, { from: 26, to: 40 }])
    s.end()
  })
})

/**
 *
 * @param {{from: number, to: number}} param0
 * @returns {string}
 */
function s ({ from, to }) {
  return `[${from}-${to}]`
}

/**
 *
 * @param {Array<{from: number, to: number}>} arr
 * @returns {string}
 */
function s2 (arr) {
  return `[${arr.map(s).join(', ')}]`
}

/**
 *
 * @param {import('tape').Test} t
 * @param {Array<Selection>} actual
 * @param {Array<Selection>} expected
 */
function assertArrayContentsEqual (t, actual, expected) {
  t.equal(actual.length, expected.length)
  // assert that both have the same items regardless of order
  for (const item of actual) {
    t.ok(expected.some(e => e.from === item.from && e.to === item.to))
  }
}
