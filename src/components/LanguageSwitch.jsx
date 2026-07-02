import { useTranslation } from 'react-i18next'

export default function LanguageSwitch({ className }) {
  const { i18n } = useTranslation()
  const next = i18n.language === 'ar' ? 'en' : 'ar'

  return (
    <button
      onClick={() => i18n.changeLanguage(next)}
      className={`rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 hover:text-white hover:border-white/30 transition-colors ${className || ''}`}
    >
      {next === 'ar' ? 'العربية' : 'EN'}
    </button>
  )
}
