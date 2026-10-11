import mongoose, { Schema, type Model } from "mongoose"
import "./track"

const playlistSchema = new Schema(
	{
		owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
		name: { type: String, required: true, trim: true, maxlength: 100 },
		tracks: [{ type: Schema.Types.ObjectId, ref: "Track" }],
	},
	{ timestamps: true },
)

export const Playlist =
	(mongoose.models.Playlist as Model<any> | undefined) ??
	(mongoose.model<any>("Playlist", playlistSchema) as Model<any>)
