import { describe, test, expect, beforeEach } from '@jest/globals';
import { AddressBook } from '../src/utils/address-book';
import type { Address } from 'viem';

describe('AddressBook', () => {
    let addressBook: AddressBook;

    beforeEach(() => {
        addressBook = new AddressBook();
    });

    // ==========================================
    // BASIC OPERATIONS
    // ==========================================

    describe('Basic Operations', () => {
        test('should register address with name', () => {
            const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
            addressBook.registerAddressName(address, 'TestContract');

            expect(addressBook.getAddressName(address)).toBe('TestContract');
            expect(addressBook.getNamedAddress('TestContract')).toBe(address);
        });

        test('should return UNKNOWN for unregistered address', () => {
            const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
            expect(addressBook.getAddressName(address)).toBe('UNKNOWN');
        });

        test('should return undefined for unregistered name', () => {
            expect(addressBook.getNamedAddress('NonExistent')).toBeUndefined();
        });

        test('should check if address is registered', () => {
            const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
            expect(addressBook.hasAddress(address)).toBe(false);

            addressBook.registerAddressName(address, 'TestContract');
            expect(addressBook.hasAddress(address)).toBe(true);
        });

        test('should check if name is registered', () => {
            const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
            expect(addressBook.hasName('TestContract')).toBe(false);

            addressBook.registerAddressName(address, 'TestContract');
            expect(addressBook.hasName('TestContract')).toBe(true);
        });
    });

    // ==========================================
    // CASE SENSITIVITY
    // ==========================================

    describe('Case Sensitivity', () => {
        test('should handle case-insensitive name lookup', () => {
            const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
            addressBook.registerAddressName(address, 'TestContract');

            expect(addressBook.getNamedAddress('testcontract')).toBe(address);
            expect(addressBook.getNamedAddress('TESTCONTRACT')).toBe(address);
            expect(addressBook.getNamedAddress('TestContract')).toBe(address);
        });

        test('should handle case-insensitive name check', () => {
            const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
            addressBook.registerAddressName(address, 'TestContract');

            expect(addressBook.hasName('testcontract')).toBe(true);
            expect(addressBook.hasName('TESTCONTRACT')).toBe(true);
            expect(addressBook.hasName('TestContract')).toBe(true);
        });

        test('should use checksum address internally', () => {
            // Both lowercase and checksum address should work
            const lowercaseAddr = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045' as Address;
            const checksumAddr = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;

            addressBook.registerAddressName(lowercaseAddr, 'TestContract');

            // Should work with both formats
            expect(addressBook.getAddressName(checksumAddr)).toBe('TestContract');
            expect(addressBook.hasAddress(checksumAddr)).toBe(true);
        });
    });

    // ==========================================
    // DUPLICATE HANDLING
    // ==========================================

    describe('Duplicate Handling', () => {
        test('should throw error when rebinding address to different name', () => {
            const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
            addressBook.registerAddressName(address, 'FirstName');

            expect(() => {
                addressBook.registerAddressName(address, 'SecondName');
            }).toThrow(/already bound to name 'FirstName'/);
        });

        test('should throw error when rebinding name to different address', () => {
            const address1 = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
            const address2 = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address;

            addressBook.registerAddressName(address1, 'TestName');

            expect(() => {
                addressBook.registerAddressName(address2, 'TestName');
            }).toThrow(/already bound to address/);
        });

        test('should allow re-registering same address-name pair', () => {
            const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
            addressBook.registerAddressName(address, 'TestContract');

            // Should not throw
            expect(() => {
                addressBook.registerAddressName(address, 'TestContract');
            }).not.toThrow();
        });

        test('should handle case variations of same name as duplicate', () => {
            const address1 = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
            const address2 = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address;

            addressBook.registerAddressName(address1, 'TestContract');

            // Should throw because 'testcontract' is the same as 'TestContract' (case-insensitive)
            expect(() => {
                addressBook.registerAddressName(address2, 'testcontract');
            }).toThrow(/already bound to address/);
        });
    });

    // ==========================================
    // BULK OPERATIONS
    // ==========================================

    describe('Bulk Operations', () => {
        test('should load multiple addresses', () => {
            const entries = [
                { address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address, name: 'Contract1' },
                { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address, name: 'Contract2' },
                { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as Address, name: 'Contract3' },
            ];

            addressBook.loadAddresses(entries);

            expect(addressBook.getAddressName(entries[0].address)).toBe('Contract1');
            expect(addressBook.getAddressName(entries[1].address)).toBe('Contract2');
            expect(addressBook.getAddressName(entries[2].address)).toBe('Contract3');
        });

        test('should get all registered addresses', () => {
            const address1 = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
            const address2 = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address;

            addressBook.registerAddressName(address1, 'Contract1');
            addressBook.registerAddressName(address2, 'Contract2');

            const addresses = addressBook.getAllAddresses();
            expect(addresses).toHaveLength(2);
            expect(addresses).toContain(address1);
            expect(addresses).toContain(address2);
        });

        test('should get all registered names', () => {
            const address1 = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
            const address2 = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address;

            addressBook.registerAddressName(address1, 'Contract1');
            addressBook.registerAddressName(address2, 'Contract2');

            const names = addressBook.getAllNames();
            expect(names).toHaveLength(2);
            expect(names).toContain('Contract1');
            expect(names).toContain('Contract2');
        });

        test('should clear all mappings', () => {
            const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
            addressBook.registerAddressName(address, 'TestContract');

            addressBook.clear();

            expect(addressBook.hasAddress(address)).toBe(false);
            expect(addressBook.hasName('TestContract')).toBe(false);
            expect(addressBook.getAllAddresses()).toHaveLength(0);
            expect(addressBook.getAllNames()).toHaveLength(0);
        });
    });

    // ==========================================
    // IMPORT/EXPORT
    // ==========================================

    describe('Import/Export', () => {
        test('should export current state', () => {
            const address1 = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
            const address2 = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address;

            addressBook.registerAddressName(address1, 'Contract1');
            addressBook.registerAddressName(address2, 'Contract2');

            const exported = addressBook.export();

            expect(exported).toHaveLength(2);
            expect(exported.some((e) => e.name === 'Contract1')).toBe(true);
            expect(exported.some((e) => e.name === 'Contract2')).toBe(true);
        });

        test('should import exported state', () => {
            const data = [
                { address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address, name: 'Contract1' },
                { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address, name: 'Contract2' },
            ];

            addressBook.import(data);

            expect(addressBook.getAddressName(data[0].address)).toBe('Contract1');
            expect(addressBook.getAddressName(data[1].address)).toBe('Contract2');
        });

        test('should handle export-import round trip', () => {
            const address1 = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
            const address2 = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address;

            addressBook.registerAddressName(address1, 'Contract1');
            addressBook.registerAddressName(address2, 'Contract2');

            const exported = addressBook.export();

            const newAddressBook = new AddressBook();
            newAddressBook.import(exported);

            expect(newAddressBook.getAddressName(address1)).toBe('Contract1');
            expect(newAddressBook.getAddressName(address2)).toBe('Contract2');
            expect(newAddressBook.getAllAddresses()).toHaveLength(2);
        });
    });

    // ==========================================
    // EDGE CASES
    // ==========================================

    describe('Edge Cases', () => {
        test('should handle empty address book', () => {
            expect(addressBook.getAllAddresses()).toHaveLength(0);
            expect(addressBook.getAllNames()).toHaveLength(0);
        });

        test('should handle special characters in names', () => {
            const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
            const specialName = 'Test-Contract_v2.0';

            addressBook.registerAddressName(address, specialName);
            expect(addressBook.getAddressName(address)).toBe(specialName);
        });

        test('should handle long names', () => {
            const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address;
            const longName = 'A'.repeat(100);

            addressBook.registerAddressName(address, longName);
            expect(addressBook.getAddressName(address)).toBe(longName);
        });
    });
});
