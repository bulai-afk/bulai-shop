/** URL OAuth Яндекс (implicit), если виджет sdk-suggest не отрисовался. */
export function buildYandexOAuthAuthorizeUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    response_type: 'token',
    client_id: clientId,
    redirect_uri: redirectUri,
  })
  return `https://oauth.yandex.ru/authorize?${params.toString()}`
}
