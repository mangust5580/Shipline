import { lockScroll, unlockScroll } from './scroll-lock.js'

const SELECTORS = {
  root: '[data-header]',
  toggle: '[data-header-toggle]',
  menu: '[data-header-menu]',
  link: '[data-header-link]',
  focusable: 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
}

const ATTRIBUTES = {
  ariaExpanded: 'aria-expanded',
  ariaLabel: 'aria-label',
  hidden: 'hidden',
}

const LABELS = {
  open: 'Открыть меню',
  close: 'Закрыть меню',
}

const KEYS = {
  Escape: 'Escape',
  Tab: 'Tab',
}

const STATES = {
  closed: 'closed',
  closing: 'closing',
  open: 'open',
  opening: 'opening',
}

const DESKTOP_QUERY = '(min-width: 1024px)'
const TRANSITION_FALLBACK_MS = 350

function focusSafe(el) {
  try { el.focus({ preventScroll: true }) } catch { el.focus() }
}

export default class MobileMenu {
  constructor(root = document) {
    this.root = root
    this.document = root?.ownerDocument ?? document
    this.window = this.document.defaultView ?? window
    this.header = null
    this.toggleButton = null
    this.menu = null
    this.links = []
    this.mediaQueryList = null
    this.isInitialized = false
    this.isScrollLocked = false
    this.closeTimer = null
    this.onToggleClick = this.onToggleClick.bind(this)
    this.onDocumentKeyDown = this.onDocumentKeyDown.bind(this)
    this.onLinkClick = this.onLinkClick.bind(this)
    this.onViewportChange = this.onViewportChange.bind(this)
    this.onMenuTransitionEnd = this.onMenuTransitionEnd.bind(this)
  }

  init() {
    if (this.isInitialized) return

    this.header = this.root.querySelector(SELECTORS.root)
    if (!this.header) return

    this.toggleButton = this.header.querySelector(SELECTORS.toggle)
    this.menu = this.header.querySelector(SELECTORS.menu)
    if (!this.toggleButton || !this.menu) return

    this.links = Array.from(this.menu.querySelectorAll(SELECTORS.link))

    this.toggleButton.addEventListener('click', this.onToggleClick)
    this.menu.addEventListener('transitionend', this.onMenuTransitionEnd)
    this.links.forEach(link => link.addEventListener('click', this.onLinkClick))
    this.document.addEventListener('keydown', this.onDocumentKeyDown)

    this.mediaQueryList = this.window.matchMedia(DESKTOP_QUERY)
    if (typeof this.mediaQueryList.addEventListener === 'function') {
      this.mediaQueryList.addEventListener('change', this.onViewportChange)
    } else if (typeof this.mediaQueryList.addListener === 'function') {
      this.mediaQueryList.addListener(this.onViewportChange)
    }

    this.close({ restoreFocus: false, immediate: true })
    this.isInitialized = true
  }

  destroy() {
    if (!this.isInitialized) return

    this.clearCloseTimer()
    this.toggleButton?.removeEventListener('click', this.onToggleClick)
    this.menu?.removeEventListener('transitionend', this.onMenuTransitionEnd)
    this.links.forEach(link => link.removeEventListener('click', this.onLinkClick))
    this.document.removeEventListener('keydown', this.onDocumentKeyDown)

    if (this.mediaQueryList) {
      if (typeof this.mediaQueryList.removeEventListener === 'function') {
        this.mediaQueryList.removeEventListener('change', this.onViewportChange)
      } else if (typeof this.mediaQueryList.removeListener === 'function') {
        this.mediaQueryList.removeListener(this.onViewportChange)
      }
    }

    this._unlockIfLocked()
    this.header = null
    this.toggleButton = null
    this.menu = null
    this.links = []
    this.mediaQueryList = null
    this.isInitialized = false
  }

  toggle() {
    if (this.isOpen()) {
      this.close({ restoreFocus: true })
      return
    }

    this.open()
  }

  open() {
    if (!this.menu || !this.toggleButton || this.isDesktop()) return

    this.clearCloseTimer()
    this.menu.removeAttribute(ATTRIBUTES.hidden)
    this.setState(STATES.opening)
    this.toggleButton.setAttribute(ATTRIBUTES.ariaExpanded, 'true')
    this.toggleButton.setAttribute(ATTRIBUTES.ariaLabel, LABELS.close)

    if (!this.isScrollLocked) {
      lockScroll()
      this.isScrollLocked = true
    }

    this.window.requestAnimationFrame(() => {
      if (!this.menu || this.getState() !== STATES.opening) return
      this.setState(STATES.open)
      const focusable = this.getFocusableElements()
      if (focusable.length > 0) focusSafe(focusable[0])
    })
  }

  close({ restoreFocus = false, immediate = false } = {}) {
    if (!this.menu || !this.toggleButton) return

    this.toggleButton.setAttribute(ATTRIBUTES.ariaExpanded, 'false')
    this.toggleButton.setAttribute(ATTRIBUTES.ariaLabel, LABELS.open)

    if (immediate || this.getState() === STATES.closed) {
      this.finishClose()
      if (restoreFocus) focusSafe(this.toggleButton)
      return
    }

    this.setState(STATES.closing)
    this.clearCloseTimer()
    this.closeTimer = this.window.setTimeout(() => {
      this.finishClose()
      if (restoreFocus) this.toggleButton && focusSafe(this.toggleButton)
    }, TRANSITION_FALLBACK_MS)
  }

  finishClose() {
    if (!this.menu) return

    this.clearCloseTimer()
    this._unlockIfLocked()
    this.setState(STATES.closed)
    this.menu.setAttribute(ATTRIBUTES.hidden, '')
  }

  isOpen() {
    const state = this.getState()
    return state === STATES.open || state === STATES.opening
  }

  isDesktop() {
    return Boolean(this.mediaQueryList?.matches)
  }

  getState() {
    return this.menu?.dataset.state ?? STATES.closed
  }

  setState(state) {
    if (!this.menu) return
    this.menu.dataset.state = state
  }

  clearCloseTimer() {
    if (!this.closeTimer) return

    this.window.clearTimeout(this.closeTimer)
    this.closeTimer = null
  }

  _unlockIfLocked() {
    if (!this.isScrollLocked) return
    this.isScrollLocked = false
    unlockScroll()
  }

  onToggleClick() {
    this.toggle()
  }

  onLinkClick() {
    this.close({ restoreFocus: false })
  }

  getFocusableElements() {
    if (!this.menu) return []
    return Array.from(this.menu.querySelectorAll(SELECTORS.focusable))
  }

  handleTabTrap(event) {
    const focusable = this.getFocusableElements()
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = this.document.activeElement

    if (event.shiftKey) {
      if (active === first || !this.menu.contains(active)) {
        event.preventDefault()
        last.focus()
      }
    } else {
      if (active === last || !this.menu.contains(active)) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  onDocumentKeyDown(event) {
    if (!this.isOpen()) return

    if (event.key === KEYS.Escape) {
      event.preventDefault()
      this.close({ restoreFocus: true })
      return
    }

    if (event.key === KEYS.Tab) {
      this.handleTabTrap(event)
    }
  }

  onViewportChange() {
    if (this.isDesktop()) {
      this.close({ restoreFocus: false, immediate: true })
    }
  }

  onMenuTransitionEnd(event) {
    if (event.target !== this.menu || this.getState() !== STATES.closing) return
    this.finishClose()
  }
}
