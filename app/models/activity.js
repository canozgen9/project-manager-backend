var mongoose = require('mongoose');

var activitySchema = mongoose.Schema({
    message: {
        type: String
    },
    user: {
        type: mongoose.Schema.Types.ObjectID,
        ref: 'User'
    }
});

var Activity = module.exports = mongoose.model('Notification', activitySchema);