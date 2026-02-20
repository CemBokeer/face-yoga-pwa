# GitHub Setup (Required For PR Workflow)

## 1. Create remote and push

```bash
git remote add origin <YOUR_REPO_URL>
git push -u origin feat-foundation-architecture
git push -u origin master
```

## 2. Open first PR

1. Create PR from `feat-foundation-architecture` -> `master`.
2. Confirm CI workflow runs.
3. Apply branch protection using `docs/ops/branch-protection.md`.

## 3. Update ownership

Edit `.github/CODEOWNERS`:

```txt
* @your-github-username
```
