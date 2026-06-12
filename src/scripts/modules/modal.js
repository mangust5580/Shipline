import { lockScroll, unlockScroll } from './scroll-lock.js'

const SELECTORS = {
  trigger: '[data-demo-trigger]',
  modal: '[data-demo-modal]',
  backdrop: '[data-demo-backdrop]',
  panel: '[data-demo-panel]',
  close: '[data-demo-close]',
  form: '[data-demo-form]',
  formView: '[data-demo-form-view]',
  success: '[data-demo-success]',
  focusable:
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
}

const KEYS = { Escape: 'Escape', Tab: 'Tab' }

const STATES = {
  closed: 'closed',
  closing: 'closing',
  open: 'open',
  opening: 'opening',
}

const TRANSITION_FALLBACK_MS = 350

function focusSafe(el) {
  try { el.focus({ preventScroll: true }) } catch { el.focus() }
}

export default class DemoModal {
  constructor(root = document) {
    this.root = root
    this.document = root?.ownerDocument ?? document
    this.window = this.document.defaultView ?? window
    this.modal = null
    this.backdrop = null
    this.panel = null
    this.formView = null
    this.successView = null
    this.form = null
    this.closeButtons = []
    this.triggers = []
    this.lastTrigger = null
    this.isInitialized = false
    this.isScrollLocked = false
    this.closeTimer = null

    this.onTriggerClick = this.onTriggerClick.bind(this)
    this.onCloseClick = this.onCloseClick.bind(this)
    this.onBackdropClick = this.onBackdropClick.bind(this)
    this.onDocumentKeyDown = this.onDocumentKeyDown.bind(this)
    this.onFormSubmit = this.onFormSubmit.bind(this)
    this.onPanelTransitionEnd = this.onPanelTransitionEnd.bind(this)
  }

  init() {
    if (this.isInitialized) return

    this.modal = this.root.querySelector(SELECTORS.modal)
    if (!this.modal) return

    this.backdrop = this.modal.querySelector(SELECTORS.backdrop)
    this.panel = this.modal.querySelector(SELECTORS.panel)
    this.formView = this.modal.querySelector(SELECTORS.formView)
    this.successView = this.modal.querySelector(SELECTORS.success)
    this.form = this.modal.querySelector(SELECTORS.form)
    this.closeButtons = Array.from(this.modal.querySelectorAll(SELECTORS.close))
    this.triggers = Array.from(this.root.querySelectorAll(SELECTORS.trigger))

    this.triggers.forEach(t => t.addEventListener('click', this.onTriggerClick))
    this.closeButtons.forEach(btn => btn.addEventListener('click', this.onCloseClick))
    if (this.backdrop) this.backdrop.addEventListener('click', this.onBackdropClick)
    if (this.form) this.form.addEventListener('submit', this.onFormSubmit)
    if (this.panel) this.panel.addEventListener('transitionend', this.onPanelTransitionEnd)
    this.document.addEventListener('keydown', this.onDocumentKeyDown)

    this.isInitialized = true
  }

  destroy() {
    if (!this.isInitialized) return

    this.clearCloseTimer()
    this.triggers.forEach(t => t.removeEventListener('click', this.onTriggerClick))
    this.closeButtons.forEach(btn => btn.removeEventListener('click', this.onCloseClick))
    if (this.backdrop) this.backdrop.removeEventListener('click', this.onBackdropClick)
    if (this.form) this.form.removeEventListener('submit', this.onFormSubmit)
    if (this.panel) this.panel.removeEventListener('transitionend', this.onPanelTransitionEnd)
    this.document.removeEventListener('keydown', this.onDocumentKeyDown)

    this._unlockIfLocked()

    this.modal = null
    this.backdrop = null
    this.panel = null
    this.formView = null
    this.successView = null
    this.form = null
    this.closeButtons = []
    this.triggers = []
    this.lastTrigger = null
    this.isInitialized = false
  }

  open(trigger = null) {
    if (!this.modal) return

    this.lastTrigger = trigger
    this.clearCloseTimer()
    this.showFormView()

    this.modal.removeAttribute('hidden')
    this.setState(STATES.opening)

    if (!this.isScrollLocked) {
      lockScroll()
      this.isScrollLocked = true
    }

    this.window.requestAnimationFrame(() => {
      if (!this.modal || this.getState() !== STATES.opening) return
      this.setState(STATES.open)
      const focusable = this.getFocusableElements()
      if (focusable.length > 0) focusSafe(focusable[0])
    })
  }

  close() {
    if (!this.modal) return

    const state = this.getState()
    if (state === STATES.closed || state === STATES.closing) return

    this.setState(STATES.closing)

    this.clearCloseTimer()
    this.closeTimer = this.window.setTimeout(() => {
      this.finishClose()
    }, TRANSITION_FALLBACK_MS)
  }

  finishClose() {
    if (!this.modal) return

    this.clearCloseTimer()
    this._unlockIfLocked()
    this.setState(STATES.closed)
    this.modal.setAttribute('hidden', '')

    if (this.lastTrigger) {
      focusSafe(this.lastTrigger)
      this.lastTrigger = null
    }
  }

  showFormView() {
    if (this.formView) this.formView.removeAttribute('hidden')
    if (this.successView) this.successView.setAttribute('hidden', '')
    if (this.form) this.form.reset()
  }

  showSuccessView() {
    if (this.formView) this.formView.setAttribute('hidden', '')
    if (this.successView) {
      this.successView.removeAttribute('hidden')
      const closeBtn = this.successView.querySelector(SELECTORS.close)
      if (closeBtn) focusSafe(closeBtn)
    }
  }

  getState() {
    return this.modal?.dataset.state ?? STATES.closed
  }

  setState(state) {
    if (!this.modal) return
    this.modal.dataset.state = state
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

  getFocusableElements() {
    if (!this.panel) return []
    return Array.from(this.panel.querySelectorAll(SELECTORS.focusable)).filter(
      el => !el.closest('[hidden]')
    )
  }

  handleTabTrap(event) {
    const focusable = this.getFocusableElements()
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = this.document.activeElement

    if (event.shiftKey) {
      if (active === first || !this.panel.contains(active)) {
        event.preventDefault()
        last.focus()
      }
    } else {
      if (active === last || !this.panel.contains(active)) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  onTriggerClick(event) {
    this.open(event.currentTarget)
  }

  onCloseClick() {
    this.close()
  }

  onBackdropClick() {
    this.close()
  }

  onDocumentKeyDown(event) {
    const state = this.getState()
    if (state !== STATES.open && state !== STATES.opening) return

    if (event.key === KEYS.Escape) {
      event.preventDefault()
      this.close()
      return
    }

    if (event.key === KEYS.Tab) {
      this.handleTabTrap(event)
    }
  }

  onFormSubmit(event) {
    event.preventDefault()
    this.showSuccessView()
  }

  onPanelTransitionEnd(event) {
    if (!this.modal || event.target !== this.panel) return
    if (this.getState() !== STATES.closing) return
    this.finishClose()
  }
}
