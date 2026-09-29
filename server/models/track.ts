import mongoose, { Schema, type Model } from "mongoose"
import "./album"
import "./artist"

const trackSchema = new Schema({
	name: { type: String, required: true },
	album: { type: Schema.Types.ObjectId, ref: "Album", required: true },
	artists: {
		type: [{ type: Schema.Types.ObjectId, ref: "Artist" }],
		required: true,
	},
	fileDir: { type: String, required: true },
	durationInSeconds: { type: Number, required: true },
	lyrics: {
		type: {
			synced: { type: Boolean, required: true },
			text: { type: String, required: true },
		},
	},
})

export const Track =
	(mongoose.models.Track as Model<any> | undefined) ??
	(mongoose.model<any>("Track", trackSchema) as Model<any>)
