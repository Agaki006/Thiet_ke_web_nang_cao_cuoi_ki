import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function loadApi(base = '/api') {
  const source = (await readFile(new URL('../src/api.ts', import.meta.url), 'utf8'))
    .replace('import.meta.env.VITE_API_BASE', JSON.stringify(base))
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } })
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}#${Math.random()}`)
}

test('media URLs follow the API base without rewriting absolute URLs', async () => {
  for (const base of ['/api', 'https://api.example.com', 'https://api.example.com/api/']) {
    const { resolveApiAsset } = await loadApi(base)
    assert.equal(resolveApiAsset('/api/media/art.png'), `${base.replace(/\/$/, '')}/media/art.png`)
    assert.equal(resolveApiAsset('/api/artworks/3/download'), `${base.replace(/\/$/, '')}/artworks/3/download`)
    assert.equal(resolveApiAsset('https://storage.example.com/art.png'), 'https://storage.example.com/art.png')
    assert.equal(resolveApiAsset(null), null)
  }
})

test('similarity errors always show one decimal place', async () => {
  const { formatApiError } = await loadApi()
  assert.equal(formatApiError({ detail: { message: 'Similar work', similarity_percent: 85 } }), 'Similar work Độ tương đồng: 85.0%.')
  assert.equal(formatApiError({ detail: { similarity_percent: 53.125 } }), 'Độ tương đồng: 53.1%.')
})

test('retry sends the authenticated bearer token and resolves returned assets', async () => {
  const originalFetch = globalThis.fetch
  const originalStorage = globalThis.localStorage
  const calls = []
  globalThis.localStorage = { getItem: () => 'test-token' }
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    return new Response(JSON.stringify({ id: 4, image_url: '/api/media/4.png', download_url: '/api/artworks/4/download' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  try {
    const { api } = await loadApi('https://api.example.com')
    const result = await api.retryChain(4)
    assert.equal(calls[0].url, 'https://api.example.com/artworks/4/retry-chain')
    assert.equal(calls[0].options.method, 'POST')
    assert.equal(calls[0].options.headers.get('Authorization'), 'Bearer test-token')
    assert.equal(result.image_url, 'https://api.example.com/media/4.png')
    assert.equal(result.download_url, 'https://api.example.com/artworks/4/download')
  } finally {
    globalThis.fetch = originalFetch
    if (originalStorage === undefined) delete globalThis.localStorage
    else globalThis.localStorage = originalStorage
  }
})
