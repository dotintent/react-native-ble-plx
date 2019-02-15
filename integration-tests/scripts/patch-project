#!/bin/bash

set -eo pipefail

REACT_NATIVE_VERSION=$1

for filename in ../patches/common/*.patch; do
  echo "Applying common patch - $filename"
  git apply "$filename" || echo Patch not applied.
done

for filename in ../patches/rn-$1/*.patch; do
  echo "Applying patch specifically for $REACT_NATIVE_VERSION - $filename"
  git apply "$filename" || echo Patch not applied.
done
