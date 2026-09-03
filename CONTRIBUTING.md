# Contributing to Debate Lab

Thank you for helping improve Debate Lab. Bug reports, documentation fixes,
feature ideas, and code contributions are welcome.

## Before you begin

- Read and follow the [Code of Conduct](CODE_OF_CONDUCT.md).
- Search existing issues and pull requests before creating a duplicate.
- For a substantial change, open an issue first so the approach can be discussed.
- Do not open public issues for vulnerabilities; follow [SECURITY.md](SECURITY.md).

## Development workflow

1. Fork the repository and create a focused branch from the default branch.
2. Follow the setup instructions in [README.md](README.md).
3. Make a small, focused change and include documentation where appropriate.
4. Run the project checks:

   ```bash
   npm run check
   ```

5. Commit using a concise, imperative message (for example,
   `Add validation for debate topics`).
6. Push your branch and open a pull request.

## Coding guidelines

- Preserve the existing TypeScript style and project structure.
- Keep client presentation concerns separate from server application logic.
- Validate untrusted input and never commit credentials or local `.env` files.
- Prefer clear names and small, testable units over unnecessary abstractions.
- Update documentation when behavior, configuration, or setup changes.

## Issues

A helpful bug report includes:

- A clear description of the problem and expected behavior
- Exact steps to reproduce it
- Relevant logs or screenshots with secrets and personal data removed
- Browser, operating system, Node.js version, and AI provider/model details

Feature requests should explain the use case, desired outcome, and reasonable
alternatives considered.

## Pull requests

Keep pull requests focused on one concern. In the description, explain what
changed, why it changed, how it was tested, and any migration or configuration
steps reviewers need. Link related issues and include screenshots for visible UI
changes. Ensure checks pass and respond constructively to review feedback.

By contributing, you agree that your contributions will be licensed under the
project's [MIT License](LICENSE).
