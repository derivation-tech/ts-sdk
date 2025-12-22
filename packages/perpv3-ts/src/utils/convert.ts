/**
 * Recursively converts specified keys in an object to BigInt
 * @param obj - The object to process
 * @param bigIntKeys - Array of keys that should be converted to BigInt
 * @returns A new object with specified keys converted to BigInt
 */
export function bigInitObjectCheckByKeys(obj: any, bigIntKeys?: string[]): any {
	if (!bigIntKeys || bigIntKeys.length === 0) {
		return obj;
	}
	if (obj === null || obj === undefined || typeof obj !== 'object') {
		return obj;
	}

	const cloneObj = Array.isArray(obj) ? [...obj] : { ...obj };
	if (cloneObj) {
		try {
			Object.keys(cloneObj).forEach((key) => {
				const val = cloneObj[key];
				// If bigNumberKeys is provided, only convert keys that are in the array
				if (bigIntKeys?.includes(key)) {
					cloneObj[key] = BigInt(val || 0);
				} else if (typeof val === 'object' && val && Object.keys(val).length > 0) {
					const newVal = bigInitObjectCheckByKeys(val, bigIntKeys);
					cloneObj[key] = newVal;
				}
			});
		} catch {
			// Silently handle conversion errors and return the original cloned object
			// This prevents the function from throwing while maintaining data integrity
		}
	}
	return cloneObj;
}

