#!/bin/bash

set -eo pipefail

REACT_NATIVE_VERSION=$1

for filename in ../patches/rn-$1/*.patch; do
  echo Applying "$filename"
  git apply "$filename" || echo Patch not applied.
done