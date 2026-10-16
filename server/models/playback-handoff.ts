import mongoose, { Schema, type Model } from "mongoose"

const playbackHandoffSchema = new Schema({
	userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
	currentTrackId: { type: Schema.Types.ObjectId, ref: "Track", required: true },
	position: { type: Number, required: true, min: 0 },
	queueTrackIds: { type: [Schema.Types.ObjectId], ref: "Track", required: true },
	remainingTrackIds: { type: [Schema.Types.ObjectId], ref: "Track", required: true },
	historyTrackIds: { type: [Schema.Types.ObjectId], ref: "Track", required: true },
	repeat: { type: Boolean, required: true },
	repeatOnce: { type: Boolean, required: true },
	wasPlaying: { type: Boolean, required: true },
	expiresAt: { type: Date, required: true, index: { expires: 0 } },
	updatedAt: { type: Date, required: true },
})

export const PlaybackHandoff =
	(mongoose.models.PlaybackHandoff as Model<any> | undefined) ??
	(mongoose.model<any>("PlaybackHandoff", playbackHandoffSchema) as Model<any>)
