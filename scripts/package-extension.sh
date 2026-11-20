#!/bin/sh

set -eu

repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
version=$(node -p "require('$repo_dir/manifest.json').version")
archive="$repo_dir/dist/capture-to-operately-$version.zip"

mkdir -p "$repo_dir/dist"
rm -f "$archive"

cd "$repo_dir"
zip -q -r "$archive" manifest.json icons src
unzip -q -t "$archive"

echo "Created $archive"
