/** Как в настройках сайта: пустая строка — без ошибки (до сохранения). */
export function contactEmailError(email: string): string | null {
  const t = email.trim()
  if (!t) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return 'Некорректный адрес почты.'
  return null
}

/** Чекаут: пустое поле после нажатия «Продолжить». */
export function checkoutEmailFieldError(email: string, submitAttempted: boolean): string | null {
  const t = email.trim()
  if (!t) return submitAttempted ? 'Введите почту.' : null
  return contactEmailError(email)
}
