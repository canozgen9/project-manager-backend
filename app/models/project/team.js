var mongoose = require('mongoose');

var teamSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    sentIntivation: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    users: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    tasks: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task'
        }
    ]
});

var Team = module.exports = mongoose.model('Team', teamSchema);