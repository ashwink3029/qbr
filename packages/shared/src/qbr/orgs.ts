// Orgs live in run.ts beside the ladder they extend (they share MEETINGS, and a
// separate module would import run.ts in a cycle); this module is their public name.
export { ORGS, orgOf, orgUnlocked, type Org } from './run.js';
