#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd "${script_dir}/.." && pwd)"
vinext="${project_root}/node_modules/.bin/vinext"

if [[ ! -x "${vinext}" ]]; then
  echo "vinext is unavailable. Run npm install first." >&2
  exit 69
fi

export GITHUB_PAGES=true
export NEXT_PUBLIC_GITHUB_PAGES_BASE_PATH="${GITHUB_PAGES_BASE_PATH:-}"

cd "${project_root}"
rm -rf dist dist-pages
"${vinext}" build

for required_file in \
  "dist/client/index.html" \
  "dist/client/routines/index.html" \
  "dist/client/form-check/index.html"; do
  if [[ ! -f "${required_file}" ]]; then
    echo "GitHub Pages export is incomplete: ${required_file} is missing." >&2
    exit 1
  fi
done

# Prevent GitHub Pages from treating generated files as Jekyll source.
touch dist/client/.nojekyll

mv dist/client dist-pages
rm -rf dist

echo "GitHub Pages export is ready in dist-pages."
