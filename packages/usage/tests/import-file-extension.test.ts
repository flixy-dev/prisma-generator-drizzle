import { execSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { type TempDirectory, createTempHandler } from './utils/temp'

const tempHandler = createTempHandler()

// Use local generator binary instead of npm package
const generatorPath = path.resolve(__dirname, '../../generator/dist/bin.js')

afterAll(async () => {
	await tempHandler.cleanup()
})

function getSchemaPath(temp: TempDirectory) {
	return `${temp.basePath}/schema.prisma`
}

function createSchema(
	temp: TempDirectory,
	importFileExtension?: 'none' | 'js' | 'ts'
) {
	const extensionConfig = importFileExtension
		? `importFileExtension = "${importFileExtension}"`
		: ''

	fs.writeFileSync(
		getSchemaPath(temp),
		`datasource db {
			provider = "postgresql"
			url      = env("VITE_PG_DATABASE_URL")
		}

		generator drizzle {
			provider = "node ${generatorPath}"
			output = "drizzle"
			${extensionConfig}
		}

		enum UserRole {
			ADMIN
			USER
		}

		model User {
			id Int @id
			role UserRole
			posts Post[]
		}

		model Post {
			id Int @id
			authorId Int
			author User @relation(fields: [authorId], references: [id])
		}`
	)
	execSync(`bun prisma generate --schema ${getSchemaPath(temp)}`)
}

test('default (none) - imports have no extension', async () => {
	const temp = await tempHandler.prepare()
	createSchema(temp)

	// Check relations files which have relative imports to model files
	const postsRelations = fs.readFileSync(
		`${temp.basePath}/drizzle/posts-relations.ts`,
		'utf-8'
	)

	// Check that relative imports have no extension
	expect(postsRelations).toContain("from './posts'")
	expect(postsRelations).toContain("from './users'")
	expect(postsRelations).not.toContain("from './posts.js'")
	expect(postsRelations).not.toContain("from './posts.ts'")
})

test('importFileExtension = "none" - imports have no extension', async () => {
	const temp = await tempHandler.prepare()
	createSchema(temp, 'none')

	const postsRelations = fs.readFileSync(
		`${temp.basePath}/drizzle/posts-relations.ts`,
		'utf-8'
	)

	expect(postsRelations).toContain("from './posts'")
	expect(postsRelations).toContain("from './users'")
	expect(postsRelations).not.toContain("from './posts.js'")
	expect(postsRelations).not.toContain("from './posts.ts'")
})

test('importFileExtension = "js" - imports end with .js', async () => {
	const temp = await tempHandler.prepare()
	createSchema(temp, 'js')

	const postsRelations = fs.readFileSync(
		`${temp.basePath}/drizzle/posts-relations.ts`,
		'utf-8'
	)

	expect(postsRelations).toContain("from './posts.js'")
	expect(postsRelations).toContain("from './users.js'")
	// Should not have extensionless imports
	expect(postsRelations).not.toMatch(/from '\.\/posts'[^.]/)
	expect(postsRelations).not.toContain("from './posts.ts'")
})

test('importFileExtension = "ts" - imports end with .ts', async () => {
	const temp = await tempHandler.prepare()
	createSchema(temp, 'ts')

	const postsRelations = fs.readFileSync(
		`${temp.basePath}/drizzle/posts-relations.ts`,
		'utf-8'
	)

	expect(postsRelations).toContain("from './posts.ts'")
	expect(postsRelations).toContain("from './users.ts'")
	// Should not have extensionless imports
	expect(postsRelations).not.toMatch(/from '\.\/posts'[^.]/)
	expect(postsRelations).not.toContain("from './posts.js'")
})

test('package imports remain unchanged regardless of setting', async () => {
	const temp = await tempHandler.prepare()
	createSchema(temp, 'ts')

	const usersOutput = fs.readFileSync(
		`${temp.basePath}/drizzle/users.ts`,
		'utf-8'
	)

	// Package imports should not have extensions added
	expect(usersOutput).toContain("from 'drizzle-orm/pg-core'")
	expect(usersOutput).not.toContain("from 'drizzle-orm/pg-core.ts'")
	expect(usersOutput).not.toContain("from 'drizzle-orm/pg-core.js'")
})
