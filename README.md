# App météo multi-modèles

Squelette propre au projet (types, providers, agrégation, fixture).
La base TanStack Start n'est pas incluse : elle doit être générée
avec la CLI officielle.

## Mise en place
1. Générer un projet TanStack Start avec pnpm (CLI officielle).
2. Copier dans le projet généré : `CLAUDE.md`, `src/types`,
   `src/providers`, `src/lib`, `test/`.
3. `pnpm add -D vitest`
4. `pnpm dlx @tanstack/intent@latest install`
5. `pnpm test` : les tests en `todo` doivent apparaître.
