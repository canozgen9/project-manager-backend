var mongoose = require('mongoose');

var projectSchema = mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    git_repository: {
        type: String
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    authors: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    teams: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Team'
        }
    ]
});

var Project = module.exports = mongoose.model('Project', projectSchema);