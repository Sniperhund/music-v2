import { randomUUID } from "node:crypto"
import mongoose, { Schema, type Model } from "mongoose"
import "./track"

const userSchema = new Schema(
	{
		name: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		passwordHash: { type: String, required: true, select: false },
		role: { type: String, enum: ["user", "admin"], default: "user", required: true },
		refreshToken: {
			type: String,
			default: () => randomUUID(),
			required: true,
			select: false,
		},
		verified: { type: Boolean, default: false, required: true, select: false },
		savedTracks: [{ type: Schema.Types.ObjectId, ref: "Track" }],
	},
	{ timestamps: true },
)

export const User =
	(mongoose.models.User as Model<any> | undefined) ??
	(mongoose.model<any>("User", userSchema) as Model<any>)
