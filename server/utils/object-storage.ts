import { DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import type { H3Event } from "h3"
import { getBackendRuntimeConfig } from "./backend-config"

function getStorage(event: H3Event) {
	const config = getBackendRuntimeConfig(event)
	if (!config.s3Endpoint || !config.s3Bucket || !config.s3AccessKeyId || !config.s3SecretAccessKey) {
		throw new Error("Configure NUXT_S3_ENDPOINT, NUXT_S3_BUCKET, NUXT_S3_ACCESS_KEY_ID, and NUXT_S3_SECRET_ACCESS_KEY")
	}
	const client = new S3Client({
		endpoint: config.s3Endpoint,
		region: config.s3Region,
		forcePathStyle: true,
		credentials: { accessKeyId: config.s3AccessKeyId, secretAccessKey: config.s3SecretAccessKey },
	})
	return { client, bucket: config.s3Bucket }
}

export type StoredObject = { key: string; body: Buffer; contentType: string }

export async function putObjects(event: H3Event, objects: StoredObject[]) {
	const { client, bucket } = getStorage(event)
	const uploaded: string[] = []
	try {
		for (const object of objects) {
			await client.send(new PutObjectCommand({
				Bucket: bucket,
				Key: object.key,
				Body: object.body,
				ContentType: object.contentType || "application/octet-stream",
			}))
			uploaded.push(object.key)
		}
		return uploaded
	} catch (error) {
		await deleteObjects(event, uploaded).catch((cleanupError) => console.error("Unable to clean up partial bucket upload", cleanupError))
		throw error
	} finally {
		client.destroy()
	}
}

export async function deleteObjects(event: H3Event, keys: string[]) {
	if (!keys.length) return
	const { client, bucket } = getStorage(event)
	try {
		for (let index = 0; index < keys.length; index += 1000) {
			const batch = keys.slice(index, index + 1000)
			const deleted = await client.send(new DeleteObjectsCommand({
				Bucket: bucket,
				Delete: { Objects: batch.map((Key) => ({ Key })) },
			}))
			if (deleted.Errors?.length) throw new Error(`Unable to delete ${deleted.Errors.length} bucket object(s)`)
		}
	} finally {
		client.destroy()
	}
}

export async function deleteObject(event: H3Event, key: string) {
	const { client, bucket } = getStorage(event)
	try {
		await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
	} finally {
		client.destroy()
	}
}

export async function deleteObjectPrefix(event: H3Event, prefix: string) {
	const { client, bucket } = getStorage(event)
	try {
		let continuationToken: string | undefined
		do {
			const listed = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: continuationToken }))
			const keys = listed.Contents?.flatMap((object) => object.Key ? [object.Key] : []) ?? []
			if (keys.length) {
				const deleted = await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys.map((Key) => ({ Key })) } }))
				if (deleted.Errors?.length) throw new Error(`Unable to delete ${deleted.Errors.length} bucket object(s)`)
			}
			continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined
		} while (continuationToken)
	} finally {
		client.destroy()
	}
}

export async function tryDeleteObject(event: H3Event, key: string) {
	try {
		await deleteObject(event, key)
	} catch (error) {
		console.error("Unable to delete bucket object", key, error)
	}
}

export async function tryDeleteObjectPrefix(event: H3Event, prefix: string) {
	try {
		await deleteObjectPrefix(event, prefix)
	} catch (error) {
		console.error("Unable to delete bucket object prefix", prefix, error)
	}
}
