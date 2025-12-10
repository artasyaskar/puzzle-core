# TaskMaster Pro

A comprehensive project management tool built with the MERN stack (MongoDB, Express.js, React, Node.js).

## Features

- **User Authentication**: Secure registration and login with JWT tokens
- **Project Management**: Create, update, and manage projects with team collaboration
- **Task Tracking**: Comprehensive task management with status tracking and assignments
- **Team Collaboration**: Add team members, assign tasks, and track progress
- **Advanced Analytics**: Performance metrics, statistics, and reporting
- **Real-time Updates**: Live status updates and notifications
- **Search Functionality**: Global search across projects and tasks

## Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Jest** - Testing framework

### Frontend
- **React 18** - UI framework
- **React Router** - Navigation
- **React Query** - Data fetching and caching
- **Styled Components** - CSS-in-JS styling
- **Axios** - HTTP client

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)
- MongoDB (v4 or higher)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd taskmaster-pro
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start MongoDB server
```bash
mongod
```

5. Run the application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/taskmaster
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3001
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get single project
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/team` - Add team member

### Tasks
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/:id` - Get single task
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/comments` - Add comment
- `POST /api/tasks/:id/subtasks` - Add subtask

### Advanced Features
- `GET /api/advanced/primes` - Generate prime numbers
- `GET /api/advanced/stats` - Get statistics
- `GET /api/advanced/search` - Global search
- `GET /api/advanced/performance` - Performance metrics

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Docker Support

Build and run with Docker:

```bash
# Build the image
docker build -t taskmaster-pro .

# Run with docker-compose
docker-compose up

# Run tests in Docker
docker-compose run --rm app ./run_tests.sh
```

## Project Structure

```
taskmaster-pro/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   └── services/
│   └── package.json
├── server/                 # Node.js backend
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── config/
│   └── index.js
├── tests/                  # Test files
│   └── base/
├── tasks/                  # Task definitions (for training)
├── package.json
├── Dockerfile
├── docker-compose.yaml
└── run_tests.sh
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue on the repository.
