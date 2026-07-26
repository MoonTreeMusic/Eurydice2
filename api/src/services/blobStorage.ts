import {
  BlobServiceClient,
  ContainerClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} from '@azure/storage-blob'
import { OnBehalfOfCredential, ManagedIdentityCredential } from '@azure/identity'
import { config } from '../config/index.js'
import type { Library } from '../types.js'

async function getBlobServiceClientForUser(userAccessToken: string): Promise<BlobServiceClient> {
  const storageAccountName = config.azure.storageAccountName
  const blobServiceUrl = `https://${storageAccountName}.blob.core.windows.net`

  if (config.azure.storageAccountKey) {
    const credential = new StorageSharedKeyCredential(storageAccountName, config.azure.storageAccountKey)
    return new BlobServiceClient(blobServiceUrl, credential)
  }

  let credential

  if (config.env === 'production' && process.env.AZURE_MANAGED_IDENTITY_CLIENT_ID) {
    credential = new ManagedIdentityCredential(process.env.AZURE_MANAGED_IDENTITY_CLIENT_ID)
  } else if (config.auth.clientSecret) {
    credential = new OnBehalfOfCredential({
      tenantId: config.auth.tenantId,
      clientId: config.auth.clientId,
      clientSecret: config.auth.clientSecret,
      userAssertionToken: userAccessToken,
    })
  } else {
    throw new Error(
      'No Azure Storage credentials configured. Set AZURE_STORAGE_ACCOUNT_KEY for local dev, ' +
      'or AZURE_CLIENT_SECRET for OBO flow (requires app registration with client secret).'
    )
  }

  return new BlobServiceClient(blobServiceUrl, credential)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function streamToString(stream: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = []
    stream.on('data', (chunk: string | Buffer) => {
      chunks.push(typeof chunk === 'string' ? chunk : chunk.toString())
    })
    stream.on('end', () => resolve(chunks.join('')))
    stream.on('error', reject)
  })
}

function getContainerName(userId: string): string {
  return `user-${userId.replace(/[^a-zA-Z0-9]/g, '-')}`
}

export async function ensureUserContainer(userId: string, userAccessToken: string): Promise<ContainerClient> {
  const blobServiceClient = await getBlobServiceClientForUser(userAccessToken)
  const containerClient = blobServiceClient.getContainerClient(getContainerName(userId))
  await containerClient.createIfNotExists()
  return containerClient
}

export async function getLibrary(userId: string, userAccessToken: string): Promise<Library> {
  const containerClient = await ensureUserContainer(userId, userAccessToken)
  const blobClient = containerClient.getBlockBlobClient('library.json')

  try {
    const downloadResponse = await blobClient.download()
    const content = await streamToString(downloadResponse.readableStreamBody!)
    return JSON.parse(content) as Library
  } catch (error: unknown) {
    const restError = error as { code?: string }
    if (restError.code === 'BlobNotFound') {
      return {
        tracks: [],
        playlists: [],
        settings: {},
        nextId: 1,
        nextPlaylistId: 1,
      }
    }
    throw error
  }
}

export async function saveLibrary(userId: string, library: Library, userAccessToken: string): Promise<void> {
  const containerClient = await ensureUserContainer(userId, userAccessToken)
  const blobClient = containerClient.getBlockBlobClient('library.json')
  const content = JSON.stringify(library, null, 2)
  await blobClient.upload(content, Buffer.byteLength(content))
}

export async function uploadTrackFile(
  userId: string,
  trackId: number,
  filename: string,
  data: Buffer,
  userAccessToken: string
): Promise<string> {
  const containerClient = await ensureUserContainer(userId, userAccessToken)
  const blobPath = `tracks/${trackId}_${filename}`
  const blobClient = containerClient.getBlockBlobClient(blobPath)

  await blobClient.upload(data, data.length)

  return blobPath
}

export async function deleteTrackFile(userId: string, path: string, userAccessToken: string): Promise<void> {
  const blobServiceClient = await getBlobServiceClientForUser(userAccessToken)
  const containerClient = blobServiceClient.getContainerClient(getContainerName(userId))
  const blobClient = containerClient.getBlockBlobClient(path)
  await blobClient.deleteIfExists()
}

export async function getSignedTrackUrl(
  userId: string,
  path: string,
  userAccessToken: string,
  expiresInSeconds: number = 3600
): Promise<{ url: string; expiresAt: number }> {
  const blobServiceClient = await getBlobServiceClientForUser(userAccessToken)
  const containerClient = blobServiceClient.getContainerClient(getContainerName(userId))
  const blobClient = containerClient.getBlockBlobClient(path)

  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)

  if (config.azure.storageAccountKey) {
    const credential = new StorageSharedKeyCredential(
      config.azure.storageAccountName,
      config.azure.storageAccountKey
    )
    const sasQueryParams = generateBlobSASQueryParameters(
      {
        containerName: containerClient.containerName,
        blobName: blobClient.name,
        permissions: BlobSASPermissions.parse('r'),
        expiresOn: expiresAt,
      },
      credential
    )
    return {
      url: `${blobClient.url}?${sasQueryParams.toString()}`,
      expiresAt: expiresAt.getTime(),
    }
  }

  return {
    url: blobClient.url,
    expiresAt: expiresAt.getTime(),
  }
}
