# Agent Behavioral Guidelines

## Quality Verification Standards

### Authentication System Debugging
- **NEVER claim success without console evidence of HTTP 200 responses**
- **ALWAYS scan screenshots for error text (Failed, Error, 404, 500) before status reports**
- **MANDATORY browser console screenshots for API-related verification**
- **NO optimistic reporting when visual evidence shows failures**

### Code Consistency Requirements
- **Maintain client_id field consistency throughout codebase**
- Verify multi-tenant data isolation in all database operations
- Ensure JWT validation follows established patterns
- Preserve existing authentication flow architecture

### Testing and Verification Protocol
- Capture browser console logs for all API interactions
- Screenshot network tab showing HTTP status codes
- Document authentication token flow from signin to API calls
- Verify profile lookup and client_id mapping functionality

### Reporting Standards
- Include visual evidence (screenshots) with all status updates
- Reference specific HTTP response codes in verification reports
- Document error messages verbatim from browser console
- Never report success based solely on code changes without runtime verification

## Implementation Guidelines
- Follow existing patterns in worker.js for JWT validation
- Maintain consistency with AuthProvider context patterns
- Preserve multi-tenant security through proper client_id scoping
- Use established error handling patterns for 404 responses
