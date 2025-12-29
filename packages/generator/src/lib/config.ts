import type { GeneratorOptions } from '@prisma/generator-helper'
import {
	type InferIssue,
	type InferOutput,
	flatten,
	object,
	optional,
	picklist,
	safeParse,
	string,
} from 'valibot'
import { DateMode } from '~/shared/date-mode'
import { BooleanInStr } from './valibot-schema'

const ImportFileExtension = picklist(['none', 'js', 'ts'])

const Config = object({
	relationalQuery: optional(BooleanInStr, true),
	importFileExtension: optional(ImportFileExtension, 'none'),
	verbose: optional(BooleanInStr),
	formatter: optional(string()),
	abortOnFailedFormatting: optional(BooleanInStr, true),
	dateMode: optional(DateMode),
})
export type Config = InferOutput<typeof Config>

type ConfigSchemaIssues = [
	InferIssue<typeof Config>,
	...InferIssue<typeof Config>[],
]

export function parseConfig(config: GeneratorOptions['generator']['config']) {
	const parsing = safeParse(Config, config)
	if (!parsing.success) throw new ConfigError(parsing.issues)
	return parsing.output
}

class ConfigError extends Error {
	constructor(
		issues: [InferIssue<typeof Config>, ...InferIssue<typeof Config>[]]
	) {
		super(`[prisma-generator-drizzle] Invalid Config:\n${formatError(issues)}`)
		this.name = 'ConfigError'
	}
}

function formatError(issues: ConfigSchemaIssues) {
	let message = ''

	const flattened = flatten(issues)
	if (flattened.root) {
		message += `\n- ${flattened.root}`
	}

	for (const [key, issues] of Object.entries(flattened.nested ?? {})) {
		message += `\n- ${key}: ${issues}`
	}

	return message
}
