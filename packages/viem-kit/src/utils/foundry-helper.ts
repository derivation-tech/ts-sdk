import * as fs from 'fs';
import * as path from 'path';


export interface Artifact {
  abi: any[];
  bytecode: string;
  contractName?: string;
}


export interface RawArtifact {
  abi: any[];
  bytecode: {
    object: string;
    linkReferences: Record<string, Record<string, { start: number; length: number }[]>>;
  };
  // Foundry artifact may include contractName
  contractName?: string;
}

export function loadFoundryABI(jsonFilePath: string): any[] {
  const artifact: RawArtifact = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
  return artifact.abi;
}

// Load a Foundry-generated artifact JSON file, resolve any library link references using the provided map,
// and return an object with abi, bytecode (with links resolved), and optional contractName.
// linkReferenceMap maps library names to their deployed addresses (as hex strings).

export function loadFoundryArtifact(
  jsonFilePath: string,
  linkReferenceMap: Record<string, string> = {}
): Artifact {
  const artifact: RawArtifact = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));

  // artifact.bytecode.object may include a 0x prefix or not. Normalize to raw hex string.
  let bytecode = artifact.bytecode.object;
  if (!bytecode) {
    throw new Error(`Artifact at ${jsonFilePath} has no bytecode.object`);
  }
  if (bytecode.startsWith('0x')) bytecode = bytecode.slice(2);

  const linkReferences = artifact.bytecode.linkReferences || {};

  for (const filePath in linkReferences) {
    for (const libName in linkReferences[filePath]) {
      if (!(libName in linkReferenceMap)) {
        throw new Error(`Missing link reference for ${libName}`);
      }

      let address = linkReferenceMap[libName];
      if (!address) {
        throw new Error(`Empty address provided for ${libName}`);
      }

      // Normalize address: strip 0x, lower-case, ensure hex, pad or truncate to 40 chars (20 bytes)
      if (address.startsWith('0x')) address = address.slice(2);
      address = address.toLowerCase();
      if (!/^[0-9a-f]*$/.test(address)) {
        throw new Error(`Invalid hex address for ${libName}: ${linkReferenceMap[libName]}`);
      }
      if (address.length > 40) {
        // take the right-most 40 chars (last 20 bytes)
        address = address.slice(address.length - 40);
      } else if (address.length < 40) {
        address = address.padStart(40, '0');
      }

      const refs = linkReferences[filePath][libName];
      for (const ref of refs) {
        const start = ref.start * 2;
        const len = ref.length * 2;

        if (start < 0 || len <= 0 || start + len > bytecode.length) {
          throw new Error(
            `Link reference out of bounds for ${libName} in ${jsonFilePath}: start=${ref.start}, length=${ref.length}, bytecodeLen=${bytecode.length}`
          );
        }

        // Ensure replacement length matches expected length (address is 20 bytes -> 40 hex chars)
        if (len !== 40) {
          // Allow linking of other lengths but warn via error to avoid silent corruption.
          throw new Error(
            `Unexpected link reference length for ${libName}: expected 20 bytes (40 hex chars), got ${ref.length} bytes`
          );
        }

        bytecode = bytecode.slice(0, start) + address + bytecode.slice(start + len);
      }
    }
  }

  const inferredName = (artifact as any).contractName || path.basename(jsonFilePath, '.json');

  return {
    abi: artifact.abi,
    bytecode: `0x${bytecode}`,
    contractName: inferredName,
  };
}

