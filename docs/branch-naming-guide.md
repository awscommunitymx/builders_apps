# Branch naming guide

## Overview

This document outlines our branch naming conventions for the project. Following these conventions ensures consistency across the team, improves workflow automation, and makes it easier to track work across our repositories.

## Branch Naming Format

All branches should follow this format:

```
<type>/<issue-number>_<short-description>
```

For example: `feature/#3_create-graphql-api`

### Components Explained

1. **Type**: Indicates the purpose of the branch
2. **Issue Number**: References the related issue/ticket (prefixed with #)
3. **Short Description**: Brief description of the work using kebab-case

## Branch Types

| Type        | Description                              | Example                              |
| ----------- | ---------------------------------------- | ------------------------------------ |
| `feature/`  | New feature or functionality             | `feature/#42_user-authentication`    |
| `bugfix/`   | Bug fixes                                | `bugfix/#17_fix-login-error`         |
| `hotfix/`   | Urgent fixes for production              | `hotfix/#23_critical-security-patch` |
| `docs/`     | Documentation changes                    | `docs/#9_update-readme`              |
| `refactor/` | Code refactoring without feature changes | `refactor/#31_optimize-queries`      |
| `test`      | Adding or modifying tests                | `test/#28_add-api-tests`             |
| `chore/`    | Maintenance tasks, dependencies, etc.    | `chore/#15_update-dependencies`      |

## Why This Matters

### 1. Automatic Environment Creation

Our deployment script (`deploy.sh`) automatically determines the deployment environment based on branch names:

- `main` or `master` → Production environment
- `staging` or `develop` → Staging environment
- Branches starting with `feature/`, `bugfix/`, `hotfix/`, etc. → PR environments with sanitized branch names

```bash
# Example: How branch names map to environments
feature/#3_create-oidc-role → pr-feature-3-create-oidc-role
bugfix/#17_fix-login-error → pr-bugfix-17-fix-login-error
```

### 2. Traceability

- Links code changes directly to issues/tickets
- Makes it easy to find which branch contains work for a specific issue
- Enables automatic linking in many issue tracking systems

### 3. Clarity and Context

- Anyone can quickly understand the purpose and scope of a branch
- Makes repository history more meaningful
- Simplifies code review and collaboration

## Best Practices

1. **Keep descriptions concise** - Use 2-4 words that capture the essence of the change
2. **Use kebab-case** for descriptions (lowercase with hyphens)
3. **Always include the issue number** - Even for small changes
4. **Create focused branches** - One branch should address one issue/feature
5. **Delete branches after merging** - Keep the repository clean

## Branch Workflow

1. **Create a branch from the main development branch**

   ```bash
   git checkout develop
   git pull
   git checkout -b feature/#42_user-authentication
   ```

2. **Make your changes and commit them**

   ```bash
   git add .
   git commit -m "Implement user authentication flow"
   ```

3. **Push your branch to the remote repository**

   ```bash
   git push -u origin feature/#42_user-authentication
   ```

4. **Create a Pull Request for review**

5. **After approval and merging, delete the branch**

## Examples

✅ Good branch names:

- `feature/#42_add-user-profile`
- `bugfix/#17_fix-authentication`
- `hotfix/#23_security-vulnerability`
- `docs/#9_update-api-documentation`

❌ Bad branch names:

- `my-branch` (missing type and issue number)
- `feature/new-stuff` (missing issue number and vague description)
- `bug/#17` (missing description)
- `feature/#42_Add_User_Profile` (not using kebab-case)

## Integration with CI/CD

Our branch naming convention integrates with our CI/CD pipeline:

1. The `deploy.sh` script extracts the environment name from the branch name
2. CI/CD jobs use this information to deploy to the appropriate environment
3. This allows for isolated testing of each feature branch in its own environment
