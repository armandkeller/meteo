import type { AggregatedValue, NormalizedForecast } from '../types/forecast'

export type ForecastField = keyof Omit<NormalizedForecast, 'source' | 'time'>

// TODO : médiane en ignorant les null (jamais traités comme 0)
export function median(_values: (number | null)[]): number | null {
  throw new Error('Not implemented')
}

// TODO : regrouper par heure, calculer médiane / min / max / nombre de modèles
export function aggregateByHour(
  _forecasts: NormalizedForecast[],
  _field: ForecastField,
): Map<string, AggregatedValue> {
  throw new Error('Not implemented')
}
