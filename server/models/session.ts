import { randomUUID } from "node:crypto"
import mongoose, { Schema, type Model } from "mongoose"
import "./user"

export function getSessionModel(sessionTtlMs: number) {
	if (mongoose.models.Session) return mongoose.models.Session as Model<any>

	const sessionSchema = new Schema({
		token: { type: String, default: () => randomUUID(), required: true },
		createdAt: {
			type: Date,
			default: Date.now,
			index: { expires: Math.floor(sessionTtlMs / 1000) },
			required: true,
		},
		userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
	})

	return mongoose.model<any>("Session", sessionSchema)
}
