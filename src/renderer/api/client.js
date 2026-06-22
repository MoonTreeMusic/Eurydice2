const MSAL_CONFIG = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || 'common'}`,
    redirectUri: window.location.origin,
  },
}

const LOGIN_REQUEST = {
  scopes: ['User.Read'],
}

const API_SCOPES = [import.meta.env.VITE_AZURE_API_AUDIENCE || 'api://default']

class EurydiceApiClient {
  constructor() {
    this.msalInstance = null
    this.account = null
    this.accessToken = null
    this.apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
  }

  async initialize() {
    const { PublicClientApplication } = await import('@azure/msal-browser')
    this.msalInstance = new PublicClientApplication(MSAL_CONFIG)
    await this.msalInstance.initialize()

    const accounts = this.msalInstance.getAllAccounts()
    if (accounts.length > 0) {
      this.account = accounts[0]
      this.msalInstance.setActiveAccount(this.account)
    }
  }

  async login() {
    if (!this.msalInstance) await this.initialize()

    try {
      const result = await this.msalInstance.loginPopup(LOGIN_REQUEST)
      this.account = result.account
      await this.acquireToken()
      return true
    } catch (error) {
      console.error('Login failed:', error)
      return false
    }
  }

  async acquireToken() {
    if (!this.msalInstance || !this.account) return false

    try {
      const result = await this.msalInstance.acquireTokenSilent({
        scopes: API_SCOPES,
        account: this.account,
      })
      this.accessToken = result.accessToken
      return true
    } catch (error) {
      if (error.name === 'InteractionRequiredAuthError') {
        try {
          const result = await this.msalInstance.acquireTokenPopup({ scopes: API_SCOPES })
          this.accessToken = result.accessToken
          return true
        } catch (popupError) {
          console.error('Token acquisition failed:', popupError)
          return false
        }
      }
      console.error('Token acquisition failed:', error)
      return false
    }
  }

  async ensureAuthenticated() {
    if (!this.accessToken) {
      return await this.acquireToken()
    }
    return true
  }

  async fetch(endpoint, options = {}) {
    await this.ensureAuthenticated()

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.accessToken}`,
      ...options.headers,
    }

    const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
      ...options,
      headers,
    })

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