import { useEffect, type Dispatch, type SetStateAction } from 'react'
import { CLIENTS_UPDATED_EVENT } from '../admin/lib/adminDraftStorage'
import { fetchStorefrontClientMe } from '../api/storefrontClientProfileApi'
import type { AuthUser } from '../context/AuthContext'
import { isSiteConfigApiExpected } from '../constants/apiBase'
import {
  buildFormFromUser,
  profileExtrasFromClientTableRow,
  readProfileExtras,
} from '../pages/ProfilePage'
import { resolveStorefrontBuyerEmail } from '../utils/sessionEmail'

type StringSetter = Dispatch<SetStateAction<string>>

async function loadProfileContact(
  user: AuthUser,
  sessionJwt: string | null,
): Promise<{ firstName: string; lastName: string; email: string; phoneTel: string }> {
  const accountEmail = resolveStorefrontBuyerEmail(sessionJwt, user.email) ?? user.email
  let extras = buildFormFromUser(user, readProfileExtras(accountEmail))

  if (sessionJwt && isSiteConfigApiExpected()) {
    try {
      const row = await fetchStorefrontClientMe(sessionJwt)
      if (row) {
        extras = buildFormFromUser(user, profileExtrasFromClientTableRow(row))
      }
    } catch {
      /* localStorage + AuthUser */
    }
  }

  return {
    firstName: extras.firstName.trim(),
    lastName: extras.lastName.trim(),
    email: (extras.email.trim() || accountEmail).trim(),
    phoneTel: extras.phoneTel.trim(),
  }
}

function applyContactFields(
  contact: { firstName: string; lastName: string; email: string; phoneTel: string },
  setFirstName: StringSetter,
  setLastName: StringSetter,
  setEmail: StringSetter,
  setPhoneTel: StringSetter,
  onlyIfEmpty: boolean,
) {
  if (onlyIfEmpty) {
    setFirstName((prev) => prev.trim() || contact.firstName)
    setLastName((prev) => prev.trim() || contact.lastName)
    setEmail((prev) => prev.trim() || contact.email)
    setPhoneTel((prev) => prev.trim() || contact.phoneTel)
    return
  }
  setFirstName(contact.firstName)
  setLastName(contact.lastName)
  setEmail(contact.email)
  setPhoneTel(contact.phoneTel)
}

/** Подставляет контакты из профиля в форму checkout (шаг 1). */
export function useCheckoutContactPrefill(
  user: AuthUser | null,
  sessionJwt: string | null,
  setFirstName: StringSetter,
  setLastName: StringSetter,
  setEmail: StringSetter,
  setPhoneTel: StringSetter,
) {
  useEffect(() => {
    if (!user) return

    let cancelled = false
    const load = async (onlyIfEmpty: boolean) => {
      try {
        const contact = await loadProfileContact(user, sessionJwt)
        if (cancelled) return
        applyContactFields(contact, setFirstName, setLastName, setEmail, setPhoneTel, onlyIfEmpty)
      } catch {
        /* поля остаются как ввёл пользователь */
      }
    }

    void load(false)

    const onClientsUpdated = () => {
      void load(true)
    }
    window.addEventListener(CLIENTS_UPDATED_EVENT, onClientsUpdated)
    return () => {
      cancelled = true
      window.removeEventListener(CLIENTS_UPDATED_EVENT, onClientsUpdated)
    }
  }, [user, sessionJwt, setFirstName, setLastName, setEmail, setPhoneTel])
}
