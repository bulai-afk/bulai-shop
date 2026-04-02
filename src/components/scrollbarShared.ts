/**
 * Общий вид кастомных скроллбаров (страница и PanelScrollArea): одна колонка справа, один размер.
 */

/**
 * Рельс страницы: от низа шапки (`7rem` + 30px) до `bottom-4`.
 * `justify-center` — дорожка визуально по центру видимой области по вертикали.
 */
export const pageScrollbarRailClass =
  'fixed right-2 top-[calc(7rem+30px)] bottom-4 z-[60] hidden w-2 sm:flex sm:flex-col sm:items-center sm:justify-center'

/**
 * Высота кликабельной дорожки: одна формула для страницы и панелей.
 * `100%` — высота слота рельса (fixed top/bottom у страницы и pinned-панели, inset-y у вложенной панели).
 * Центрирование: родитель-рельс с `items-center justify-center`.
 */
export const scrollbarTrackSlotWrapperClass =
  'flex h-[min(100%,min(78dvh,calc((100%-1rem)*0.9)))] min-h-[7rem] w-full flex-col'

/** Обёртка дорожки у правого края панели — `right-2`, `w-2`, смещение 30px вниз от верха области скролла. */
export const panelScrollbarRailClass =
  'pointer-events-none absolute top-[30px] bottom-0 right-2 z-10 flex w-2 flex-col items-center justify-center'

/**
 * То же для drawer / модалок: рельс с верхнего края панели (`inset-y-0`), без 30px — дорожка не висит над контентом.
 */
export const drawerPanelScrollbarRailClass =
  'pointer-events-none absolute inset-y-0 right-2 z-10 flex w-2 flex-col items-center justify-center'

/**
 * Портальный рельс модалки профиля: без `right-2`, позиция задаётся `pinnedRailStyle` по `getBoundingClientRect` панели —
 * высота = вся панель, дорожка центрируется по вертикали (`items-center justify-center` + `scrollbarTrackSlotWrapperClass`).
 */
export const profileDialogPinnedScrollbarRailClass =
  'pointer-events-none fixed z-[121] flex w-2 flex-col items-center justify-center'

/** Фиксированный рельс каталога: та же вертикаль, что у `pageScrollbarRailClass`. */
export const viewportPinnedScrollbarRailClass =
  'pointer-events-none fixed right-2 top-[calc(7rem+30px)] bottom-4 z-[60] hidden w-2 sm:flex sm:flex-col sm:items-center sm:justify-center'

/**
 * Каталог, колонка «Фильтры» (только lg): та же вертикаль, что у страницы и сетки товаров.
 * `right` — у правого края 1-й колонки (`px-8` + ¼ сетки с тремя `gap-8`), чуть сдвинуто в сторону сетки.
 * inner = 100vw − 4rem; три промежутка gap-8 = 6rem; ширина колонки = (100vw − 10rem) / 4.
 */
export const catalogFiltersPinnedScrollbarRailClass =
  'pointer-events-none fixed top-[calc(7rem+30px)] bottom-4 z-[59] hidden w-2 lg:flex lg:flex-col lg:items-center lg:justify-center right-[max(0.5rem,calc(100vw-2rem-(100vw-10rem)/4-0.25rem))]'

/** Кликабельная дорожка (заполняет обёртку по высоте). */
export const scrollbarTrackClass =
  'relative h-full min-h-0 w-full cursor-pointer rounded-full bg-white/10'

/** Ползунок внутри дорожки. */
export const scrollbarThumbClass = 'absolute left-0 w-full rounded-full bg-indigo-400/80'
