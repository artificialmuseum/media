export const findClosest = (val, arr) =>
  arr.reduce((a, b) => {
    const aDiff = Math.abs(a - val)
    const bDiff = Math.abs(b - val)

    if (aDiff == bDiff) {
      // Choose largest vs smallest (> vs <)
      return a > b ? a : b
    } else {
      return bDiff < aDiff ? b : a
    }
  })
