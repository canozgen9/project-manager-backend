var mongoose = require('mongoose');

// Message Schema
var userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
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
    projects: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project'
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
    teamIntivations: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Team'
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

