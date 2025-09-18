# Toastmasters Monthly Scheduler

A modern, open-source web application for managing Toastmasters club schedules, member assignments, and meeting coordination. Built with React, TypeScript, and Firebase, this app helps club officers and members efficiently plan and track meeting roles.

## 🌟 About This Project

This is an **open-source project** developed with the assistance of AI (Claude/Gemini) to demonstrate modern web development practices. It's designed to be a real-world example of how AI can help create production-ready applications.

### What This App Does
- **Schedule Management**: Create and manage monthly meeting schedules
- **Role Assignment**: Assign members to specific meeting roles (Toastmaster, Table Topics Master, etc.)
- **Member Management**: Track member qualifications and availability
- **Notifications**: Automated notifications for role assignments and schedule changes
- **Real-time Collaboration**: Multiple users can work on schedules simultaneously
- **PWA Support**: Installable as a Progressive Web App (PWA) on mobile and desktop

## 🛠️ Technology Stack

### Frontend
- **React 19** - Modern React with hooks and functional components
- **TypeScript** - Type-safe JavaScript for better development experience
- **Tailwind CSS** - Utility-first CSS framework for styling
- **Vite** - Fast build tool and development server

### Backend & Database
- **Firebase** - Google's backend-as-a-service platform
  - **Firestore** - NoSQL cloud database
  - **Firebase Auth** - User authentication and authorization
  - **Firebase Functions** - Serverless backend functions

### Development Tools
- **Cursor** - AI-powered code editor (recommended)
- **Git** - Version control
- **Node.js** - JavaScript runtime

## 🚀 Getting Started

### Prerequisites
Before you begin, make sure you have the following installed:
- [Node.js](https://nodejs.org/) (version 18 or higher)
- [Git](https://git-scm.com/)
- [Cursor](https://cursor.sh/) (recommended) or any code editor
- A Google account for Firebase

### Step 1: Clone the Repository
```bash
# Clone the repository to your computer
git clone https://github.com/tm3091club/app.git

# Navigate to the project directory
cd app
```

### Step 2: Install Dependencies
```bash
# Install all required packages
npm install
```

### Step 3: Set Up Firebase

#### Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name (e.g., "toastmasters-scheduler")
4. Follow the setup wizard (you can disable Google Analytics if you want)

#### Get Firebase Configuration
1. In your Firebase project, click the gear icon ⚙️ next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (</>) to add a web app
5. Register your app with a nickname (e.g., "toastmasters-web")
6. Copy the Firebase configuration object

#### Configure Firebase in the App
1. Create a file called `.env.local` in the root directory
2. Add your Firebase configuration:
```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

#### Set Up Firestore Database
1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location close to your users

#### Set Up Authentication
1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password" authentication

### Step 4: Run the Application Locally
```bash
# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`

## 📁 Project Structure

```
app/
├── components/          # React components
│   ├── AuthPage.tsx    # Login/signup page
│   ├── Header.tsx      # Navigation header
│   ├── ScheduleView.tsx # Main schedule interface
│   └── ...
├── Context/            # React context providers
│   ├── AuthContext.tsx # Authentication state
│   └── ToastmastersContext.tsx # App data state
├── services/           # API and external services
│   ├── firebase.ts     # Firebase configuration
│   └── ...
├── utils/              # Utility functions
├── types.ts            # TypeScript type definitions
└── package.json        # Dependencies and scripts
```

## 🔧 Development Workflow

### Making Changes
1. Create a new branch for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and test them locally

3. Commit your changes:
   ```bash
   git add .
   git commit -m "Add your feature description"
   ```

4. Push to GitHub:
   ```bash
   git push origin feature/your-feature-name
   ```

### Version Management
This project uses an automated versioning system:
- **Automatic**: Version updates automatically when you push to git
- **Manual**: Run `npm run version:update` to update version manually
- **Format**: `M.DD.YY-X` (Month.Day.Year-PushCount)

## 🎯 Data Model Overview

### Firestore Collections (at a glance)
- `users` – club admins & members
- `members` – per-club members and qualifications
- `schedules` – monthly schedules with meetings & assignments
- `weeklyAgendas` – weekly meeting agendas
- `invitations` – pending invites
- `notifications` – user notifications
- `publicAgendas` / `publicSchedules` – read-only shared links

➡️ For full details on schema, logic, and roadmap, see [TOASTMASTERS_APP_SPEC.md](./TOASTMASTERS_APP_SPEC.md)

### Permissions Model
- **Admins**: Full control (assign roles, manage members, schedules)
- **Members**: Can update their availability, self-assign to unassigned roles (if qualified)
- **Club Officers**: Specific logic (e.g., President always appears on schedule, fallback to VP Education if unavailable)

## 🤝 Contributing

This is an open-source project, and contributions are welcome! Here's how you can help:

### Ways to Contribute
- **Bug Reports**: Report issues you find
- **Feature Requests**: Suggest new features
- **Code Contributions**: Submit pull requests
- **Documentation**: Improve this README or add code comments
- **Testing**: Test the app and report bugs

### Before Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🎯 Key Features for Developers

### Real-time Data
- Uses Firebase Firestore for real-time database
- Changes appear instantly across all connected users
- Offline support with data synchronization

### Type Safety
- Full TypeScript implementation
- Comprehensive type definitions
- Better IDE support and error catching

### Modern React Patterns
- Functional components with hooks
- Context API for state management
- Custom hooks for reusable logic

### Responsive Design
- Mobile-first approach
- Works on all device sizes
- Dark mode support
- Progressive Web App (PWA) installable on mobile and desktop

## 🚨 Common Issues & Solutions

### Firebase Connection Issues
- **Problem**: "Firebase not initialized"
- **Solution**: Check your `.env.local` file and ensure all Firebase config values are correct

### Build Errors
- **Problem**: TypeScript compilation errors
- **Solution**: Run `npm install` to ensure all dependencies are installed

### Authentication Issues
- **Problem**: Can't sign in or create account
- **Solution**: Verify Firebase Authentication is enabled and configured

## 📚 Learning Resources

### React & TypeScript
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Firebase
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Data Modeling](https://firebase.google.com/docs/firestore/data-modeling)

### Development Tools
- [Cursor Editor](https://cursor.sh/) - AI-powered code editor
- [Git & GitHub](https://docs.github.com/) - Version control

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- **Toastmasters International** - For the meeting structure and role system
- **AI Assistants** - This project was developed with the help of AI tools like Claude and Gemini
- **Open Source Community** - For the amazing tools and libraries that make this possible

## 📘 Full Project Guide
For the complete specification, app logic, database schema, and feature roadmap, see [TOASTMASTERS_APP_SPEC.md](./TOASTMASTERS_APP_SPEC.md)

## 📞 Support

If you need help:
1. Check the [Issues](https://github.com/tm3091club/app/issues) page
2. Create a new issue with detailed information
3. Join our community discussions

---

**Happy Coding! 🚀**

*This project demonstrates how AI can assist in creating real-world applications while maintaining high code quality and modern development practices.*