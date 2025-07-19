# Copany App Architecture Documentation

## Architecture Pattern

Adopts a **layered architecture** pattern, implementing separation of concerns and data-driven design.

## File Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Page components (data fetching layer)
│   └── layout.tsx         # Layout components
├── components/            # UI components (pure rendering layer)
│   └── CopanyListView.tsx # List view components
├── services/              # Business logic layer
│   └── copany.service.ts  # Copany data services
├── actions/               # Server Actions
│   └── auth.actions.ts    # Authentication operations
├── lib/                   # Utility libraries
│   └── supabase.ts        # Supabase client configuration
└── hooks/                 # Custom Hooks (optional)
    └── useCopanies.ts     # Client-side state management example
```

## Layer Descriptions

### 1. Data Layer

- **Location**: `src/lib/supabase.ts`
- **Responsibility**: Database connection configuration
- **Features**: Distinguishes between server-side and client-side connections

### 2. Business Logic Layer (Service Layer)

- **Location**: `src/services/`
- **Responsibility**: Encapsulates all business logic and data operations
- **Features**: Static methods, reusable, error handling

### 3. Actions Layer

- **Location**: `src/actions/`
- **Responsibility**: Server Actions, handles user interactions
- **Features**: `"use server"` directive, server-side execution

### 4. Page Layer

- **Location**: `src/app/page.tsx`
- **Responsibility**: Data fetching and page layout
- **Features**: Server components, responsible for data orchestration

### 5. View Layer

- **Location**: `src/components/`
- **Responsibility**: Pure rendering components
- **Features**: Receives props, no business logic
