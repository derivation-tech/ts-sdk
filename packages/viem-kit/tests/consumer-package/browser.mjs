import * as core from '@derivation-tech/viem-kit';
import * as utils from '@derivation-tech/viem-kit/utils';
if ('getAccount' in core || 'ArtifactHelper' in utils) throw new Error('Node tooling leaked into core');
globalThis.viemKitSmoke = { core, utils };
