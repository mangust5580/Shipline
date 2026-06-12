const SELECTORS = {
  container: '[data-pricing-tabs]',
  tab: '[data-pricing-tab]',
  panel: '[data-pricing-panel]',
}

const ATTRIBUTES = {
  ariaSelected: 'aria-selected',
  ariaControls: 'aria-controls',
  tabindex: 'tabindex',
  hidden: 'hidden',
}

const KEYS = {
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  Home: 'Home',
  End: 'End',
}

class PricingTabsInstance {
  constructor(container) {
    this.container = container
    this.tabs = Array.from(container.querySelectorAll(SELECTORS.tab))
    this.panels = Array.from(container.querySelectorAll(SELECTORS.panel))
    this._clickHandlers = new Map()
    this._onKeyDown = this._onKeyDown.bind(this)
  }

  init() {
    if (!this.tabs.length || !this.panels.length) return

    this.tabs.forEach(tab => {
      const handler = () => this._activateTab(tab)
      this._clickHandlers.set(tab, handler)
      tab.addEventListener('click', handler)
    })

    this.container.addEventListener('keydown', this._onKeyDown)
  }

  destroy() {
    this.tabs.forEach(tab => {
      const handler = this._clickHandlers.get(tab)
      if (handler) tab.removeEventListener('click', handler)
    })
    this._clickHandlers.clear()
    this.container.removeEventListener('keydown', this._onKeyDown)
  }

  _activateTab(targetTab) {
    this.tabs.forEach(tab => {
      const isActive = tab === targetTab
      tab.setAttribute(ATTRIBUTES.ariaSelected, String(isActive))
      tab.setAttribute(ATTRIBUTES.tabindex, isActive ? '0' : '-1')
    })

    const targetPanelId = targetTab.getAttribute(ATTRIBUTES.ariaControls)
    this.panels.forEach(panel => {
      if (panel.id === targetPanelId) {
        panel.removeAttribute(ATTRIBUTES.hidden)
      } else {
        panel.setAttribute(ATTRIBUTES.hidden, '')
      }
    })

    targetTab.focus()
  }

  _onKeyDown(event) {
    if (!this.tabs.includes(event.target)) return

    const currentIndex = this.tabs.indexOf(event.target)
    let nextIndex = -1

    switch (event.key) {
      case KEYS.ArrowRight:
        nextIndex = (currentIndex + 1) % this.tabs.length
        break
      case KEYS.ArrowLeft:
        nextIndex = (currentIndex - 1 + this.tabs.length) % this.tabs.length
        break
      case KEYS.Home:
        nextIndex = 0
        break
      case KEYS.End:
        nextIndex = this.tabs.length - 1
        break
      default:
        return
    }

    event.preventDefault()
    this._activateTab(this.tabs[nextIndex])
  }
}

export default class PricingTabs {
  constructor(root = document) {
    this.root = root
    this.instances = []
    this.isInitialized = false
  }

  init() {
    if (this.isInitialized) return

    const containers = Array.from(this.root.querySelectorAll(SELECTORS.container))
    this.instances = containers.map(container => {
      const instance = new PricingTabsInstance(container)
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
