import { DeviceCodeCredential } from '@azure/identity'

let credential = null
let cachedToken = null
let tokenExpiry = null

export function initCertAuth(config) {
  if (!config.clientId || !config.tenantId) {
    console.error('[CertAuth] ERROR: Missing required Azure configuration.')
    console.error('[CertAuth] Ensure AZURE_CLIENT_ID and AZURE_TENANT_ID are set in your .env file.')
    return null
  }

  credential = new DeviceCodeCredential({
    clientId: config.clientId,
    tenantId: config.tenantId,
    userPromptCallback: (info) => {
      console.log(`[CertAuth] ${info.message}`)
    },
  })
  console.log('[CertAuth] Initialized with DeviceCodeCredential')
  return credential
}

export async function getTokenWithCert(config) {
  if (!credential) {
    console.error('[CertAuth] Credential not initialized')
    return null
  }

  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    console.log('[CertAuth] Returning cached token')
    return cachedToken
  }

  try {
    const scope = `api://${config.clientId}/access-as-user`

    const result = await credential.getToken(scope)

    cachedToken = result.token
    tokenExpiry = result.expiresOn ? new Date(result.expiresOn).getTime() - 60000 : Date.now() + 3600000

    console.log('[CertAuth] New token acquired')
    return cachedToken
  } catch (error) {
    console.error('[CertAuth] Token acquisition failed:', error.message)
    return null
  }
}

export function isCertAuthEnabled() {
  return credential !== null
}