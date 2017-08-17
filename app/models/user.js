var mongoose = require('mongoose');

// Message Schema
var userSchema = mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    teams: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Team'
        }
    ],
    friends: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    intivations: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    color: {
        type: String
    },
    avatar: {
        type: String
    }
});

var  User = module.exports = mongoose.model('User', userSchema);

