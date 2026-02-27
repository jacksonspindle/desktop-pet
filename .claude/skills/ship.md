---
name: ship
description: Ship the current branch by merging to main
user_invocable: true
---

## When to use

Use this skill when the current feature branch is ready to be merged into main.

## Instructions

1. Verify we are NOT on main — if we are, warn the user and stop
2. Run a type check to make sure the build is clean:
   ```
   npx tsc --noEmit
   ```
3. If type check fails, report errors and stop — do not merge broken code
4. Commit any uncommitted changes (ask user for confirmation if there are changes)
5. Get the current branch name and merge into main:
   ```
   git checkout main
   git pull origin main
   git merge <branch-name>
   ```
6. Delete the feature branch after merge:
   ```
   git branch -d <branch-name>
   ```
7. Confirm the merge was successful and we're back on main
