# Release procedure

## 1. Local build steps

1. Commit your changes.
2. Reinstall all dependencies `git clean -xfd && npm install`.
    * If there are any vulnerabilities fix them with `npm audit fix`.
    * Make sure `package-lock.json` is updated.
3. Check for all type and documentation errors by running `npm run lint`.
4. Run local tests via `npm test`.
5. Bump version in `package.json` file.
6. Add release latest release notes to `README.md` file. Append them to `CHANGELOG.md` as well.
7. Generate new documentation via `npm run docs` and skip CSS changes.
8. Send PR and wait for CI/CD to pass all tests successfully.
9. Merge your changes to `master` branch.

## 2. Publishing

1. You can test pre-release changes in your chosen application by installing the library as
  ```"react-native-ble-plx": "dotintent/react-native-ble-plx"```.
2. Clean repository and publish new version: `git clean -xfd && npm publish`.
3. Add tag to the repository in form of `x.x.x`.
4. Add release notes to the [Github](https://github.com/dotintent/react-native-ble-plx/releases) by copying a list of changes from `CHANGELOG.md`.
3. Check any issues which are fixed by a new version, close them and point to a new release in the comment section.
