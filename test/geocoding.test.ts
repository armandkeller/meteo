import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildGeocodingUrl,
  parseGeocoding,
  searchCities,
} from '../src/lib/geocoding'

const quebec = {
  id: 6325494,
  name: 'Québec',
  latitude: 46.81228,
  longitude: -71.21454,
  country: 'Canada',
  country_code: 'CA',
  admin1: 'Québec',
  timezone: 'America/Toronto',
}

describe('buildGeocodingUrl', () => {
  it('passe name, count et language=fr', () => {
    const url = new URL(buildGeocodingUrl('Saint-Étienne & co'))
    expect(url.origin + url.pathname).toBe(
      'https://geocoding-api.open-meteo.com/v1/search',
    )
    expect(url.searchParams.get('name')).toBe('Saint-Étienne & co')
    expect(url.searchParams.get('count')).toBe('10')
    expect(url.searchParams.get('language')).toBe('fr')
  })
})

describe('parseGeocoding', () => {
  it('mappe les résultats vers Location', () => {
    expect(parseGeocoding({ results: [quebec] })).toEqual([
      {
        name: 'Québec',
        country: 'Canada',
        admin1: 'Québec',
        latitude: 46.81228,
        longitude: -71.21454,
        timezone: 'America/Toronto',
      },
    ])
  })

  it("renvoie [] quand il n'y a aucun résultat (champ results absent)", () => {
    expect(parseGeocoding({ generationtime_ms: 0.3 })).toEqual([])
    expect(parseGeocoding(null)).toEqual([])
  })

  it('ignore les résultats sans coordonnées ou sans nom', () => {
    expect(
      parseGeocoding({
        results: [
          { ...quebec, latitude: undefined },
          { ...quebec, name: '' },
          'x',
        ],
      }),
    ).toEqual([])
  })

  it('complète pays et fuseau manquants', () => {
    const [location] = parseGeocoding({
      results: [
        {
          ...quebec,
          country: undefined,
          admin1: undefined,
          timezone: undefined,
        },
      ],
    })
    expect(location.country).toBe('CA')
    expect(location.admin1).toBeUndefined()
    expect(location.timezone).toBe('UTC')
  })
})

describe('searchCities', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("n'appelle pas l'API pour une requête trop courte", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await searchCities(' q ')).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("appelle l'API et parse la réponse", async () => {
    const urls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        urls.push(url)
        return Response.json({ results: [quebec] })
      }),
    )
    const results = await searchCities('  Québec ')
    expect(results).toHaveLength(1)
    expect(new URL(urls[0]).searchParams.get('name')).toBe('Québec')
  })

  it("lève une erreur si l'API répond en erreur", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 })),
    )
    await expect(searchCities('Paris')).rejects.toThrow('500')
  })
})
