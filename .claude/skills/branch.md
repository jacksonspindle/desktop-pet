---
name: branch
description: Create a new GitHub branch for a feature
user_invocable: true
---

## When to use

Use this skill when starting work on a new feature or task. It creates a new branch off main with a descriptive name.

## Instructions

1. Ask the user what the branch should be for if not already clear from context
2. Generate a short, kebab-case branch name from the description (e.g., `feat/drag-to-feed`, `fix/menu-overflow`, `refactor/radial-menu`)
3. Make sure we're on main and up to date:
   ```
   git checkout main
   git pull origin main
   ```
4. Create and switch to the new branch:
   ```
   git checkout -b <branch-name>
   ```
5. Confirm the branch was created and we're on it
