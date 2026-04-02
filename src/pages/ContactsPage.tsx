export function ContactsPage() {
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight text-white">Контакты</h1>
      <p className="mt-2 text-gray-400">Заполните реквизиты под ваш бизнес.</p>
      <dl className="mt-8 space-y-4 text-sm text-gray-200">
        <div>
          <dt className="font-medium text-gray-500">Email</dt>
          <dd className="mt-1">hello@example.com</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">Телефон</dt>
          <dd className="mt-1">+7 (000) 000-00-00</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">Адрес</dt>
          <dd className="mt-1">Город, улица</dd>
        </div>
      </dl>
    </div>
  )
}
