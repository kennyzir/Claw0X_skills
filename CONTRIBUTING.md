# Contributing to Claw0x Skills

Thanks for your interest in contributing! This project is open to everyone.

## Adding a New Skill

1. Create a new file in `api/` — the filename becomes the endpoint (e.g., `api/ocr.ts` → `/api/ocr`)
2. Use the built-in utilities from `lib/`:
   - `authMiddleware` for auth
   - `validateInput` for input validation
   - `successResponse` / `errorResponse` for consistent responses
3. Export your handler wrapped in `authMiddleware`
4. Add a section to README.md documenting your skill's input/output
5. Open a PR

## Skill Guidelines

- **One file, one skill.** Keep it focused.
- **Validate all input.** Use `validateInput()` with a schema.
- **Handle errors gracefully.** Never let unhandled exceptions leak.
- **Document input/output.** Show example request and response in your PR.
- **Keep dependencies minimal.** Only add what you truly need.

## Code Style

- TypeScript strict mode
- Use `async/await` (no raw promises)
- Use the `lib/` utilities — don't reinvent auth or validation

## Pull Request Process

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-new-skill`)
3. Commit your changes
4. Push and open a PR
5. Describe what your skill does and include example usage

## Questions?

Open an issue or start a discussion on GitHub.
