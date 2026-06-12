const COUNTRY_PREFIX = '+7'
const NATIONAL_LENGTH = 10

function toNationalDigits(raw) {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('8') || digits.startsWith('7')) digits = digits.slice(1)
  return digits.slice(0, NATIONAL_LENGTH)
}

function formatPhone(national) {
  if (!national) return ''
  let out = `${COUNTRY_PREFIX} (${national.slice(0, 3)}`
  if (national.length >= 3) out += ')'
  if (national.length > 3) out += ` ${national.slice(3, 6)}`
  if (national.length > 6) out += `-${national.slice(6, 8)}`
  if (national.length > 8) out += `-${national.slice(8, 10)}`
  return out
}

const VALIDATORS = {
  name(el) {
    const v = el.value.trim()
    if (!v) return 'Введите ваше имя'
    if (v.length < 2) return 'Имя должно содержать минимум 2 символа'
    return null
  },
  email(el) {
    const v = el.value.trim()
    if (!v) return 'Введите адрес электронной почты'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Некорректный формат email'
    return null
  },
  company(el) {
    if (el.value.trim().length > 80) return 'Максимум 80 символов'
    return null
  },
  phone(el) {
    if (!el.value) return null
    const national = toNationalDigits(el.value)
    if (national.length > 0 && national.length < NATIONAL_LENGTH) return 'Введите номер полностью'
    return null
  },
  role(el) {
    if (!el.value) return 'Выберите вашу роль'
    return null
  },
  message(el) {
    if (el.value.trim().length > 500) return 'Максимум 500 символов'
    return null
  },
  consent(el) {
    if (!el.checked) return 'Необходимо принять условия'
    return null
  },
}

export default class DemoForm {
  constructor(root = document) {
    this.root = root
    this.form = null
    this.submitted = false
    this.isInitialized = false

    this.onSubmit = this.onSubmit.bind(this)
    this.onBlur = this.onBlur.bind(this)
    this.onInput = this.onInput.bind(this)
    this.onChange = this.onChange.bind(this)
    this.onReset = this.onReset.bind(this)
    this.onPhoneKeyDown = this.onPhoneKeyDown.bind(this)
    this.onPhonePaste = this.onPhonePaste.bind(this)
  }

  init() {
    if (this.isInitialized) return

    this.form = this.root.querySelector('[data-demo-form]')
    if (!this.form) return

    this.form.addEventListener('submit', this.onSubmit)
    this.form.addEventListener('blur', this.onBlur, true)
    this.form.addEventListener('input', this.onInput)
    this.form.addEventListener('change', this.onChange)
    this.form.addEventListener('reset', this.onReset)

    const phone = this.form.querySelector('[data-mask="phone"]')
    if (phone) {
      phone.addEventListener('keydown', this.onPhoneKeyDown)
      phone.addEventListener('paste', this.onPhonePaste)
    }

    this.isInitialized = true
  }

  destroy() {
    if (!this.isInitialized) return

    this.form.removeEventListener('submit', this.onSubmit)
    this.form.removeEventListener('blur', this.onBlur, true)
    this.form.removeEventListener('input', this.onInput)
    this.form.removeEventListener('change', this.onChange)
    this.form.removeEventListener('reset', this.onReset)

    const phone = this.form.querySelector('[data-mask="phone"]')
    if (phone) {
      phone.removeEventListener('keydown', this.onPhoneKeyDown)
      phone.removeEventListener('paste', this.onPhonePaste)
    }

    this.form = null
    this.submitted = false
    this.isInitialized = false
  }

  errorEl(input) {
    const id = input.getAttribute('aria-describedby')
    return id ? this.form.querySelector(`#${id}`) : null
  }

  setError(input, message) {
    input.setAttribute('aria-invalid', 'true')
    const el = this.errorEl(input)
    if (el) {
      el.textContent = message
      el.hidden = false
    }
  }

  clearError(input) {
    input.setAttribute('aria-invalid', 'false')
    const el = this.errorEl(input)
    if (el) {
      el.hidden = true
      el.textContent = ''
    }
  }

  checkField(input) {
    const validator = VALIDATORS[input.name]
    if (!validator) return true
    const error = validator(input)
    if (error) {
      this.setError(input, error)
      return false
    }
    this.clearError(input)
    return true
  }

  validate() {
    let firstInvalid = null
    let ok = true
    for (const el of this.form.elements) {
      if (!el.name) continue
      if (!this.checkField(el)) {
        if (!firstInvalid) firstInvalid = el
        ok = false
      }
    }
    if (firstInvalid) firstInvalid.focus()
    return ok
  }

  onSubmit(event) {
    this.submitted = true
    if (!this.validate()) {
      event.preventDefault()
      event.stopImmediatePropagation()
    }
  }

  onBlur(event) {
    const el = event.target
    if (el.name && this.form.contains(el)) this.checkField(el)
  }

  onInput(event) {
    const el = event.target

    if (el.dataset.mask === 'phone') {
      const national = toNationalDigits(el.value)
      const formatted = formatPhone(national)
      el.value = formatted
      el.setSelectionRange(formatted.length, formatted.length)
    }

    if (this.submitted && el.name) this.checkField(el)
  }

  onChange(event) {
    const el = event.target
    if (this.submitted && el.name) this.checkField(el)
  }

  onReset() {
    this.submitted = false
    for (const el of this.form.elements) {
      if (!el.name) continue
      el.removeAttribute('aria-invalid')
    }
    this.form.querySelectorAll('.demo-modal__error').forEach(el => {
      el.hidden = true
      el.textContent = ''
    })
  }

  onPhoneKeyDown(event) {
    if (event.key !== 'Backspace') return
    const el = event.target
    const national = toNationalDigits(el.value)

    if (!national.length) {
      if (el.value.length) {
        event.preventDefault()
        el.value = ''
        if (this.submitted) this.checkField(el)
      }
      return
    }

    if (/\D$/.test(formatPhone(national))) {
      event.preventDefault()
      el.value = formatPhone(national.slice(0, -1))
      el.setSelectionRange(el.value.length, el.value.length)
      if (this.submitted) this.checkField(el)
    }
  }

  onPhonePaste(event) {
    event.preventDefault()
    const text = event.clipboardData?.getData('text') ?? ''
    const el = event.target
    el.value = formatPhone(toNationalDigits(text))
    el.setSelectionRange(el.value.length, el.value.length)
    if (this.submitted) this.checkField(el)
  }
}
