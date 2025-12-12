const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'review', 'testing', 'completed', 'blocked'],
    default: 'todo'
  },
  type: {
    type: String,
    enum: ['feature', 'bug', 'improvement', 'documentation', 'testing'],
    default: 'feature'
  },
  estimatedHours: Number,
  actualHours: Number,
  dueDate: Date,
  tags: [String],
  comments: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  subtasks: [{
    title: {
      type: String,
      required: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

taskSchema.methods.addComment = function(authorId, text) {
  this.comments.push({ author: authorId, text });
  return this.save();
};

taskSchema.methods.addSubtask = function(title) {
  this.subtasks.push({ title });
  return this.save();
};

taskSchema.methods.toggleSubtask = function(subtaskId) {
  const subtask = this.subtasks.id(subtaskId);
  if (subtask) {
    subtask.completed = !subtask.completed;
  }
  return this.save();
};

module.exports = mongoose.model('Task', taskSchema);
