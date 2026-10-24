import mongoose, { Schema, type Model } from "mongoose"
import "./track"

const playbackEventSchema = new Schema({
	userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
	sessionId: { type: String, required: true },
	trackId: { type: Schema.Types.ObjectId, ref: "Track", required: true },
	startedAt: { type: Date, required: true },
	listenedSeconds: { type: Number, required: true, min: 0 },
	completed: { type: Boolean, required: true, default: false },
})

playbackEventSchema.index({ userId: 1, startedAt: -1 })
playbackEventSchema.index({ userId: 1, trackId: 1 })
playbackEventSchema.index({ userId: 1, sessionId: 1 }, { unique: true })

export const PlaybackEvent =
	(mongoose.models.PlaybackEvent as Model<any> | undefined) ??
	(mongoose.model<any>("PlaybackEvent", playbackEventSchema) as Model<any>)
