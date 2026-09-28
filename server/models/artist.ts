import mongoose, { Schema, type Model } from "mongoose"

const artistSchema = new Schema({
	name: { type: String, required: true },
	file: { type: String, required: true },
})

export const Artist =
	(mongoose.models.Artist as Model<any> | undefined) ??
	(mongoose.model<any>("Artist", artistSchema) as Model<any>)
