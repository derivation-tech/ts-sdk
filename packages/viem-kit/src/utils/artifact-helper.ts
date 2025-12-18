import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { keccak256 } from 'viem';


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

type JsonInput = string | object;

function parseJsonInput(input: JsonInput): any {
  // if input is an object, return directly
  if (typeof input === 'object' && input !== null) return input;

  // if input is a string, decide whether it's JSON text or a file path
  if (typeof input === 'string') {
    const s = input.trim();
    // quick test for JSON text
    if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
      return JSON.parse(s);
    }
    // otherwise treat as file path
    return JSON.parse(fs.readFileSync(input, 'utf-8')) as any;
  }

  throw new Error('Unsupported JSON input');
}

export function loadABI(jsonInput: JsonInput): any[] {
  const data = parseJsonInput(jsonInput) as any;

  // If the input is an ABI array itself
  if (Array.isArray(data)) return data as any[];

  // If the input is an artifact object with an `abi` field
  if (data && Array.isArray(data.abi)) return data.abi as any[];

  throw new Error(`Unsupported ABI JSON format: expected ABI array or artifact object with 'abi' field`);
}

// Load a Foundry-generated artifact JSON file, resolve any library link references using the provided map,
// and return an object with abi, bytecode (with links resolved), and optional contractName.
// linkReferenceMap maps library names to their deployed addresses (as hex strings).

export function loadArtifact(
  jsonInput: JsonInput,
  linkReferenceMap: Record<string, string> = {}
): Artifact {
  // ==== New clean implementation following the user's spec ====
  const artifactAny: any = parseJsonInput(jsonInput);

  // 1) Extract bytecode and structured linkReferences (if any)
  let raw: string | undefined = undefined;
  let structuredRefs: Record<string, Record<string, { start: number; length: number }[]>> | undefined = undefined;
  const jsonSourceLabel = typeof jsonInput === 'string' ? jsonInput : '<json-object>';

  // Foundry style
  if (artifactAny?.bytecode && typeof artifactAny.bytecode === 'object' && artifactAny.bytecode.object) {
    raw = artifactAny.bytecode.object;
    structuredRefs = artifactAny.bytecode.linkReferences || {};
  }

  // Hardhat style (top-level string). Some artifacts may also include top-level linkReferences.
  if (!raw && typeof artifactAny?.bytecode === 'string' && artifactAny.bytecode.length > 0) {
    raw = artifactAny.bytecode;
    structuredRefs = artifactAny.linkReferences || artifactAny.deployedLinkReferences || undefined;
  }

  // Deployed bytecode as an alternative
  if (!raw && artifactAny?.deployedBytecode && typeof artifactAny.deployedBytecode === 'object' && artifactAny.deployedBytecode.object) {
    raw = artifactAny.deployedBytecode.object;
    structuredRefs = artifactAny.deployedBytecode.linkReferences || artifactAny.deployedLinkReferences || undefined;
  }

  if (!raw) throw new Error(`Artifact at ${jsonSourceLabel} has no bytecode`);

  // normalize
  const rawNo0x = raw.startsWith('0x') ? raw.slice(2) : raw;
  let bytecode = rawNo0x;

  // helper: normalize provided address to 40 hex chars (no 0x)
  const normalize = (a: string) => {
    if (!a) throw new Error('Empty address provided');
    const s = a.startsWith('0x') ? a.slice(2) : a;
    if (!/^[0-9a-fA-F]+$/.test(s)) throw new Error(`Invalid hex address: ${a}`);
    const low = s.toLowerCase();
    return low.length > 40 ? low.slice(low.length - 40) : low.padStart(40, '0');
  };

  // 2) If structured refs exist, apply them using linkReferenceMap.
  //    linkReferenceMap keys can be 'LibName' or 'path/To/File.sol:LibName'.
  if (structuredRefs && Object.keys(structuredRefs).length > 0) {
    for (const fileKey of Object.keys(structuredRefs)) {
      const libs = structuredRefs[fileKey];
      for (const libName of Object.keys(libs)) {
        // resolve mapping: prefer exact libName, then fileKey:libName keys
        let provided = linkReferenceMap[libName];
        if (!provided) {
          const found = Object.keys(linkReferenceMap).find(k => k.endsWith(`:${libName}`));
          if (found) provided = linkReferenceMap[found];
        }

        if (!provided) {
          throw new Error(`Missing link reference for ${libName}`);
        }

        const addr = normalize(provided);

        // apply all refs for this lib
        for (const ref of libs[libName]) {
          const start = ref.start * 2;
          const len = ref.length * 2;
          if (start < 0 || len <= 0 || start + len > bytecode.length) {
            throw new Error(`Link reference out of bounds for ${libName} in ${jsonSourceLabel}`);
          }
          if (len !== 40) throw new Error(`Unexpected link reference length for ${libName}: expected 20 bytes`);
          bytecode = bytecode.slice(0, start) + addr + bytecode.slice(start + len);
        }
      }
    }
  } else {
    // 3) No structured refs: if bytecode contains placeholders, fail.
    //    Detect common Hardhat placeholders: __$hex$__ or __LibName__
  // require name-style placeholders to start with a letter to avoid matching numeric/hex fragments
  const placeholderRegex = /__\$([0-9a-fA-F]+)\$__|__([A-Za-z][A-Za-z0-9_./:-]*?)__/g;
    const m = placeholderRegex.exec(bytecode);
    if (m) {
      throw new Error(`Artifact ${jsonSourceLabel} contains placeholders but no structured linkReferences`);
    }
  }
  // Try several strategies to infer a contract name:
  // 1) explicit contractName field
  // 2) foundry's compilationTarget map -> if it contains a single unique value, use that
  // 3) file basename when jsonInput is a file path
  let inferredName = artifactAny?.contractName;
  if (!inferredName) {
    const compTarget = artifactAny?.metadata?.settings?.compilationTarget || artifactAny?.compilationTarget;
    if (compTarget && typeof compTarget === 'object') {
      try {
        const vals = Array.from(new Set(Object.values(compTarget)));
        if (vals.length === 1 && typeof vals[0] === 'string') inferredName = vals[0];
      } catch (e) {
        // ignore
      }
    }
  }
  if (!inferredName) {
    inferredName = (typeof jsonInput === 'string' && fs.existsSync(jsonInput)) ? path.basename(jsonInput, '.json') : '<unknown>';
  }
  return {
    abi: artifactAny?.abi,
    bytecode: `0x${bytecode}`,
    contractName: inferredName,
  };
}

// Link a raw bytecode string using a linkReferenceMap.
// - bytecodeStr: hex string (with or without 0x) that may contain placeholders
// - linkReferenceMap: mapping of 'LibName' or 'FilePath.sol:LibName' -> address
// Behavior:
//  - If placeholders are LibName style (__LibName__), resolve via LibName or File:Lib keys.
//  - If placeholders are Hash style (__$hex$__), linkReferenceMap MUST provide File:LibName keys;
//    this function will compute the hash for each provided File:LibName and use it to match placeholders.
//  - After linking, ensure no placeholders remain; otherwise throw.
export function linkBytecode(bytecodeStr: string, linkReferenceMap: Record<string, string> = {}): string {
  if (!bytecodeStr) throw new Error('bytecode string required');
  const raw = bytecodeStr.startsWith('0x') ? bytecodeStr.slice(2) : bytecodeStr;

  // regexes
  const hashPlaceholderRe = /__\$([0-9a-fA-F]+)\$__/g;
  // require library-name placeholders to start with a letter (avoid matching long hex segments)
  const namePlaceholderRe = /__([A-Za-z][A-Za-z0-9_./:-]*?)__/g;

  const hasHash = hashPlaceholderRe.test(raw);
  const hasName = namePlaceholderRe.test(raw);

  const normalizeAddr = (a: string) => {
    if (!a) throw new Error('Empty address provided');
    const s = a.startsWith('0x') ? a.slice(2) : a;
    if (!/^[0-9a-fA-F]+$/.test(s)) throw new Error(`Invalid hex address: ${a}`);
    const low = s.toLowerCase();
    return low.length > 40 ? low.slice(low.length - 40) : low.padStart(40, '0');
  };

  let out = raw;

  if (hasName && !hasHash) {
    // replace __LibName__ occurrences
    out = out.replace(namePlaceholderRe, (m, name: string) => {
      // try direct lib name, then file:lib keys
      let provided = linkReferenceMap[name];
      if (!provided) {
        const found = Object.keys(linkReferenceMap).find(k => k.endsWith(`:${name}`));
        if (found) provided = linkReferenceMap[found];
      }
      if (!provided) throw new Error(`Missing link mapping for library '${name}'`);
      return normalizeAddr(provided);
    });
  } else if (hasHash && !hasName) {
    // hash-style: require keys to be File:LibName
    const fileKeys = Object.keys(linkReferenceMap).filter(k => k.includes(':'));
    if (fileKeys.length === 0) throw new Error('Hash-style placeholders detected: linkReferenceMap must use FilePath:LibName keys');

    // compute keccak256(prefix) for each fully-qualified name (fileKey) and map its 34-char prefix
    const hashMap: Record<string, string> = {}; // 34-char hex prefix -> normalized address

    // Additionally parse inline comment mappings in the bytecode like:
    //   // __$5a082c16...$__ -> contracts/.../File.sol:Lib
    // to directly associate placeholder ids with fully-qualified names.
    const inlineMap: Record<string, string> = {};
    try {
      const commentRe = /\/\/\s*(__\$([0-9a-fA-F]+)\$__)\s*->\s*([^\s]+)/g;
      let cm: RegExpExecArray | null;
      while ((cm = commentRe.exec(raw))) {
        const placeholder = cm[2].toLowerCase();
        const fq = cm[3];
        inlineMap[placeholder] = fq;
      }
    } catch (e) {
      // ignore
    }

    for (const fk of fileKeys) {
      const addr = linkReferenceMap[fk];
      if (!addr) continue;
      const normalized = normalizeAddr(addr);

      // only use keccak256 of the fully-qualified name (fk) and take 34-char prefix
      try {
        // viem.keccak256 returns a 0x-prefixed hex string; strip 0x then lower
        const d = keccak256(new TextEncoder().encode(fk));
        const digest = (d.startsWith('0x') ? d.slice(2) : d).toLowerCase();
        const prefix = digest.slice(0, 34);
        hashMap[prefix] = normalized;
      } catch (e) {
        // fallback to node crypto sha3-256 if available
        try {
          const digest = crypto.createHash('sha3-256').update(fk).digest('hex').toLowerCase();
          const prefix = digest.slice(0, 34);
          hashMap[prefix] = normalized;
        } catch (e2) {
          // give up for this fk
        }
      }

      // if inline comment maps exist pointing to this fully-qualified name, add them too
      // (some artifacts encode the mapping via comments)
      for (const [ph, fq] of Object.entries(inlineMap)) {
        if (fq === fk) {
          hashMap[ph] = normalized;
        }
      }
    }

    // Replace occurrences
    out = out.replace(hashPlaceholderRe, (m, hexId: string) => {
      const key = hexId.toLowerCase();
      const found = hashMap[key] || hashMap[key.slice(0, 34)] || hashMap[key.slice(0, 40)];
      if (!found) throw new Error(`Unmapped hash placeholder: ${hexId}`);
      return found;
    });
  } else if (hasHash && hasName) {
    // both styles present: handle names first then hashes
    out = out.replace(namePlaceholderRe, (m, name: string) => {
      let provided = linkReferenceMap[name];
      if (!provided) {
        const found = Object.keys(linkReferenceMap).find(k => k.endsWith(`:${name}`));
        if (found) provided = linkReferenceMap[found];
      }
      if (!provided) throw new Error(`Missing link mapping for library '${name}'`);
      return normalizeAddr(provided);
    });

    // then hashes (require file:lib keys)
    const fileKeys = Object.keys(linkReferenceMap).filter(k => k.includes(':'));
    if (fileKeys.length === 0) throw new Error('Hash-style placeholders detected: linkReferenceMap must use FilePath:LibName keys');
    const hashMap: Record<string, string> = {};
    // parse inline comment mappings as before
    const inlineMap: Record<string, string> = {};
    try {
      const commentRe = /\/\/\s*(__\$([0-9a-fA-F]+)\$__)\s*->\s*([^\s]+)/g;
      let cm: RegExpExecArray | null;
      while ((cm = commentRe.exec(raw))) {
        const placeholder = cm[2].toLowerCase();
        const fq = cm[3];
        inlineMap[placeholder] = fq;
      }
    } catch (e) {}

    for (const fk of fileKeys) {
      const addr = linkReferenceMap[fk];
      if (!addr) continue;
      const normalized = normalizeAddr(addr);
      try {
        const d = keccak256(new TextEncoder().encode(fk));
        const digest = (d.startsWith('0x') ? d.slice(2) : d).toLowerCase();
        const prefix = digest.slice(0, 34);
        hashMap[prefix] = normalized;
      } catch (e) {
        try {
          const digest = crypto.createHash('sha3-256').update(fk).digest('hex').toLowerCase();
          const prefix = digest.slice(0, 34);
          hashMap[prefix] = normalized;
        } catch (e2) {}
      }

      for (const [ph, fq] of Object.entries(inlineMap)) {
        if (fq === fk) hashMap[ph] = normalized;
      }
    }
    out = out.replace(hashPlaceholderRe, (m, hexId: string) => {
      const key = hexId.toLowerCase();
      const found = hashMap[key] || hashMap[key.slice(0, 34)] || hashMap[key.slice(0, 40)];
      if (!found) throw new Error(`Unmapped hash placeholder: ${hexId}`);
      return found;
    });
  }

  // final integrity check: ensure no placeholders remain
  if (/__\$[0-9a-fA-F]+\$__|__[A-Za-z][A-Za-z0-9_./:-]*?__/.test(out)) {
    throw new Error('Bytecode still contains placeholders after linking');
  }

  return `0x${out}`;
}
