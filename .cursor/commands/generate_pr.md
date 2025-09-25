# PR Title and Description

## Title

feat: implement persistent OAuth token storage and optimize discussion page performance

## Description

This PR introduces significant improvements to OAuth token management and discussion page performance optimization.

### Key Changes

#### OAuth Token Management

- **New Database Schema**: Added `user_provider_tokens` table to persistently store OAuth provider access tokens (GitHub, Google, Figma)
- **Token Storage Migration**: Replaced cookie-based token storage with database persistence to solve token retrieval issues
- **Enhanced Auth Callback**: Updated OAuth callback handler to store provider tokens in database using upsert operations
- **Provider Detection**: Added provider parameter to OAuth redirect URLs for accurate token association
- **Service Refactoring**: Simplified GitHub service to use centralized token retrieval from database

#### Performance Optimizations

- **Discussion Page Loading**: Implemented batch fetching for discussion votes and vote counts to reduce individual API calls
- **Suspense Integration**: Added Suspense boundaries with loading fallbacks for better user experience
- **Middleware Optimization**:
  - Increased refresh throttle from 60s to 300s to reduce unnecessary network requests
  - Added static resource and API route skipping for improved performance
  - Implemented timeout mechanism for session validation (5s timeout)
- **Vote State Management**: Replaced individual vote state queries with batch operations

#### UI/UX Improvements

- **Loading States**: Enhanced loading indicators across discussion components
- **Component Organization**: Moved banner components to appropriate directories
- **Footer Updates**: Updated footer and license information
- **Banner Updates**: Refreshed banner content

#### Database Migrations

- Added migration for `user_provider_tokens` table with proper RLS policies
- Added helper functions for token upsert and retrieval operations
- Fixed discussion label cascade delete constraints

### Technical Details

- **Files Changed**: 45 files modified with 1,009 additions and 673 deletions
- **Database Functions**: Added `fn_upsert_user_provider_token` and `fn_get_user_provider_token` for token management
- **Security**: Implemented proper RLS policies ensuring users can only access their own tokens
- **Backward Compatibility**: Maintained fallback mechanisms during token migration

### Impact

- Resolves OAuth token retrieval issues for multi-provider authentication
- Significantly improves discussion page loading performance through batch operations
- Reduces unnecessary middleware network requests
- Enhances overall user experience with better loading states and performance
