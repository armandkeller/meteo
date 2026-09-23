# App météo multi-modèles

Projet perso (usage non commercial). Interroge plusieurs modèles météo
via Open-Meteo, affiche la valeur la plus probable (médiane) et un
indice de confiance (écart entre modèles). La valeur ajoutée de l'app
est l'indice de confiance, pas la médiane seule.

## Stack
- TanStack Start (React, TypeScript strict), TanStack Query, Recharts
- Pas de BDD pour l'instant (prévue en phase 2 pour le scoring)
- Appels API uniquement dans des server functions, jamais côté client
- Tests : Vitest

## Commandes
- Package manager : pnpm uniquement (jamais npm ni yarn)
- `pnpm dev` / `pnpm build` / `pnpm test`
- Ajouter une dépendance : `pnpm add <paquet>` (`-D` pour le dev)
- Exécuter un outil ponctuel : `pnpm dlx <outil>`

## Périmètre du MVP
- Recherche de ville dans le monde entier (API de géocodage Open-Meteo)
- Prévisions horaires sur 7 jours avec tous les modèles
- Jours 8 à 16 affichés à part, avec confiance réduite (voir plus bas)
- Variables : température, température ressentie, humidité,
  précipitations, pluie, neige, couverture nuageuse, ensoleillement,
  vent, rafales
- Hors MVP : icônes de conditions (codes météo), MET Norway,
  scoring contre les observations, Ensemble API

## Sources
- Prévisions : GET https://api.open-meteo.com/v1/forecast
- Géocodage : GET https://geocoding-api.open-meteo.com/v1/search
  (paramètres : name, count, language=fr)
- Modèles (identifiants validés par un vrai appel) :
  ecmwf_ifs025, gfs_seamless, icon_seamless, gem_seamless,
  ukmo_seamless, meteofrance_seamless
- Tous sont des modèles globaux : ils fonctionnent partout dans le monde.
  Ne pas ajouter de modèle régional (HRDPS, HRRR…) sans gérer sa zone
  de couverture.

## Variables Open-Meteo (paramètre `hourly`)
temperature_2m, apparent_temperature, relative_humidity_2m,
precipitation, rain, snowfall, cloud_cover, sunshine_duration,
wind_speed_10m, wind_gusts_10m

## Architecture
- `src/providers/` : un fichier par source, chacun exporte
  `fetchForecast(lat, lon): Promise<NormalizedForecast[]>`
- `src/lib/geocoding.ts` : recherche de ville
- `src/lib/aggregate.ts` : agrégation, fonctions pures, testées
  (médiane, confiance et seuils d'écart par variable, résumé journalier)
- `src/lib/forecast-view.ts` : vue affichée (jours 1-7 / au-delà,
  confiance réduite au-delà de 7 jours), fonction pure, testée
- `src/lib/forecast.server.ts` : appel des providers
  (Promise.allSettled) et cache serveur
- `src/lib/weather.functions.ts` : server functions (seul point
  d'entrée vers les API) ; validation dans `src/lib/validation.ts`
- `src/providers/index.ts` : liste des providers
- Ajouter une source = ajouter un provider et l'inscrire dans
  `src/providers/index.ts`, rien d'autre ne change

## Format normalisé
```ts
type NormalizedForecast = {
  source: string          // ex. "ecmwf_ifs025"
  time: string            // ISO 8601, UTC
  temp: number | null     // °C
  apparentTemp: number | null
  humidity: number | null // %
  precip: number | null   // mm
  rain: number | null     // mm
  snowfall: number | null // cm (attention : cm, pas mm)
  cloudCover: number | null // %
  sunshine: number | null   // secondes dans l'heure
  windSpeed: number | null  // km/h
  windGusts: number | null  // km/h
}
```

## Règles d'agrégation
- Température, humidité, vent, couverture nuageuse : médiane
- Précipitations, pluie, neige : médiane (distributions asymétriques)
- Confiance : écart min/max entre modèles, plus le nombre de modèles
  disponibles pour l'heure
- Ignorer les `null` dans les calculs, ne jamais les traiter comme 0
- Moins de 3 modèles disponibles : afficher "confiance faible"
  quel que soit l'écart

## Horizon et nombre de modèles
- Les modèles n'ont pas tous le même horizon. Mesuré le 2026-09-23
  (Paris, `forecast_days=16`, depuis minuit UTC) : Météo-France ≈ 4,8 j,
  UKMO ≈ 7 j, ICON ≈ 7,5 j, GEM ≈ 10,5 j, ECMWF ≈ 15 j, GFS 16 j.
- Au-delà de leur horizon, les valeurs d'un modèle sont `null`.
- Dès le 5e jour il ne reste que 5 modèles (Météo-France s'arrête).
- Au-delà de 7 jours, il reste peu de modèles : ne pas présenter une
  médiane de 2 modèles comme fiable.
- Ces horizons peuvent évoluer : les revérifier avec un vrai appel
  `forecast_days=16` plutôt que de s'y fier aveuglément.

## Pièges connus
- Réponse multi-modèles : clés au format `{variable}_{modele}`
  (ex. `temperature_2m_gem_seamless`) et un seul tableau `time` partagé.
  La normalisation découpe ces clés.
- Pas de paramètre `timezone` dans l'appel : les heures restent en UTC,
  sans offset. Ne pas utiliser `timezone=auto`.
- Affichage : convertir dans le fuseau de la VILLE choisie (champ
  `timezone` du géocodage), pas dans celui du navigateur.
- `forecast_days` démarre à minuit UTC du jour courant, pas à l'heure
  courante (vérifié par un vrai appel) : les heures passées sont
  écartées côté serveur (`currentHourIso` dans `buildForecastView`).
- `precipitation` = somme de l'heure précédente. Si MET Norway est
  ajouté un jour : il donne l'heure suivante (`next_1_hours`),
  il faudra réaligner d'une heure.
- `precipitation_probability` vient des modèles d'ensemble, pas des
  modèles déterministes : ne pas en faire la moyenne entre modèles.
- Open-Meteo renvoie le point de grille le plus proche (coordonnées
  légèrement différentes de celles demandées) : c'est normal.
- Géocodage : plusieurs villes portent le même nom. Toujours afficher
  le pays et la région dans les résultats de recherche.
- Une source en échec ne doit jamais faire planter le reste
  (Promise.allSettled).
- Cache serveur d'environ 30 min par (lat, lon) : usage raisonnable
  de l'API, et les modèles ne sont mis à jour que toutes les quelques
  heures.

## Tests
- Fixtures dans `test/fixtures/` : vraies réponses JSON de l'API
- `openmeteo-quebec-sec.json` : Québec, 48 h, 6 modèles, sans pluie
- À ajouter : une fixture avec pluie, une avec neige, une sur 16 jours
  (pour tester les `null` en fin d'horizon)
- Tests unitaires obligatoires pour `aggregate.ts` et la normalisation

## Conventions
- TypeScript strict, pas de `any`
- Construire les URL avec `URLSearchParams`
- Documentation officielle : https://open-meteo.com/en/docs

## Skills TanStack
@AGENTS.md
