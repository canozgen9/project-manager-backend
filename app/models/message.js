var mongoose = require('mongoose');

// Message Schema
var messageSchema = mongoose.Schema({
    message: {
        type: String,
        required: true
    },
    room: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    create_date: {
        type: Date,
        default: Date.now
    }
});

var  Message = module.exports = mongoose.model('Message', messageSchema);

