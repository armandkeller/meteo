import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useId, useState } from 'react'
import { MIN_QUERY_LENGTH } from '#/lib/geocoding'
import { searchCitiesFn } from '#/lib/weather.functions'
import type { Location } from '#/types/forecast'

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

export function CitySearch({ autoFocus = false }: { autoFocus?: boolean }) {
  const navigate = useNavigate()
  const inputId = useId()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const debounced = useDebounced(query.trim(), 300)
  const enabled = debounced.length >= MIN_QUERY_LENGTH

  const { data, isFetching, isError } = useQuery({
    queryKey: ['cities', debounced],
    queryFn: () => searchCitiesFn({ data: { query: debounced } }),
    enabled,
    staleTime: 24 * 60 * 60 * 1000,
  })
  const results = enabled ? (data ?? []) : []

  function select(location: Location) {
    setOpen(false)
    setQuery('')
    void navigate({
      to: '/prevision',
      search: {
        name: location.name,
        country: location.country,
        admin1: location.admin1,
        lat: location.latitude,
        lon: location.longitude,
        tz: location.timezone,
      },
    })
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      select(results[Math.min(active, results.length - 1)])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showList = open && enabled

  return (
    <div className="relative w-full">
      <label htmlFor={inputId} className="sr-only">
        Rechercher une ville
      </label>
      <input
        id={inputId}
        type="search"
        autoComplete="off"
        // biome-ignore lint/a11y/noAutofocus: la recherche est l'unique action de la page d'accueil
        autoFocus={autoFocus}
        placeholder="Rechercher une ville (ex. Québec, Lyon, Tokyo…)"
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-base shadow-sm outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
        value={query}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          showList && results.length > 0
            ? `${listId}-${Math.min(active, results.length - 1)}`
            : undefined
        }
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
      />
      {showList && (
        <div
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {isError && (
            <div className="px-4 py-2 text-sm text-rose-700">
              La recherche a échoué. Réessayez.
            </div>
          )}
          {!isError && results.length === 0 && (
            <div className="px-4 py-2 text-sm text-slate-500">
              {isFetching ? 'Recherche…' : 'Aucune ville trouvée'}
            </div>
          )}
          {results.map((location, i) => (
            <div
              key={`${location.latitude},${location.longitude},${location.name}`}
              id={`${listId}-${i}`}
              role="option"
              tabIndex={-1}
              aria-selected={i === active}
              className={`cursor-pointer px-4 py-2 ${i === active ? 'bg-sky-50' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                select(location)
              }}
            >
              <div className="font-medium text-slate-900">{location.name}</div>
              <div className="text-sm text-slate-500">
                {[location.admin1, location.country].filter(Boolean).join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
