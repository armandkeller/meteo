import { createServerFn } from '@tanstack/react-start'
import { forecastService } from './forecast.server'
import { buildForecastView, currentHourIso } from './forecast-view'
import { searchCities } from './geocoding'
import { buildIllustratedView } from './illustrated-view'
import { validateCityQuery, validateForecastInput } from './validation'

export const searchCitiesFn = createServerFn({ method: 'GET' })
  .validator(validateCityQuery)
  .handler(({ data }) => searchCities(data.query))

export const getForecastFn = createServerFn({ method: 'GET' })
  .validator(validateForecastInput)
  .handler(async ({ data }) => {
    const { forecasts, failures } = await forecastService.getForecasts(
      data.lat,
      data.lon,
    )
    const view = buildForecastView(
      forecasts,
      data.timeZone,
      failures,
      currentHourIso(),
    )
    // Scènes calculées ici, pas au rendu : voir illustrated-view.ts
    return {
      ...view,
      illustrated: buildIllustratedView(view, data.lat, data.lon),
    }
  })
