const mongoose = require('mongoose')
const mongodb = process.env.MONGODB
mongoose.connect(mongodb)

const waitlistschema = new mongoose.Schema({
    name: String,
    email: String,
    city: String,
    gender: String
})

module.exports = mongoose.model('waitlist', waitlistschema)