let lockCount = 0
let savedScrollY = 0
let savedBodyStyle = null

export function lockScroll() {
  lockCount++
  if (lockCount !== 1) return

  savedScrollY = window.scrollY
  const body = document.body
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
  const extraPaddingRight = scrollbarWidth > 0
    ? (parseFloat(window.getComputedStyle(body).paddingRight) || 0) + scrollbarWidth
    : null

  savedBodyStyle = {
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    overflow: body.style.overflow,
    paddingRight: body.style.paddingRight,
  }

  body.style.position = 'fixed'
  body.style.top = `-${savedScrollY}px`
  body.style.left = '0'
  body.style.right = '0'
  body.style.width = '100%'
  body.style.overflow = 'hidden'
  if (extraPaddingRight !== null) {
    body.style.paddingRight = `${extraPaddingRight}px`
  }
}

export function unlockScroll() {
  if (lockCount <= 0) return
  lockCount--
  if (lockCount !== 0) return

  const body = document.body
  if (!savedBodyStyle) return

  body.style.position = savedBodyStyle.position
  body.style.top = savedBodyStyle.top
  body.style.left = savedBodyStyle.left
  body.style.right = savedBodyStyle.right
  body.style.width = savedBodyStyle.width
  body.style.overflow = savedBodyStyle.overflow
  body.style.paddingRight = savedBodyStyle.paddingRight
  savedBodyStyle = null

  const htmlEl = document.documentElement
  const prevScrollBehavior = htmlEl.style.scrollBehavior
  htmlEl.style.scrollBehavior = 'auto'
  window.scrollTo(0, savedScrollY)
  requestAnimationFrame(() => {
    htmlEl.style.scrollBehavior = prevScrollBehavior
  })
}
