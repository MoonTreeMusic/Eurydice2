export interface Config {
  env: 'local' | 'staging' | 'production'
  port: number
  azure: {
    storageAccountName: string
    storageAccountKey?: string
    storageConnectionString?: string
    blobServiceUrl: string
  }
  auth: {
    tenantId: string
    clientId: string
    audience: string
    issuer: string
  }
  ffprobe: {
    path: string
  }
}

export function loadConfig(): Config {
  const env = (process.env.NODE_ENV || 'local') as 'local' | 'staging' | 'production'

  const config: Config = {
    env,
    port: parseInt(process.env.PORT || '3000', 10),
    azure: {
      storageAccountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || '',
      storageAccountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY,
      storageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
      blobServiceUrl: process.env.AZURE_BLOB_SERVICE_URL || 'https://blob.core.windows.net',
    },
    auth: {
      tenantId: process.env.AZURE_TENANT_ID || '',
      clientId: process.env.AZURE_CLIENT_ID || '',
      audience: process.env.AZURE_API_AUDIENCE || '',
      issuer: process.env.AZURE_API_ISSUER || '',
    },
    ffprobe: {
      path: process.env.FFPROBE_PATH || 'ffprobe',
    },
  }

  return config
}

export const config = loadConfig()