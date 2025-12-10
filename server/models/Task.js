const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Task title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Task description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'review', 'testing', 'completed', 'blocked'],
    default: 'todo'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  type: {
    type: String,
    enum: ['feature', 'bug', 'improvement', 'documentation', 'testing'],
    default: 'feature'
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
  estimatedHours: {
    type: Number,
    min: 0,
    max: 1000
  },
  actualHours: {
    type: Number,
    min: 0,
    default: 0
  },
  dueDate: Date,
  startDate: Date,
  completedDate: Date,
  tags: [{
    type: String,
    trim: true
  }],
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  comments: [{
    text: {
      type: String,
      required: true,
      maxlength: 1000
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  dependencies: [{
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    },
    type: {
      type: String,
      enum: ['blocks', 'blocked-by'],
      default: 'blocks'
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

// Virtual for task completion percentage
taskSchema.virtual('completionPercentage').get(function() {
  if (this.subtasks.length === 0) {
    return this.status === 'completed' ? 100 : 0;
  }
  const completedSubtasks = this.subtasks.filter(subtask => subtask.completed).length;
  return Math.round((completedSubtasks / this.subtasks.length) * 100);
});

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
  return this.dueDate && this.dueDate < new Date() && this.status !== 'completed';
});

// Pre-save middleware to update completedDate
taskSchema.pre('save', function(next) {
  if (this.status === 'completed' && !this.completedDate) {
    this.completedDate = new Date();
  } else if (this.status !== 'completed') {
    this.completedDate = undefined;
  }
  next();
});

// Method to add comment
taskSchema.methods.addComment = function(text, authorId) {
  this.comments.push({ text, author: authorId });
  return this.save();
};

// Method to update status
taskSchema.methods.updateStatus = function(newStatus) {
  const validTransitions = {
    'todo': ['in-progress', 'blocked'],
    'in-progress': ['review', 'testing', 'blocked', 'todo'],
    'review': ['testing', 'in-progress', 'todo'],
    'testing': ['completed', 'in-progress', 'todo'],
    'completed': ['todo', 'in-progress'],
    'blocked': ['todo', 'in-progress']
  };

  if (validTransitions[this.status] && validTransitions[this.status].includes(newStatus)) {
    this.status = newStatus;
    return true;
  }
  return false;
};

// Method to calculate work efficiency
taskSchema.methods.calculateEfficiency = function() {
  if (!this.estimatedHours || this.actualHours === 0) return null;
  return Math.round((this.estimatedHours / this.actualHours) * 100);
};

module.exports = mongoose.model('Task', taskSchema);
