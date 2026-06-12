const SELECTORS = {
  header: '[data-header]',
  navLink: '[data-nav-link]',
}

const ATTRIBUTES = {
  ariaCurrent: 'aria-current',
}

const CLASSES = {
  active: 'text-text-brand',
  inactive: 'text-text-secondary',
}

export default class ActiveNav {
  constructor(root = document) {
    this.root = root
    this.window = (root?.ownerDocument ?? document).defaultView ?? window
    this.header = null
    this.links = []
    this.sections = []
    this.ticking = false
    this.isInitialized = false
    this.onScroll = this.onScroll.bind(this)
    this.onFrame = this.onFrame.bind(this)
    this.onResize = this.onResize.bind(this)
    this.onClick = this.onClick.bind(this)
  }

  init() {
    if (this.isInitialized) return

    this.header = this.root.querySelector(SELECTORS.header)
    this.links = Array.from(this.root.querySelectorAll(SELECTORS.navLink))
    if (!this.links.length) return

    const seen = new Set()
    this.sections = this.links.reduce((acc, link) => {
      const id = link.getAttribute('href').split('#')[1]
      if (id && !seen.has(id)) {
        const section = this.root.getElementById(id)
        if (section) {
          seen.add(id)
          acc.push(section)
        }
      }
      return acc
    }, [])

    if (!this.sections.length) return

    this.window.addEventListener('scroll', this.onScroll, { passive: true })
    this.window.addEventListener('resize', this.onResize, { passive: true })
    for (const link of this.links) {
      link.addEventListener('click', this.onClick)
    }

    this.update()
    this.isInitialized = true
  }

  destroy() {
    if (!this.isInitialized) return

    this.window.removeEventListener('scroll', this.onScroll)
    this.window.removeEventListener('resize', this.onResize)
    for (const link of this.links) {
      link.removeEventListener('click', this.onClick)
    }

    this.ticking = false
    this.header = null
    this.links = []
    this.sections = []
    this.isInitialized = false
  }

  update() {
    const headerHeight = this.header ? this.header.offsetHeight : 0
    const viewportPoint = headerHeight + (this.window.innerHeight - headerHeight) * 0.35

    let activeId = null
    let closestAboveId = null
    let closestAboveBottom = -Infinity

    for (const section of this.sections) {
      const rect = section.getBoundingClientRect()

      if (viewportPoint >= rect.top && viewportPoint <= rect.bottom) {
        activeId = section.id
        break
      }

      if (rect.bottom <= viewportPoint && rect.bottom > closestAboveBottom) {
        closestAboveBottom = rect.bottom
        closestAboveId = section.id
      }
    }

    if (!activeId) {
      activeId = closestAboveId
    }

    this.setActive(activeId)
  }

  setActive(activeId) {
    for (const link of this.links) {
      const id = link.getAttribute('href').split('#')[1]
      const isActive = id === activeId

      link.classList.toggle(CLASSES.active, isActive)
      link.classList.toggle(CLASSES.inactive, !isActive)

      if (isActive) {
        link.setAttribute(ATTRIBUTES.ariaCurrent, 'location')
      } else {
        link.removeAttribute(ATTRIBUTES.ariaCurrent)
      }
    }
  }

  onClick(event) {
    const link = event.currentTarget
    const id = link.getAttribute('href').split('#')[1]
    if (id) this.setActive(id)
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

  onResize() {
    if (this.ticking) return
    this.ticking = true
    this.window.requestAnimationFrame(this.onFrame)
  }
}
