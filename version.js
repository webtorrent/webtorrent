import * as PACKAGE from './package.json'

// Exports package.json to work around "with" and "assert" for backwards compatability.
export default PACKAGE.version
