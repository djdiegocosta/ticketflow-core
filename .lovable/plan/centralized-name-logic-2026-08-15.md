---
title: Smart City selection by DDD and Global Name Capitalization
---

This plan implements the "Smart City" logic based on WhatsApp DDD and centralizes name capitalization across the application.

### Centralized Name Logic
- Update `src/lib/form-format.ts` to include a more robust `formatName` utility (handling connectives) and `isFullName` validation.
- Audit all name fields to use these shared utilities:
    - Signup and Login
    - Client Profile
    - User Invitation (Admin/Colaborador/Operador)
    - Artist Names in Event Simulator
    - Buyer/Participant names in Manual Sales and Courtesies
    - Manual Client Creation

### Smart City Selection by DDD
- Implement `src/lib/ibge-data.ts` containing:
    - DDD to State (UF) mapping.
    - Simplified list of Brazilian cities (grouped by UF) using IBGE data.
- Create a reusable `CityAutocomplete` component using `Command` and `Popover` from shadcn/ui.
- Integrate `CityAutocomplete` into `SignupPage.tsx` and `src/routes/cliente.perfil.tsx`.
- Lógica: DDD determines the state -> state filters the city list. If no DDD/unknown, show all cities.

### Technical Details
- **DDD Mapping:** A static object mapping all 67 Brazilian DDDs to their respective UFs.
- **IBGE Data:** Using a pre-fetched or local JSON subset of cities to ensure performance and offline capability (IndexedDB could be used for caching if needed, but a static chunked import is safer for standard use).
- **Validation:** Zod schemas will be updated to enforce the "min 2 words" rule using the centralized `isFullName` utility.

### User Questions
- No questions for now as the specification is clear.
