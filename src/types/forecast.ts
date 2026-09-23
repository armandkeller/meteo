export type NormalizedForecast = {
  source: string // ex. "ecmwf_ifs025"
  time: string // ISO 8601, UTC
  temp: number | null // °C
  apparentTemp: number | null // °C
  humidity: number | null // %
  precip: number | null // mm (somme de l'heure précédente)
  rain: number | null // mm
  snowfall: number | null // cm
  cloudCover: number | null // %
  sunshine: number | null // secondes dans l'heure
  windSpeed: number | null // km/h
  windGusts: number | null // km/h
}

export type Location = {
  name: string
  country: string
  admin1?: string // région / province
  latitude: number
  longitude: number
  timezone: string // fuseau de la ville, utilisé pour l'affichage
}

export type AggregatedValue = {
  median: number | null
  min: number | null
  max: number | null
  modelCount: number
}
