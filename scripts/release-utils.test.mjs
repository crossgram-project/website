import { describe, expect, it } from 'vitest'
import { assetArchitecture, assetPlatform, buildCatalog, formatBytes, sources } from './release-utils.mjs'

describe('release catalog', () => {
  it('classifies common release assets', () => {
    expect(assetPlatform('Crossgram-Unigram-x64.msixbundle')).toBe('Windows')
    expect(assetPlatform('crossgram-mithka-linux-x64.tar.gz')).toBe('Linux')
    expect(assetArchitecture('telegram-arm64-qq.apk')).toBe('ARM64')
    expect(assetArchitecture('telegram-x-universal.apk')).toBe('Universal')
    expect(formatBytes(16 * 1024 * 1024)).toBe('16 MB')
  })

  it('splits the large Android release into client and brand variants', () => {
    const source = sources.find(item => item.repo.endsWith('crossgram-android'))
    const release = {
      tag_name: 'crossgram-29',
      assets: [
        { name: 'nagram-1240-arm64-qq-Nagram.apk', size: 1024, browser_download_url: 'https://example/nagram' },
        { name: 'telegram-release-11-arm64-discord-app.apk', size: 2048, browser_download_url: 'https://example/telegram' },
        { name: 'SHA256SUMS-nagram-arm64.txt', size: 99, browser_download_url: 'https://example/sums' },
      ],
    }
    const catalog = buildCatalog([{ source, release }], new Date('2026-07-31T00:00:00Z'))
    expect(catalog.clients.find(client => client.id === 'nagram').assets[0]).toMatchObject({ brand: 'qq', brandLabel: 'QQ', architecture: 'ARM64' })
    expect(catalog.clients.find(client => client.id === 'telegram').assets[0]).toMatchObject({ brand: 'discord' })
    expect(catalog.clients.flatMap(client => client.assets)).toHaveLength(2)
  })

  it('keeps unreleased client families visible without fake assets', () => {
    const source = sources.find(item => item.repo.endsWith('crossgram-desktop'))
    const catalog = buildCatalog([{ source, release: null }])
    expect(catalog.clients).toHaveLength(4)
    expect(catalog.clients.every(client => client.release === null && client.assets.length === 0)).toBe(true)
  })
})
