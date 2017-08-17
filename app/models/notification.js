var mongoose = require('mongoose');

var notificationSchema = mongoose.Schema({
    message: {
        type: String
    },
    user: {
        type: mongoose.Schema.Types.ObjectID,
        ref: 'User'
    },
    is_shown: {
        type: Boolean,
        default: false
    }
});

var Notification = module.exports = mongoose.model('Notification', notificationSchema);