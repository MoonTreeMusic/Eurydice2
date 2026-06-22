const MSAL_CONFIG = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: 'http://localhost:5173',
  },
}

class EurydiceApiClient {
  constructor() {
    this.msalInstance = null
    this.account = null
    this.accessToken = null
    this.apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
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
    console.log('Initializing MSAL...')
    const { PublicClientApplication } = await import('@azure/msal-browser')
    this.msalInstance = new PublicClientApplication(MSAL_CONFIG)
    await this.msalInstance.initialize()
    console.log('MSAL initialized')

    const accounts = this.msalInstance.getAllAccounts()
    if (accounts.length > 0) {
      this.account = accounts[0]
      this.msalInstance.setActiveAccount(this.account)
      console.log('Found existing account:', this.account)
    }
  }

  async login() {
    console.log('Login called')
    if (!this.msalInstance) await this.initialize()

    const clientId = import.meta.env.VITE_AZURE_CLIENT_ID
    // Use GUID-based scope for MSAL, not api:// format
    const apiScope = `${clientId}/.default`
    const loginRequest = {
      scopes: [apiScope],
    }
    console.log('Login request:', loginRequest)

    try {
      const result = await this.msalInstance.loginPopup(loginRequest)
      console.log('Login popup result:', result)
      this.account = result.account
      
      // Now acquire token for API access
      const tokenResult = await this.acquireToken()
      console.log('Token acquisition result:', tokenResult)
      
      return tokenResult
    } catch (error) {
      console.error('Login failed:', error)
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      return false
    }
  }

  async acquireToken() {
    if (!this.msalInstance || !this.account) {
      console.log('Cannot acquire token: no MSAL instance or account')
      return false
    }

    const clientId = import.meta.env.VITE_AZURE_CLIENT_ID
    // Use GUID-based scope for MSAL
    const apiScope = `${clientId}/.default`
    const tokenRequest = {
      scopes: [apiScope],
    }

    console.log('Acquiring token with request:', tokenRequest)

    try {
      const result = await this.msalInstance.acquireTokenSilent({
        ...tokenRequest,
        account: this.account,
      })
      this.accessToken = result.accessToken
      console.log('Silent token acquired')
      return true
    } catch (error) {
      console.log('Silent token failed:', error.name)
      if (error.name === 'InteractionRequiredAuthError') {
        try {
          const result = await this.msalInstance.acquireTokenPopup(tokenRequest)
          this.accessToken = result.accessToken
          console.log('Popup token acquired')
          return true
        } catch (popupError) {
          console.error('Popup token acquisition failed:', popupError)
          return false
        }
      }
      console.error('Token acquisition failed:', error)
      return false
    }
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
    await this.ensureAuthenticated()

    const headers = {
      Authorization: `Bearer ${this.accessToken}`,
    }

    const response = await fetch(`${this.apiBaseUrl}/api/library/scan`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ files }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(error.message || `API error: ${response.status}`)
    }

    return response.json()
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