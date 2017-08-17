var mongoose = require('mongoose');

var taskSchema = mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    finish_at: {
        type: Date
    },
    is_done: {
        type: Boolean,
        default: false
    }
});

var Task = module.exports = mongoose.model('Task', taskSchema);