import mongoose, { Schema, type Model } from "mongoose"
import "./track"

const userSchema = new Schema(
	{
		name: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		passwordHash: { type: String, required: true, select: false },
		role: { type: String, enum: ["user", "admin"], default: "user", required: true },
		refreshTokens: {
			type: [{
				token: { type: String, required: true },
				expiresAt: { type: Date, required: true },
				createdAt: { type: Date, default: Date.now, required: true },
			}],
			default: [],
			select: false,
		},
		// Retained temporarily so existing single-token records can be migrated lazily.
		refreshToken: { type: String, select: false },
		refreshTokenExpiresAt: { type: Date, select: false },
		verified: { type: Boolean, default: false, required: true, select: false },
		savedTracks: [{ type: Schema.Types.ObjectId, ref: "Track" }],
		recentlyPlayedAlbums: [{ type: Schema.Types.ObjectId, ref: "Album" }],
	},
	{ timestamps: true },
)

export const User =
	(mongoose.models.User as Model<any> | undefined) ??
	(mongoose.model<any>("User", userSchema) as Model<any>)
