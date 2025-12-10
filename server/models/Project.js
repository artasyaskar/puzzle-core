const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Project description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  status: {
    type: String,
    enum: ['planning', 'in-progress', 'testing', 'completed', 'on-hold'],
    default: 'planning'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  team: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['lead', 'developer', 'tester', 'designer'],
      default: 'developer'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  budget: {
    allocated: {
      type: Number,
      default: 0
    },
    spent: {
      type: Number,
      default: 0
    }
  },
  milestones: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    dueDate: Date,
    status: {
      type: String,
      enum: ['pending', 'completed', 'overdue'],
      default: 'pending'
    },
    completedAt: Date
  }]
}, {
  timestamps: true
});

// Virtual for project duration
projectSchema.virtual('duration').get(function() {
  if (this.endDate) {
    return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Virtual for remaining budget
projectSchema.virtual('remainingBudget').get(function() {
  return this.budget.allocated - this.budget.spent;
});

// Update progress based on completed tasks
projectSchema.methods.updateProgress = async function() {
  const Task = mongoose.model('Task');
  const tasks = await Task.find({ project: this._id });
  
  if (tasks.length === 0) {
    this.progress = 0;
    return;
  }
  
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  this.progress = Math.round((completedTasks / tasks.length) * 100);
  await this.save();
};

// Add team member
projectSchema.methods.addTeamMember = function(userId, role = 'developer') {
  const existingMember = this.team.find(member => member.user.toString() === userId.toString());
  if (!existingMember) {
    this.team.push({ user: userId, role });
  }
};

// Remove team member
projectSchema.methods.removeTeamMember = function(userId) {
  this.team = this.team.filter(member => member.user.toString() !== userId.toString());
};

module.exports = mongoose.model('Project', projectSchema);
