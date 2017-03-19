const mongoose = require('mongoose');
const Schema = mongoose.Schema;

mongoose.Promise = global.Promise;

const CheckoutSchema = new Schema({
	bill_id: { type: String, unique: true },
	title: { type: String, lowercase: true },
	description: { type: String, default: ''},
	date: { type: Date },
	location: { type: String, default: '' },
	total_tax: { type: String },
	bill_picture: { type: String, required: true },
	bill_owner: { type: Schema.Types.ObjectId, ref: "User" },
	total: { type: String }
});

module.exports = mongoose.model('Checkout', CheckoutSchema);