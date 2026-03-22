# CLAUDE.md

## Project

Node.js microservices backend + Next.js frontend.  
Docker Compose deployment.  
No TypeScript. Each microservice has its own DB (MongoDB or PostgreSQL).  

## Workflow

- Each microservice runs independently, one DB per service.
- Frontend communicates via APIs only.
- Use Docker Compose to start services and run automated API tests.
- Feature branches: `feature/<name>`, fixes: `fix/<name>`.
- Commit messages: concise, descriptive, focused.
- Do not force push, delete branches, or bypass Docker setup without confirmation.
- Ask if frontend should support languages beyond English.

## Code Style

- ES modules (`import/export`) only.
- Variables, functions, DB tables/collections, and routes must be in English.
- Follow existing project structure, naming, and conventions.
- Keep functions small, focused, readable. Avoid over-engineering.

## Testing

- Provide automated API tests for each service.
- Define test scenarios, expected behavior, and validation checklist.
- Use Compose setup to run tests automatically.
- Validate responses, error handling, edge cases, and service isolation.

## Do Not

- Mix frontend and backend logic.
- Use shared databases between services.
- Use TypeScript.
- Skip testing, documentation, or Docker setup.
- Assume requirements without asking.

## Bash / Environment Notes

- Provide any environment variables needed to run services.
- Include commands for starting/stopping Compose, running tests, seeding DBs, etc.
