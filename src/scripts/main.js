import MobileMenu from './modules/mobile-menu.js'
import PricingTabs from './modules/pricing-tabs.js'
import FAQAccordion from './modules/faq-accordion.js'
import ScrollHeader from './modules/scroll-header.js'
import ActiveNav from './modules/active-nav.js'
import DemoForm from './modules/demo-form.js'
import DemoModal from './modules/modal.js'

class App {
  constructor(root = document) {
    this.root = root
    this.modules = [
      new MobileMenu(this.root),
      new PricingTabs(this.root),
      new FAQAccordion(this.root),
      new ScrollHeader(this.root),
      new ActiveNav(this.root),
      new DemoForm(this.root),
      new DemoModal(this.root),
    ]
  }

  init() {
    this.modules.forEach(module => module.init())
  }

  destroy() {
    this.modules.forEach(module => module.destroy())
  }
}

const app = new App(document)

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init(), { once: true })
} else {
  app.init()
}
