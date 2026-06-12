const SELECTORS = {
  container: '[data-faq-accordion]',
  item: '[data-faq-item]',
  trigger: '[data-faq-trigger]',
  panel: '[data-faq-panel]',
}

const ATTRIBUTES = {
  ariaExpanded: 'aria-expanded',
  ariaControls: 'aria-controls',
  hidden: 'hidden',
}

const KEYS = {
  ArrowDown: 'ArrowDown',
  ArrowUp: 'ArrowUp',
  Home: 'Home',
  End: 'End',
}

const STATES = {
  closed: 'closed',
  opening: 'opening',
  open: 'open',
  closing: 'closing',
}

// Must match height transition duration in components.css
const TRANSITION_MS = 280

class FAQAccordionInstance {
  constructor(container) {
    this.container = container
    this.triggers = Array.from(container.querySelectorAll(SELECTORS.trigger))
    this._clickHandlers = new Map()
    this._transitionHandlers = new Map()
    this._fallbackTimers = new Map()
    this._onKeyDown = this._onKeyDown.bind(this)
  }

  init() {
    if (!this.triggers.length) return

    this.triggers.forEach(trigger => {
      const panel = this._getPanel(trigger)
      if (panel) panel.dataset.state = STATES.closed

      const handler = () => this._onTriggerClick(trigger)
      this._clickHandlers.set(trigger, handler)
      trigger.addEventListener('click', handler)
    })

    this.container.addEventListener('keydown', this._onKeyDown)
  }

  destroy() {
    this.triggers.forEach(trigger => {
      const handler = this._clickHandlers.get(trigger)
      if (handler) trigger.removeEventListener('click', handler)
    })
    this._clickHandlers.clear()

    this._transitionHandlers.forEach((handler, panel) => {
      panel.removeEventListener('transitionend', handler)
    })
    this._transitionHandlers.clear()

    this._fallbackTimers.forEach(timerId => clearTimeout(timerId))
    this._fallbackTimers.clear()

    this.container.removeEventListener('keydown', this._onKeyDown)
  }

  _getPanel(trigger) {
    const panelId = trigger.getAttribute(ATTRIBUTES.ariaControls)
    if (!panelId) return null
    return this.container.querySelector(`#${panelId}`)
  }

  _prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  _cancelTransition(panel) {
    const handler = this._transitionHandlers.get(panel)
    if (handler) {
      panel.removeEventListener('transitionend', handler)
      this._transitionHandlers.delete(panel)
    }

    const timerId = this._fallbackTimers.get(panel)
    if (timerId !== undefined) {
      clearTimeout(timerId)
      this._fallbackTimers.delete(panel)
    }
  }

  _onTriggerClick(trigger) {
    const isExpanded = trigger.getAttribute(ATTRIBUTES.ariaExpanded) === 'true'

    if (!isExpanded) {
      this.triggers.forEach(t => {
        if (t !== trigger) this._closeItem(t)
      })
      this._openItem(trigger)
    } else {
      this._closeItem(trigger)
    }
  }

  _openItem(trigger) {
    const panel = this._getPanel(trigger)
    if (!panel) return

    trigger.setAttribute(ATTRIBUTES.ariaExpanded, 'true')

    if (this._prefersReducedMotion()) {
      this._cancelTransition(panel)
      panel.removeAttribute(ATTRIBUTES.hidden)
      panel.style.height = ''
      panel.dataset.state = STATES.open
      return
    }

    this._cancelTransition(panel)

    // Show panel at height 0 before animating
    panel.removeAttribute(ATTRIBUTES.hidden)
    panel.style.height = '0'

    // Force reflow so the browser registers the starting state before animating
    void panel.offsetHeight

    panel.dataset.state = STATES.opening
    panel.style.height = `${panel.scrollHeight}px`

    const finishOpen = () => {
      if (panel.dataset.state !== STATES.opening) return
      this._transitionHandlers.delete(panel)
      this._fallbackTimers.delete(panel)
      panel.style.height = ''
      panel.dataset.state = STATES.open
    }

    const onTransitionEnd = (event) => {
      if (event.target !== panel || event.propertyName !== 'height') return
      panel.removeEventListener('transitionend', onTransitionEnd)
      finishOpen()
    }

    panel.addEventListener('transitionend', onTransitionEnd)
    this._transitionHandlers.set(panel, onTransitionEnd)

    this._fallbackTimers.set(panel, setTimeout(finishOpen, TRANSITION_MS + 50))
  }

  _closeItem(trigger) {
    const panel = this._getPanel(trigger)
    if (!panel) return

    trigger.setAttribute(ATTRIBUTES.ariaExpanded, 'false')

    if (this._prefersReducedMotion()) {
      this._cancelTransition(panel)
      panel.setAttribute(ATTRIBUTES.hidden, '')
      panel.style.height = ''
      panel.dataset.state = STATES.closed
      return
    }

    const currentState = panel.dataset.state
    if (currentState === STATES.closed || currentState === STATES.closing) return

    this._cancelTransition(panel)

    // Lock to current visual height so close animates from where the panel actually is
    // (handles case where open was interrupted mid-animation)
    panel.style.height = `${panel.getBoundingClientRect().height}px`

    // Force reflow
    void panel.offsetHeight

    panel.dataset.state = STATES.closing
    panel.style.height = '0'

    const finishClose = () => {
      if (panel.dataset.state !== STATES.closing) return
      this._transitionHandlers.delete(panel)
      this._fallbackTimers.delete(panel)
      panel.style.height = ''
      panel.setAttribute(ATTRIBUTES.hidden, '')
      panel.dataset.state = STATES.closed
    }

    const onTransitionEnd = (event) => {
      if (event.target !== panel || event.propertyName !== 'height') return
      panel.removeEventListener('transitionend', onTransitionEnd)
      finishClose()
    }

    panel.addEventListener('transitionend', onTransitionEnd)
    this._transitionHandlers.set(panel, onTransitionEnd)

    this._fallbackTimers.set(panel, setTimeout(finishClose, TRANSITION_MS + 50))
  }

  _onKeyDown(event) {
    if (!this.triggers.includes(event.target)) return

    const currentIndex = this.triggers.indexOf(event.target)
    let nextIndex = -1

    switch (event.key) {
      case KEYS.ArrowDown:
        nextIndex = (currentIndex + 1) % this.triggers.length
        break
      case KEYS.ArrowUp:
        nextIndex = (currentIndex - 1 + this.triggers.length) % this.triggers.length
        break
      case KEYS.Home:
        nextIndex = 0
        break
      case KEYS.End:
        nextIndex = this.triggers.length - 1
        break
      default:
        return
    }

    event.preventDefault()
    this.triggers[nextIndex].focus()
  }
}

export default class FAQAccordion {
  constructor(root = document) {
    this.root = root
    this.instances = []
    this.isInitialized = false
  }

  init() {
    if (this.isInitialized) return

    const containers = Array.from(this.root.querySelectorAll(SELECTORS.container))
    this.instances = containers.map(container => {
      const instance = new FAQAccordionInstance(container)
      instance.init()
      return instance
    })

    this.isInitialized = true
  }

  destroy() {
    if (!this.isInitialized) return

    this.instances.forEach(instance => instance.destroy())
    this.instances = []
    this.isInitialized = false
  }
}
