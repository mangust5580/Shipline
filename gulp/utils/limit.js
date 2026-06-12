export function createLimit(concurrency = 1) {
  const c = Math.max(1, Number(concurrency) || 1)

  let active = 0
  const queue = []

  const runNext = () => {
    if (active >= c) return
    const item = queue.shift()
    if (!item) return

    active++

    Promise.resolve()
      .then(item.fn)
      .then(v => {
        active--
        item.resolve(v)
        runNext()
      })
      .catch(err => {
        active--
        item.reject(err)
        runNext()
      })
  }

  return function limit(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject })
      runNext()
    })
  }
}
