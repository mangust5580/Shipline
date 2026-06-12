const SELECTORS = {
  header: '[data-scroll-header]',
}

const SCROLL_THRESHOLD = 24

export default class ScrollHeader {
  constructor(root = document) {
    this.root = root
    this.window = (root?.ownerDocument ?? document).defaultView ?? window
    this.header = null
    this.ticking = false
    this.isInitialized = false
    this.onScroll = this.onScroll.bind(this)
    this.onFrame = this.onFrame.bind(this)
  }

  init() {
    if (this.isInitialized) return

    this.header = this.root.querySelector(SELECTORS.header)
    if (!this.header) return

    this.window.addEventListener('scroll', this.onScroll, { passive: true })
    this.update()
    this.isInitialized = true
  }

  destroy() {
    if (!this.isInitialized) return

    this.window.removeEventListener('scroll', this.onScroll)
    this.ticking = false
    this.header = null
    this.isInitialized = false
  }

  update() {
    if (!this.header) return
    this.header.toggleAttribute('data-scrolled', this.window.scrollY > SCROLL_THRESHOLD)
  }

  onScroll() {
    if (this.ticking) return
    this.ticking = true
    this.window.requestAnimationFrame(this.onFrame)
  }

  onFrame() {
    this.update()
    this.ticking = false
  }
}
