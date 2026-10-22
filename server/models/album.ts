import mongoose, { Schema, type Model } from "mongoose"
import "./artist"
import "./genre"

const albumSchema = new Schema(
	{
		name: { type: String, required: true },
		artists: {
			type: [{ type: Schema.Types.ObjectId, ref: "Artist" }],
			required: true,
		},
		file: { type: String, required: true },
		genre: { type: Schema.Types.ObjectId, ref: "Genre", required: true },
	},
	{ timestamps: true },
)

albumSchema.index({ artists: 1 })
albumSchema.index({ genre: 1 })

export const Album =
	(mongoose.models.Album as Model<any> | undefined) ??
	(mongoose.model<any>("Album", albumSchema) as Model<any>)
