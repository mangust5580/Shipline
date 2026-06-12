import { loadUserConfig } from '#gulp/utils/load-user-config.js'
const baseI18n = {
  locales: ['ru', 'en'],
  defaultLocale: 'ru',
  urlStrategy: 'prefix',
  dictionaries: {
    dir: 'src/data/locales',
    ext: 'json',
  },
  strictMissingKeys: true,
}

export const i18n = await loadUserConfig(baseI18n, 'i18n')
