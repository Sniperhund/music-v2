import mongoose, { Schema, type Model } from "mongoose"

const genreSchema = new Schema({
	name: { type: String, required: true, unique: true },
})

export const Genre =
	(mongoose.models.Genre as Model<any> | undefined) ??
	(mongoose.model<any>("Genre", genreSchema) as Model<any>)
