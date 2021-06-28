class Interval {
  constructor (from, to, data) {
    if (typeof from !== 'number' || typeof to !== 'number') {
      throw new Error('from and to must be a number')
    }

    this.from = from
    this.to = to
    this.data = data
  }

  get from () {
    return this.from
  }

  get to () {
    return this.to
  }

  get priority () {
    return this.data
  }

  setFrom (from) {
    if (typeof from !== 'number') throw new Error('from must be a number')
    if (from > this.to) throw new Error('from must be lower than to')
    this.from = from
  }

  setTo (to) {
    if (typeof to !== 'number') throw new Error('to must be a number')
    if (this.from > to) throw new Error('from must be lower than to')
    this.to = to
  }
}

module.exports = Interval
