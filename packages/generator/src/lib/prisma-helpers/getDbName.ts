export function getDbName(
	field: { dbName?: string | null; name: string } | { getDbName(): string }
) {
	// Handle SchemaField objects that have getDbName() method
	if ('getDbName' in field && typeof field.getDbName === 'function') {
		return field.getDbName()
	}

	// Handle DMMF field objects that have dbName property
	if ('dbName' in field) {
		return field.dbName ?? field.name
	}

	// Fallback - should not happen with proper typing
	throw new Error('Invalid field object passed to getDbName')
}
