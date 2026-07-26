class EurydiceApiClient {
  constructor() {
    this.accessToken = null
    this.apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
    this.useCertAuth = false
    const clientId = import.meta.env.VITE_AZURE_CLIENT_ID
    const tenantId = import.meta.env.VITE_AZURE_TENANT_ID
    const audience = import.meta.env.VITE_AZURE_API_AUDIENCE
    console.log('EurydiceApiClient initialized, config:', {
      clientId,
      clientIdLength: clientId ? clientId.length : 0,
      tenantId,
      tenantIdLength: tenantId ? tenantId.length : 0,
      audience,
      audienceLength: audience ? audience.length : 0,
      apiBaseUrl: this.apiBaseUrl,
    })
  }

  async initialize() {
    const clientId = import.meta.env.VITE_AZURE_CLIENT_ID
    const tenantId = import.meta.env.VITE_AZURE_TENANT_ID

    if (!clientId || !tenantId) {
      console.error('[ApiClient] ERROR: Missing required Azure configuration.')
      console.error('[ApiClient] Ensure VITE_AZURE_CLIENT_ID and VITE_AZURE_TENANT_ID are set in src/renderer/.env')
      throw new Error('Missing Azure configuration. See console for details.')
    }

    if (window.electronAPI?.isCertAuthAvailable) {
      this.useCertAuth = await window.electronAPI.isCertAuthAvailable()
      console.log('Cert auth available:', this.useCertAuth)
    }
  }

  async login() {
    if (this.useCertAuth) {
      console.log('Using certificate auth')
      return await this.acquireToken()
    }

    console.log('Using MSAL popup auth')
    const MSAL_CONFIG = {
      auth: {
        clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}/v2.0`,
        redirectUri: 'http://localhost:5173',
      },
    }

    const { PublicClientApplication } = await import('@azure/msal-browser')
    const msalInstance = new PublicClientApplication(MSAL_CONFIG)
    await msalInstance.initialize()

    const accounts = msalInstance.getAllAccounts()
    if (accounts.length > 0) {
      msalInstance.setActiveAccount(accounts[0])
    }

    const clientId = import.meta.env.VITE_AZURE_CLIENT_ID
    const apiScope = `${clientId}/.default`
    const loginRequest = { scopes: [apiScope] }

    try {
      const result = await msalInstance.loginPopup(loginRequest)
      this.account = result.account
      const tokenResult = await this._acquireTokenMsal(msalInstance)
      return tokenResult
    } catch (error) {
      console.error('Login failed:', error)
      return false
    }
  }

  async _acquireTokenMsal(msalInstance) {
    const clientId = import.meta.env.VITE_AZURE_CLIENT_ID
    const apiScope = `${clientId}/.default`
    const tokenRequest = { scopes: [apiScope] }

    try {
      const result = await msalInstance.acquireTokenSilent({
        ...tokenRequest,
        account: msalInstance.getAllAccounts()[0],
      })
      this.accessToken = result.accessToken
      return true
    } catch (error) {
      if (error.name === 'InteractionRequiredAuthError') {
        const result = await msalInstance.acquireTokenPopup(tokenRequest)
        this.accessToken = result.accessToken
        return true
      }
      console.error('Token acquisition failed:', error)
      return false
    }
  }

  async acquireToken() {
    if (this.useCertAuth) {
      console.log('Acquiring token via certificate auth')
      if (window.electronAPI?.getToken) {
        const token = await window.electronAPI.getToken()
        if (token) {
          this.accessToken = token
          return true
        }
      }
      console.error('Failed to get token from main process')
      return false
    }
    return false
  }

  async ensureAuthenticated() {
    if (!this.accessToken) {
      console.log('No access token, attempting to acquire...')
      return await this.acquireToken()
    }
    return true
  }

  async fetch(endpoint, options = {}) {
    const authResult = await this.ensureAuthenticated()
    if (!authResult) {
      throw new Error('Authentication failed')
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.accessToken}`,
      ...options.headers,
    }

    console.log(`Fetching: ${this.apiBaseUrl}${endpoint}`)

    const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      console.log('Got 401, token might be expired, clearing...')
      this.accessToken = null
      throw new Error('Token expired or invalid')
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(error.message || `API error: ${response.status}`)
    }

    if (response.status === 204) return null
    return response.json()
  }

  async getTracks() {
    const data = await this.fetch('/api/library/tracks')
    return data.tracks
  }

  async scanFolder(files) {
    return this.fetch('/api/library/scan', {
      method: 'POST',
      body: JSON.stringify({ files }),
    })
  }

  async deleteTrack(id) {
    return this.fetch(`/api/library/tracks/${id}`, { method: 'DELETE' })
  }

  async getSetting(key) {
    const data = await this.fetch(`/api/library/settings/${encodeURIComponent(key)}`)
    return data.value
  }

  async setSetting(key, value) {
    return this.fetch(`/api/library/settings/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    })
  }

  async getPlaylists() {
    const data = await this.fetch('/api/playlists')
    return data.playlists
  }

  async getPlaylistWithTracks(id) {
    return this.fetch(`/api/playlists/${id}`)
  }

  async createPlaylist(name) {
    return this.fetch('/api/playlists', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  }

  async renamePlaylist(id, name) {
    return this.fetch(`/api/playlists/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    })
  }

  async deletePlaylist(id) {
    return this.fetch(`/api/playlists/${id}`, { method: 'DELETE' })
  }

  async addTrackToPlaylist(playlistId, trackId) {
    return this.fetch(`/api/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ trackId }),
    })
  }

  async removeTrackFromPlaylist(playlistId, trackId) {
    return this.fetch(`/api/playlists/${playlistId}/tracks/${trackId}`, {
      method: 'DELETE',
    })
  }

  async reorderPlaylistTracks(playlistId, trackIds) {
    return this.fetch(`/api/playlists/${playlistId}/tracks`, {
      method: 'PUT',
      body: JSON.stringify({ trackIds }),
    })
  }

  async getAudioUrl(trackId) {
    const data = await this.fetch(`/api/audio/${trackId}/url`)
    return { url: data.url, expiresAt: data.expiresAt }
  }

  getAccount() {
    return this.account
  }

  isAuthenticated() {
    return !!this.accessToken
  }
}

export const apiClient = new EurydiceApiClient()