import { ApiReferenceReact } from '@scalar/api-reference-react'
import '@scalar/api-reference-react/style.css'
import openApiYaml from '../../docs/openapi.yaml?raw'

/** Интерактивная документация OpenAPI (Scalar) — см. `docs/openapi.yaml`. */
export function ApiDocPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#0d1b2a]">
      <div className="shrink-0 border-b border-white/10 px-4 py-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Документация API</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-400">
          Спецификация OpenAPI 3.0: контент витрины, каталог, отзывы, оформление заказа, профиль, заказы
          (личный кабинет и целевой API админ-панели). Исходный файл —{' '}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-indigo-200">
            docs/openapi.yaml
          </code>
          .
        </p>
      </div>
      <div className="min-h-0 min-w-0 flex-1">
        <ApiReferenceReact
          configuration={{
            content: openApiYaml,
            title: 'Bulai Shop API',
            theme: 'deepSpace',
            darkMode: true,
            forceDarkModeState: 'dark',
            hideDarkModeToggle: true,
            /** Не раскрывать теги по умолчанию — сначала виден обзор с «Введение». */
            defaultOpenFirstTag: false,
            defaultOpenAllTags: false,
          }}
        />
      </div>
    </div>
  )
}
