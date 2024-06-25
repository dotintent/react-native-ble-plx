export const cloneDeep: <T>(objectToClone: T) => T = objectToClone => JSON.parse(JSON.stringify(objectToClone))
