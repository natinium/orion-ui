/**
 * Commitlint — enforces CONTRIBUTING.md §Conventional Commits.
 * Scopes are the monorepo's real boundaries; add a scope only when the
 * directory exists.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['registry', 'docs', 'scripts', 'ci', 'deps', 'repo', 'brand', 'launch'],
    ],
    'subject-max-length': [2, 'always', 72],
    'subject-empty': [2, 'never'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'body-max-line-length': [1, 'always', 120],
  },
};
