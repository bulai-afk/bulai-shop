import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { fetchPromoMaterialsFromApi, putPromoMaterialsToApi } from '../../api/promoMaterialsApi'
import { isSiteConfigApiExpected } from '../../constants/apiBase'
import { mergePromoMaterialsForm } from '../../utils/promoMaterialsForm'
import { buildDefaultPromoMaterials } from '../data/siteSettingsDefaults'
import { loadPromoMaterialsDraft, savePromoMaterialsDraft } from '../lib/adminDraftStorage'
import type { PromoMaterialsForm } from '../types/siteSettings'

export function useAdminPromoMaterialsForm() {
  const [promo, setPromo] = useState<PromoMaterialsForm>(() => buildDefaultPromoMaterials())
  const [mounted, setMounted] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    setPromo(mergePromoMaterialsForm(loadPromoMaterialsDraft()))
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isSiteConfigApiExpected()) return
    let cancelled = false
    ;(async () => {
      try {
        const remote = await fetchPromoMaterialsFromApi()
        if (cancelled || remote == null) return
        const merged = mergePromoMaterialsForm(remote)
        savePromoMaterialsDraft(merged)
        setPromo(merged)
      } catch {
        /* черновик из localStorage */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const save = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault()
      setApiError(null)
      savePromoMaterialsDraft(promo)
      if (isSiteConfigApiExpected()) {
        try {
          await putPromoMaterialsToApi(promo)
        } catch (err) {
          setApiError(err instanceof Error ? err.message : 'Не удалось сохранить в базу.')
          return false
        }
      }
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 2200)
      return true
    },
    [promo],
  )

  return { promo, setPromo, mounted, save, savedFlash, setSavedFlash, apiError, setApiError }
}
