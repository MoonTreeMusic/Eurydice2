import {
  BlobServiceClient,
  ContainerClient,
  BlockBlobClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} from '@azure/storage-blob'
import { config } from '../config/index.js'
import type { Library } from '../types.js'

let blobServiceClient: BlobServiceClient | null = null

function getBlobServiceClient(): BlobServiceClient {
  if (!blobServiceClient) {
    if (config.azure.storageConnectionString) {
      blobServiceClient = BlobServiceClient.fromConnectionString(config.azure.storageConnectionString)
    } else if (config.azure.storageAccountKey) {
      const credential = new StorageSharedKeyCredential(
        config.azure.storageAccountName,
        config.azure.storageAccountKey
      )
      blobServiceClient = new BlobServiceClient(config.azure.blobServiceUrl, credential)
    } else {
      throw new Error('No Azure Storage credentials configured')
    }
  }
  return blobServiceClient
}

function getUserContainer(userId: string): ContainerClient {
  const containerName = `users/${userId}`
  const client = getBlobServiceClient()
  return client.getContainerClient(containerName)
}

export async function ensureUserContainer(userId: string): Promise<ContainerClient> {
  const containerClient = getUserContainer(userId)
  await containerClient.createIfNotExists()
  return containerClient
}

export async function getLibrary(userId: string): Promise<Library> {
  const containerClient = await ensureUserContainer(userId)
  const blobClient = containerClient.getBlockBlobClient('library.json')

  try {
    const downloadResponse = await blobClient.download()
    const content = await streamToString(downloadResponse.readableStreamBody!)
    return JSON.parse(content) as Library
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('BlobNotFound')) {
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

export async function saveLibrary(userId: string, library: Library): Promise<void> {
  const containerClient = await ensureUserContainer(userId)
  const blobClient = containerClient.getBlockBlobClient('library.json')
  const content = JSON.stringify(library, null, 2)
  await blobClient.upload(content, Buffer.byteLength(content))
}

export async function uploadTrackFile(
  userId: string,
  trackId: number,
  filename: string,
  data: Buffer
): Promise<string> {
  const containerClient = await ensureUserContainer(userId)
  const blobPath = `tracks/${trackId}_${filename}`
  const blobClient = containerClient.getBlockBlobClient(blobPath)

  await blobClient.upload(data, data.length)

  return blobPath
}

export async function deleteTrackFile(userId: string, path: string): Promise<void> {
  const containerClient = await ensureUserContainer(userId)
  const blobClient = containerClient.getBlockBlobClient(path)
  await blobClient.deleteIfExists()
}

export async function getSignedTrackUrl(
  userId: string,
  path: string,
  expiresInSeconds: number = 3600
): Promise<{ url: string; expiresAt: number }> {
  const containerClient = await ensureUserContainer(userId)
  const blobClient = containerClient.getBlockBlobClient(path)

  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)

  const sasQueryParams = generateBlobSASQueryParameters(
    {
      containerName: containerClient.containerName,
      blobName: blobClient.name,
      permissions: BlobSASPermissions.parse('r'),
      expiresOn: expiresAt,
    },
    blobClient.credential as StorageSharedKeyCredential
  )

  const sasUrl = `${blobClient.url}?${sasQueryParams.toString()}`

  return {
    url: sasUrl,
    expiresAt: expiresAt.getTime(),
  }
}

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = []
    stream.on('data', (chunk: string | Buffer) => {
      chunks.push(typeof chunk === 'string' ? chunk : chunk.toString())
    })
    stream.on('end', () => resolve(chunks.join('')))
    stream.on('error', reject)
  })
}

export { getUserContainer }