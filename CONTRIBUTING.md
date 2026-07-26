# Contributing to Nexli Web & Marketing Platform

We welcome contributions from developers, technical writers, and educational domain experts who value precision, maintainability, and clean systems architecture.

## Principles

1. **Craftsmanship & Quality:** Ensure all code is cleanly structured, strongly typed, and well-documented.
2. **Performance First:** Do not introduce heavy client-side JavaScript libraries or dependencies that degrade page load speeds or Core Web Vitals.
3. **No Marketing Fluff:** When writing or editing documentation, guides, or landing pages, maintain an objective, technical, and helpful tone. Avoid hyperbole and generic AI-generated copywriting.

## Workflow

1. **Fork the Repository:** Create your own branch from `main`.
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Make Changes:** Ensure all TypeScript interfaces and styling tokens align with existing patterns.
3. **Verify Locally:** Before committing, always run the full production build to ensure no broken routes or schema mismatches:
   ```bash
   cd Website
   npm run build
   ```
4. **Submit a Pull Request:** Provide a clear, concise summary of the changes, why they were made, and how they were tested.

## Reporting Issues

If you find a broken link, rendering inconsistency, or documentation error, please open a GitHub issue detailing:
- The URL or file path where the issue occurs
- Expected vs. actual behavior
- Steps to reproduce (if applicable)

Thank you for helping us build better educational infrastructure.
