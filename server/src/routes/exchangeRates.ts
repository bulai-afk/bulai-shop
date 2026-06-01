import { Router } from 'express'
import { getBelarusbankRubRatesCached } from '../lib/belarusbankExchange.js'

export const exchangeRatesRouter = Router()

/** Курс RUB ↔ BYN (Беларусбанк, кэш 1 ч). */
exchangeRatesRouter.get('/belarusbank/rub', async (_req, res, next) => {
  try {
    const rates = await getBelarusbankRubRatesCached()
    res.json({
      ok: true,
      data: {
        city: rates.city,
        rubOutPer100: rates.rubOutPer100,
        rubInPer100: rates.rubInPer100,
        filialSample: rates.filialSample,
        fetchedAt: rates.fetchedAt,
      },
    })
  } catch (e) {
    next(e)
  }
})
