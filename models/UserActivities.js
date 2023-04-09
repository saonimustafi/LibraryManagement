const mongoose = require('mongoose')
const userActivitiesSchema = new mongoose.Schema({
    user_id: {
        type: Number,
        required: true,
        unique: true
    },
    booksBorrowed:[{
        book_id: {
            type: Number,
            required: true
        },
        checkOutDate: {
            type: Date,
            required: true
        },
        returnDate: {
            type: Date,
            required: true
        },
        actualReturnDate: {
            type: Date,
            default: null
        },
        fineToPay: {
            type: Number,
            default: 0
        },
        finePaid: {
            type: Boolean,
            default: false
        }
    }]
})

const userActivities = mongoose.model('userActivities', userActivitiesSchema)
module.exports = userActivities