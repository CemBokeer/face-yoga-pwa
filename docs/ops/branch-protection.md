# Branch Protection Checklist

Apply these settings on GitHub for `master`:

1. Require a pull request before merging.
2. Require at least 1 approval.
3. Require status checks to pass:
   - `Lint`
   - `Typecheck`
   - `Unit Tests`
4. Dismiss stale approvals when new commits are pushed.
5. Block force pushes.
6. Block direct push to `master`.
7. Restrict deletion of the protected branch.

Recommended:

1. Require linear history.
2. Enable merge queue if team size grows.
