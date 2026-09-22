// Both public helper namespaces use the same artifact parsing and linking rules.
export { loadABI as loadFoundryABI, loadArtifact as loadFoundryArtifact } from './artifact-helper';
export type { Artifact, RawArtifact } from './artifact-helper';
