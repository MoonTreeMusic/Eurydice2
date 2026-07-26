import { describe, it, expect } from 'vitest'
import { config } from './config/index.js'

describe('API Config', () => {
  it('should load config with required fields', () => {
    expect(config).toBeDefined()
    expect(config.port).toBeGreaterThan(0)
    expect(config.azure.storageAccountName).toBeDefined()
  })

  it('should have valid auth config', () => {
    expect(config.auth.tenantId).toBeDefined()
    expect(config.auth.clientId).toBeDefined()
    expect(config.auth.audience).toBeDefined()
    expect(config.auth.issuer).toBeDefined()
  })
})
