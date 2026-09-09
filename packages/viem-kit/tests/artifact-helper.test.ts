import { describe, expect, test } from '@jest/globals';
import { keccak256, toBytes } from 'viem';
import { linkBytecode, loadArtifact } from '../src/node/artifact-helper';

const firstLibrary = `0x${'11'.repeat(20)}`;
const secondLibrary = `0x${'22'.repeat(20)}`;

// The standard compiler linkReferences shape, with offsets measured in bytes.
const artifact = {
    abi: [],
    bytecode: {
        object: '6000' + '00'.repeat(20) + '00',
        linkReferences: { 'B.sol': { Lib: [{ start: 2, length: 20 }] } },
    },
};

describe('artifact library resolution', () => {
    test('uses the exact source-qualified library regardless of mapping order', () => {
        for (const mappings of [
            { 'A.sol:Lib': firstLibrary, 'B.sol:Lib': secondLibrary },
            { 'B.sol:Lib': secondLibrary, 'A.sol:Lib': firstLibrary },
        ]) {
            expect(loadArtifact(artifact, mappings).bytecode).toBe(`0x6000${secondLibrary.slice(2)}00`);
        }
    });

    test('prefers the exact source-qualified key over an explicit short-name fallback', () => {
        expect(loadArtifact(artifact, { Lib: firstLibrary, 'B.sol:Lib': secondLibrary }).bytecode).toBe(
            `0x6000${secondLibrary.slice(2)}00`
        );
        expect(loadArtifact(artifact, { Lib: firstLibrary }).bytecode).toBe(`0x6000${firstLibrary.slice(2)}00`);
    });

    test('rejects a mapping for a different source file or an inherited key', () => {
        expect(() => loadArtifact(artifact, { 'A.sol:Lib': firstLibrary })).toThrow('Missing link reference');
        expect(() => loadArtifact(artifact, Object.create({ Lib: firstLibrary }))).toThrow('Missing link reference');
    });
});

describe('deployment bytecode validation', () => {
    const library = 'A.sol:Lib';
    const identifier = keccak256(toBytes(library)).slice(2, 36);
    const placeholder = `__$${identifier}$__`;

    test('links compiler hash placeholders and strips mapping comments from output', () => {
        const raw = `60${placeholder}00\n// ${placeholder} -> ${library}\n`;
        expect(linkBytecode(raw, { [library]: firstLibrary })).toBe(`0x60${firstLibrary.slice(2)}00`);
    });

    test('rejects ambiguous short placeholders unless explicitly mapped', () => {
        const mappings = { 'A.sol:Lib': firstLibrary, 'B.sol:Lib': secondLibrary };
        expect(() => linkBytecode('__Lib__', mappings)).toThrow('Ambiguous library mapping');
        expect(linkBytecode('__Lib__', { ...mappings, Lib: secondLibrary })).toBe(secondLibrary);
    });

    test('links mixed name and hash placeholders without retaining comments', () => {
        expect(linkBytecode(`__Lib__${placeholder}`, { [library]: firstLibrary })).toBe(
            `0x${firstLibrary.slice(2)}${firstLibrary.slice(2)}`
        );
    });

    test.each(['0x', '0x123', '0x60zz', '6000 garbage', '__Missing__'])('rejects invalid bytecode %s', (raw) => {
        expect(() => linkBytecode(raw)).toThrow();
    });

    test('rejects invalid artifact bytes after structured linking', () => {
        expect(() => loadArtifact({ abi: [], bytecode: '0x60zz' })).toThrow('hexadecimal bytes');
    });
});
