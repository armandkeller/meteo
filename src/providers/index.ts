import { openMeteoProvider } from './open-meteo'
import type { WeatherProvider } from './types'

// Ajouter une source = ajouter son provider ici.
export const providers: WeatherProvider[] = [openMeteoProvider]
