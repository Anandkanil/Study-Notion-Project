/*
 * Demo catalogue for StudyNotion: fictional instructors, extra categories, courses
 * with sections and lessons, demo students and guided paths.
 *
 * Every demo account uses the reserved .test domain (RFC 2606), so no address can
 * belong to a real person, and utils/mailSender skips them. Passwords are random
 * and never stored anywhere, so nobody can sign in as a demo account.
 *
 * Lessons are written "Title|minutes".
 */
const DOMAIN = 'demo.studynotion.test';

const instructors = [
  { key: 'meera', first: 'Meera', last: 'Krishnan', gender: 'Female', about: 'Front-end engineer with eight years of building product UIs in React and Next.js. Teaches JavaScript the way it is used at work: small, tested pieces that add up to real features.' },
  { key: 'arjun', first: 'Arjun', last: 'Mehta', gender: 'Male', about: 'Backend engineer who has designed APIs and payment services for high-traffic apps. Focuses on Node.js, TypeScript and system design, with an eye on what breaks in production.' },
  { key: 'nikhil', first: 'Nikhil', last: 'Bansal', gender: 'Male', about: 'Competitive programmer and interview coach. Has helped hundreds of students prepare for product-company interviews by turning DSA patterns into a repeatable approach.' },
  { key: 'kavya', first: 'Kavya', last: 'Reddy', gender: 'Female', about: 'Mobile developer who has shipped Android, Flutter and React Native apps to the Play Store and App Store. Teaches by building complete apps from the first screen to the release build.' },
  { key: 'rohan', first: 'Rohan', last: 'Iyer', gender: 'Male', about: 'DevOps and cloud engineer working with Linux, Docker, Kubernetes and CI/CD pipelines. Believes every developer should be able to ship and run their own code.' },
  { key: 'farah', first: 'Farah', last: 'Siddiqui', gender: 'Female', about: 'Data scientist with a background in statistics. Works with Python, SQL and NLP, and teaches analysis through real datasets rather than toy examples.' },
  { key: 'sneha', first: 'Sneha', last: 'Pillai', gender: 'Female', about: 'Product designer who leads design systems work. Teaches Figma, prototyping and how designers and developers can work from the same components.' },
  { key: 'aditya', first: 'Aditya', last: 'Rao', gender: 'Male', about: 'Application security engineer. Helps developers understand common vulnerabilities and write code that defends against them from the start.' },
];

// New categories; existing ones (Web Development, Machine Learning, Cloud Computing, UI UX, Cybersecurity) are reused by name
const categories = [
  { name: 'Data Structures & Algorithms', description: 'Core data structures, problem-solving patterns and complexity analysis, the foundation for coding interviews and efficient software.' },
  { name: 'App Development', description: 'Build mobile apps for Android and iOS with native and cross-platform tools, from the first screen to publishing in the stores.' },
  { name: 'DevOps', description: 'Linux, containers, CI/CD and automation: the tools and practices that take code from a laptop to a reliable production system.' },
  { name: 'Data Science', description: 'Analyse data with Python, SQL and statistics, and turn raw data into clear findings and decisions.' },
];

const courses = [
  // ---------- Web Development ----------
  {
    name: 'JavaScript from Scratch', cat: 'Web Development', by: 'meera', price: 1499,
    desc: 'A complete beginner course on modern JavaScript. You start with variables and functions and finish by building an interactive to-do app that talks to an API, with no framework required.',
    learn: ['Write modern JavaScript with let/const, arrow functions and modules', 'Work with arrays and objects using map, filter and reduce', 'Handle events and update the page with the DOM', 'Fetch data from APIs with promises and async/await', 'Debug code with the browser developer tools'],
    req: ['A laptop with Chrome or Firefox', 'Basic HTML is helpful but not required'],
    tags: ['JavaScript', 'ES6', 'DOM', 'WebDevelopment', 'Beginner'],
    sections: [
      ['Getting started', ['How JavaScript runs in the browser|8', 'Variables, types and operators|14', 'Conditions and loops|16']],
      ['Functions and data', ['Functions and arrow functions|15', 'Arrays and array methods|18', 'Objects and destructuring|17', 'Scope and closures|13']],
      ['The browser', ['Selecting and changing elements|14', 'Events and event delegation|16', 'Forms and validation|15']],
      ['Async JavaScript', ['Callbacks and promises|17', 'async/await and error handling|15', 'Project: a to-do app with an API|28']],
    ],
  },
  {
    name: 'Modern CSS and Responsive Layouts', cat: 'Web Development', by: 'meera', price: 999,
    desc: 'Learn the CSS you actually need today: Flexbox, Grid, custom properties and responsive design. Each section ends with a layout you can reuse in your own projects.',
    learn: ['Understand the box model, specificity and the cascade', 'Build layouts with Flexbox and CSS Grid', 'Make pages responsive with media and container queries', 'Create themes with CSS custom properties', 'Add transitions and animations that respect reduced motion'],
    req: ['Basic HTML knowledge', 'A code editor such as VS Code'],
    tags: ['CSS', 'Flexbox', 'Grid', 'ResponsiveDesign', 'Frontend'],
    sections: [
      ['CSS foundations', ['Selectors and specificity|12', 'The box model|11', 'Units: rem, em, % and viewport|10']],
      ['Layout', ['Flexbox in practice|18', 'CSS Grid from scratch|20', 'Choosing Flexbox or Grid|9']],
      ['Responsive design', ['Mobile-first media queries|14', 'Container queries|12', 'Responsive images and typography|13']],
      ['Polish', ['Custom properties and themes|12', 'Transitions and animations|14', 'Project: a responsive landing page|26']],
    ],
  },
  {
    name: 'Node.js and Express: Build REST APIs', cat: 'Web Development', by: 'arjun', price: 2499,
    desc: 'Build a production-style REST API with Node.js, Express and MongoDB. Covers routing, validation, authentication with JWT, error handling, testing and deployment.',
    learn: ['Structure an Express app with routes, controllers and middleware', 'Model data with MongoDB and Mongoose', 'Add sign-up and login with hashed passwords and JWT', 'Validate input and return consistent errors', 'Write API tests and deploy to a cloud host'],
    req: ['Comfortable with JavaScript basics', 'Node.js 18 or later installed'],
    tags: ['NodeJS', 'ExpressJS', 'MongoDB', 'RESTAPI', 'Backend'],
    sections: [
      ['Node.js basics', ['The event loop explained|14', 'Modules and npm|11', 'Your first HTTP server|12']],
      ['Express', ['Routing and controllers|16', 'Middleware|15', 'Validation and error handling|17']],
      ['Data and auth', ['Mongoose models and relations|19', 'Password hashing with bcrypt|12', 'JWT authentication|18', 'Role-based access|14']],
      ['Shipping it', ['Testing endpoints|16', 'Environment variables and config|10', 'Deploying the API|15']],
    ],
  },
  {
    name: 'Next.js for Production', cat: 'Web Development', by: 'meera', price: 2999,
    desc: 'Go beyond create-react-app. Build a full Next.js app with the App Router, server components, data fetching, authentication and SEO, then deploy it.',
    learn: ['Use the App Router, layouts and nested routes', 'Choose between server and client components', 'Fetch and cache data on the server', 'Handle forms with server actions', 'Optimise images, fonts and metadata for SEO'],
    req: ['Working knowledge of React', 'Basic understanding of HTTP'],
    tags: ['NextJS', 'React', 'SSR', 'FullStack', 'SEO'],
    sections: [
      ['App Router', ['Project setup and folder structure|12', 'Layouts and nested routes|15', 'Loading and error states|12']],
      ['Rendering', ['Server vs client components|18', 'Static and dynamic rendering|16', 'Caching and revalidation|17']],
      ['Data and forms', ['Route handlers|14', 'Server actions|16', 'Authentication|20']],
      ['Production', ['Images, fonts and metadata|13', 'Performance checks|12', 'Deploying to Vercel|11']],
    ],
  },
  {
    name: 'TypeScript for JavaScript Developers', cat: 'Web Development', by: 'arjun', price: 1999,
    desc: 'Add types to the JavaScript you already write. Learn TypeScript step by step and migrate a small React and Node project without stopping work on features.',
    learn: ['Type variables, functions and objects', 'Use unions, generics and utility types', 'Type React components and hooks', 'Type an Express API end to end', 'Migrate an existing JavaScript project gradually'],
    req: ['Solid JavaScript fundamentals'],
    tags: ['TypeScript', 'JavaScript', 'React', 'NodeJS'],
    sections: [
      ['Type basics', ['Why TypeScript|8', 'Primitive and object types|14', 'Functions and type inference|13']],
      ['Going further', ['Unions and narrowing|15', 'Generics|17', 'Utility types|13']],
      ['TypeScript in practice', ['Typing React components|16', 'Typing an Express API|16', 'Migrating a JavaScript project|19']],
    ],
  },
  {
    name: 'System Design for Beginners', cat: 'Web Development', by: 'arjun', price: 3999,
    desc: 'Learn how large applications are designed. Covers scaling, databases, caching, queues and trade-offs, with worked designs of a URL shortener, a chat app and a news feed.',
    learn: ['Estimate traffic and storage for a system', 'Scale with load balancers and horizontal scaling', 'Choose between SQL and NoSQL databases', 'Use caching, queues and CDNs', 'Walk through a system design interview answer'],
    req: ['Experience building at least one web application'],
    tags: ['SystemDesign', 'Scalability', 'Databases', 'Caching', 'Interview'],
    sections: [
      ['Foundations', ['What system design is|10', 'Back-of-the-envelope estimates|15', 'Latency and throughput|12']],
      ['Building blocks', ['Load balancers|14', 'Databases and replication|19', 'Sharding|16', 'Caching strategies|17']],
      ['Async and delivery', ['Message queues|15', 'CDNs and object storage|12', 'Rate limiting|13']],
      ['Case studies', ['Design a URL shortener|24', 'Design a chat app|27', 'Design a news feed|26']],
    ],
  },
  // ---------- Data Structures & Algorithms ----------
  {
    name: 'DSA in C++: Zero to Interview Ready', cat: 'Data Structures & Algorithms', by: 'nikhil', price: 3499,
    desc: 'A structured path through data structures and algorithms in C++. Every topic is taught through patterns and practice problems at the level asked in product-company interviews.',
    learn: ['Analyse time and space complexity', 'Solve array, string and hashing problems with common patterns', 'Work with linked lists, stacks, queues and trees', 'Apply recursion, backtracking and binary search', 'Solve graph problems with BFS and DFS'],
    req: ['Basic C++ syntax (loops, functions, arrays)'],
    tags: ['DSA', 'CPlusPlus', 'Algorithms', 'InterviewPrep', 'ProblemSolving'],
    sections: [
      ['Foundations', ['Complexity analysis|16', 'STL essentials|18', 'Recursion basics|17']],
      ['Linear structures', ['Arrays and two pointers|19', 'Sliding window|18', 'Hashing|15', 'Linked lists|20', 'Stacks and queues|18']],
      ['Searching and trees', ['Binary search patterns|19', 'Binary trees|21', 'Binary search trees|17', 'Heaps|16']],
      ['Graphs', ['Graph representation|12', 'BFS and DFS|20', 'Shortest paths|21', 'Topological sort|15']],
    ],
  },
  {
    name: 'Dynamic Programming Masterclass', cat: 'Data Structures & Algorithms', by: 'nikhil', price: 1999,
    desc: 'Dynamic programming made systematic. Learn to spot DP problems, define states and transitions, and move from recursion to memoisation to tabulation.',
    learn: ['Recognise when a problem needs dynamic programming', 'Turn recursion into memoisation and tabulation', 'Solve 1D, 2D and knapsack-style problems', 'Handle DP on strings and subsequences', 'Optimise space in DP solutions'],
    req: ['Comfortable with recursion', 'Any one programming language'],
    tags: ['DynamicProgramming', 'DSA', 'Algorithms', 'InterviewPrep'],
    sections: [
      ['Thinking in DP', ['From recursion to memoisation|18', 'Tabulation|15', 'Defining states|14']],
      ['Classic problems', ['1D DP: climbing stairs and house robber|17', '2D DP on grids|19', '0/1 knapsack|21']],
      ['Strings', ['Longest common subsequence|19', 'Edit distance|18', 'Palindromic substrings|16']],
    ],
  },
  {
    name: 'Java DSA Bootcamp', cat: 'Data Structures & Algorithms', by: 'nikhil', price: 2999,
    desc: 'Learn Java and DSA together. Starts with core Java and the Collections framework, then covers the data structures and algorithms you need for placements.',
    learn: ['Write clean Java with classes and interfaces', 'Use the Java Collections framework effectively', 'Implement sorting and searching algorithms', 'Solve problems on trees, heaps and graphs', 'Prepare for placement coding rounds'],
    req: ['No prior Java needed; basic programming logic helps'],
    tags: ['Java', 'DSA', 'Collections', 'Placements'],
    sections: [
      ['Core Java', ['Java setup and syntax|14', 'Classes and objects|17', 'Interfaces and inheritance|16']],
      ['Collections', ['ArrayList and LinkedList|15', 'HashMap and HashSet|16', 'PriorityQueue and TreeMap|15']],
      ['Algorithms', ['Sorting algorithms|21', 'Binary search|15', 'Recursion and backtracking|20']],
      ['Advanced structures', ['Trees in Java|19', 'Graphs in Java|20', 'Placement problem set|25']],
    ],
  },
  // ---------- App Development ----------
  {
    name: 'React Native: Build Cross-Platform Apps', cat: 'App Development', by: 'kavya', price: 2999,
    desc: 'Build one app for Android and iOS with React Native and Expo. You will create a complete expense-tracker app with navigation, local storage and an API, then prepare it for release.',
    learn: ['Set up React Native with Expo', 'Build screens with core components and styles', 'Add navigation with stacks and tabs', 'Store data locally and sync with an API', 'Build and publish the app'],
    req: ['React basics (components, props, state)', 'A phone with Expo Go or an emulator'],
    tags: ['ReactNative', 'Expo', 'Mobile', 'Android', 'iOS'],
    sections: [
      ['Setup', ['How React Native works|10', 'Expo setup|12', 'Core components|16']],
      ['Building the UI', ['Styling and Flexbox on mobile|15', 'Lists and forms|17', 'Navigation|19']],
      ['Data', ['Local storage|14', 'Calling an API|16', 'State management|17']],
      ['Release', ['App icons and splash screen|11', 'Building with EAS|14', 'Publishing to the stores|15']],
    ],
  },
  {
    name: 'Android with Kotlin and Jetpack Compose', cat: 'App Development', by: 'kavya', price: 2499,
    desc: 'Build native Android apps with Kotlin and Jetpack Compose. Covers Kotlin basics, Compose UI, state, ViewModel, Room and Retrofit, ending with a notes app.',
    learn: ['Write Kotlin with data classes, null safety and coroutines', 'Build UIs with Jetpack Compose', 'Manage state with ViewModel', 'Save data with Room', 'Call APIs with Retrofit'],
    req: ['Android Studio installed', 'Basic programming knowledge'],
    tags: ['Android', 'Kotlin', 'JetpackCompose', 'Mobile'],
    sections: [
      ['Kotlin', ['Kotlin basics|16', 'Null safety and data classes|14', 'Coroutines|18']],
      ['Compose', ['Composable functions|15', 'Layouts and modifiers|16', 'State in Compose|17']],
      ['Architecture', ['ViewModel|15', 'Room database|19', 'Retrofit and APIs|18', 'Project: a notes app|27']],
    ],
  },
  {
    name: 'Flutter and Dart Essentials', cat: 'App Development', by: 'kavya', price: 1999,
    desc: 'Learn Dart and Flutter and build good-looking apps from a single codebase. Covers widgets, layouts, state management, navigation and Firebase.',
    learn: ['Write Dart code confidently', 'Build layouts with Flutter widgets', 'Manage state with Provider', 'Navigate between screens', 'Connect an app to Firebase'],
    req: ['Flutter SDK installed', 'Basic programming knowledge'],
    tags: ['Flutter', 'Dart', 'Mobile', 'Firebase'],
    sections: [
      ['Dart', ['Dart basics|15', 'Classes and async in Dart|16']],
      ['Widgets', ['Stateless and stateful widgets|15', 'Layouts: rows, columns and stacks|17', 'Themes and styling|13']],
      ['App features', ['Navigation|14', 'State with Provider|18', 'Firebase auth and Firestore|21']],
    ],
  },
  // ---------- DevOps ----------
  {
    name: 'Docker and Kubernetes Hands-On', cat: 'DevOps', by: 'rohan', price: 2999,
    desc: 'Containerise an application with Docker and run it on Kubernetes. Hands-on labs cover images, Compose, deployments, services, config and scaling.',
    learn: ['Write efficient Dockerfiles', 'Run multi-container apps with Docker Compose', 'Deploy apps to Kubernetes with Deployments and Services', 'Manage config and secrets', 'Scale and update apps without downtime'],
    req: ['Comfortable with the command line', 'Docker Desktop installed'],
    tags: ['Docker', 'Kubernetes', 'Containers', 'DevOps'],
    sections: [
      ['Docker', ['Containers vs virtual machines|11', 'Images and Dockerfiles|18', 'Volumes and networks|15', 'Docker Compose|17']],
      ['Kubernetes basics', ['Cluster architecture|14', 'Pods and Deployments|18', 'Services and Ingress|17']],
      ['Running apps', ['ConfigMaps and Secrets|14', 'Scaling and rolling updates|16', 'Health checks|12']],
    ],
  },
  {
    name: 'CI/CD with GitHub Actions', cat: 'DevOps', by: 'rohan', price: 1299,
    desc: 'Automate testing and deployment with GitHub Actions. Build pipelines that run tests on every pull request and deploy when you merge.',
    learn: ['Write GitHub Actions workflows', 'Run tests and linting on every pull request', 'Cache dependencies to speed up builds', 'Store secrets safely', 'Deploy automatically on merge'],
    req: ['A GitHub account', 'A small project to automate'],
    tags: ['CICD', 'GitHubActions', 'Automation', 'DevOps'],
    sections: [
      ['Workflows', ['How GitHub Actions works|11', 'Your first workflow|13', 'Triggers and jobs|14']],
      ['Pipelines', ['Testing and linting|15', 'Caching and matrices|14', 'Secrets and environments|13']],
      ['Deployment', ['Building and publishing images|15', 'Deploying on merge|16']],
    ],
  },
  {
    name: 'Linux and Shell Scripting for Developers', cat: 'DevOps', by: 'rohan', price: 799,
    desc: 'Become comfortable on the Linux command line. Covers files, permissions, processes, networking tools and Bash scripting for everyday automation.',
    learn: ['Navigate and manage files from the terminal', 'Understand users, groups and permissions', 'Monitor processes and services', 'Use grep, sed and awk on text', 'Write Bash scripts to automate tasks'],
    req: ['Access to a Linux machine, WSL or a Mac terminal'],
    tags: ['Linux', 'Bash', 'ShellScripting', 'CommandLine'],
    sections: [
      ['The command line', ['The file system|12', 'Working with files|14', 'Permissions|13']],
      ['System tools', ['Processes and services|14', 'Networking commands|13', 'grep, sed and awk|17']],
      ['Bash scripting', ['Variables and conditions|14', 'Loops and functions|15', 'Project: a backup script|18']],
    ],
  },
  // ---------- Cloud Computing ----------
  {
    name: 'Azure Fundamentals (AZ-900 Prep)', cat: 'Cloud Computing', by: 'rohan', price: 1499,
    desc: 'Prepare for the Microsoft AZ-900 exam and learn Azure core services, pricing, security and governance, with practice questions after each module.',
    learn: ['Explain cloud concepts and service models', 'Describe Azure compute, storage and networking services', 'Understand identity, security and governance in Azure', 'Estimate costs and choose pricing options', 'Approach the AZ-900 exam with confidence'],
    req: ['No prior cloud experience needed'],
    tags: ['Azure', 'AZ900', 'CloudComputing', 'Certification'],
    sections: [
      ['Cloud concepts', ['What cloud computing is|12', 'IaaS, PaaS and SaaS|13']],
      ['Azure services', ['Compute services|16', 'Storage services|15', 'Networking|15']],
      ['Security and cost', ['Identity and access|14', 'Governance and compliance|13', 'Pricing and cost management|14', 'Exam tips and practice|20']],
    ],
  },
  // ---------- Data Science ----------
  {
    name: 'Python for Data Analysis', cat: 'Data Science', by: 'farah', price: 1999,
    desc: 'Analyse real datasets with Python, pandas and Matplotlib. Learn to clean, explore and visualise data and present what you find.',
    learn: ['Use Python and Jupyter for analysis', 'Load, clean and reshape data with pandas', 'Group, aggregate and join datasets', 'Visualise data with Matplotlib and Seaborn', 'Present findings from an end-to-end analysis'],
    req: ['Basic Python (variables, loops, functions)'],
    tags: ['Python', 'Pandas', 'DataAnalysis', 'Matplotlib', 'DataScience'],
    sections: [
      ['Setup', ['Jupyter notebooks|10', 'NumPy essentials|15']],
      ['pandas', ['Series and DataFrames|16', 'Cleaning messy data|19', 'Grouping and aggregation|17', 'Merging datasets|15']],
      ['Visualisation', ['Charts with Matplotlib|16', 'Statistical plots with Seaborn|15']],
      ['Project', ['Exploring a sales dataset|24', 'Presenting your findings|14']],
    ],
  },
  {
    name: 'SQL for Data Analysts', cat: 'Data Science', by: 'farah', price: 1299,
    desc: 'Write SQL queries to answer business questions. Starts from SELECT and finishes with joins, window functions and a full analysis case study.',
    learn: ['Filter, sort and aggregate data with SQL', 'Combine tables with joins', 'Use subqueries and CTEs', 'Apply window functions for rankings and running totals', 'Answer business questions from raw tables'],
    req: ['No prior SQL needed'],
    tags: ['SQL', 'PostgreSQL', 'DataAnalysis', 'Analytics'],
    sections: [
      ['Querying', ['SELECT and WHERE|13', 'Sorting and limiting|10', 'Aggregates and GROUP BY|16']],
      ['Combining data', ['Inner and outer joins|18', 'Subqueries|14', 'Common table expressions|14']],
      ['Advanced', ['Window functions|19', 'Case study: an e-commerce database|25']],
    ],
  },
  {
    name: 'Statistics for Data Science', cat: 'Data Science', by: 'farah', price: 1499,
    desc: 'The statistics behind data science, explained with Python examples: distributions, sampling, hypothesis testing, A/B tests and regression.',
    learn: ['Describe data with summary statistics', 'Work with probability distributions', 'Run and interpret hypothesis tests', 'Design and analyse A/B tests', 'Fit and read linear regression models'],
    req: ['Basic Python', 'School-level maths'],
    tags: ['Statistics', 'Probability', 'ABTesting', 'DataScience'],
    sections: [
      ['Describing data', ['Mean, median and spread|14', 'Distributions|16']],
      ['Inference', ['Sampling and the central limit theorem|17', 'Confidence intervals|15', 'Hypothesis testing|18']],
      ['Applied', ['A/B testing|19', 'Linear regression|20']],
    ],
  },
  // ---------- Machine Learning ----------
  {
    name: 'Practical NLP with Python', cat: 'Machine Learning', by: 'farah', price: 3499,
    desc: 'Work with text data using Python. Covers text cleaning, classic models, embeddings and transformers, and ends with a sentiment-analysis project.',
    learn: ['Clean and tokenise text', 'Build text classifiers with scikit-learn', 'Use word embeddings', 'Fine-tune a transformer model', 'Evaluate NLP models properly'],
    req: ['Python and pandas basics', 'Some machine learning background helps'],
    tags: ['NLP', 'Python', 'Transformers', 'MachineLearning'],
    sections: [
      ['Text basics', ['Working with text data|13', 'Tokenisation and cleaning|15', 'Bag of words and TF-IDF|16']],
      ['Models', ['Text classification|18', 'Word embeddings|17', 'Transformers explained|19']],
      ['Project', ['Fine-tuning for sentiment analysis|24', 'Evaluating and improving the model|16']],
    ],
  },
  // ---------- UI UX ----------
  {
    name: 'Figma from Basics to Prototypes', cat: 'UI UX', by: 'sneha', price: 1499,
    desc: 'Learn Figma from the first frame to an interactive prototype. Covers layout, auto layout, components and prototyping while you design a mobile app.',
    learn: ['Navigate Figma and organise files', 'Build responsive designs with auto layout', 'Create reusable components and variants', 'Make interactive prototypes', 'Hand off designs to developers'],
    req: ['A free Figma account'],
    tags: ['Figma', 'UIDesign', 'Prototyping', 'UIUX'],
    sections: [
      ['Figma basics', ['The Figma interface|11', 'Frames, shapes and text|14']],
      ['Building screens', ['Auto layout|18', 'Components and variants|19', 'Styles and colour|13']],
      ['Prototyping', ['Interactions and flows|16', 'Smart animate|12', 'Developer handoff|12']],
    ],
  },
  {
    name: 'Design Systems for Product Teams', cat: 'UI UX', by: 'sneha', price: 2499,
    desc: 'Plan, build and maintain a design system that designers and developers both use, from tokens and components to documentation and governance.',
    learn: ['Audit an existing product interface', 'Define design tokens for colour, type and spacing', 'Build an accessible component library', 'Document components for designers and developers', 'Run a design system as an ongoing product'],
    req: ['Comfortable with Figma'],
    tags: ['DesignSystems', 'Figma', 'Accessibility', 'UIUX'],
    sections: [
      ['Foundations', ['What a design system is|12', 'Auditing an interface|15']],
      ['Building', ['Design tokens|17', 'Core components|19', 'Accessibility in components|16']],
      ['Running it', ['Documentation|14', 'Working with developers|15', 'Governance and versioning|13']],
    ],
  },
  // ---------- Cybersecurity ----------
  {
    name: 'Web Application Security Essentials', cat: 'Cybersecurity', by: 'aditya', price: 2999,
    desc: 'A defensive guide to the OWASP Top 10 for developers. Learn how common vulnerabilities arise and how to prevent them in your own code.',
    learn: ['Understand the OWASP Top 10 risks', 'Prevent injection and cross-site scripting', 'Build secure authentication and sessions', 'Protect APIs with proper access control', 'Add security checks to code review and CI'],
    req: ['Experience building web applications'],
    tags: ['WebSecurity', 'OWASP', 'SecureCoding', 'CyberSecurity'],
    sections: [
      ['Foundations', ['Threat modelling for developers|14', 'The OWASP Top 10|16']],
      ['Common vulnerabilities', ['Injection and how to prevent it|18', 'Cross-site scripting|17', 'CSRF and CORS|15']],
      ['Secure design', ['Authentication and sessions|18', 'Access control in APIs|16', 'Security headers|12', 'Security in CI|13']],
    ],
  },
  {
    name: 'Network Security Fundamentals', cat: 'Cybersecurity', by: 'aditya', price: 1999,
    desc: 'Understand how networks work and how they are protected: TCP/IP, firewalls, VPNs, TLS and monitoring, with hands-on labs in a safe environment.',
    learn: ['Explain the TCP/IP model and common protocols', 'Configure firewalls and network segmentation', 'Understand VPNs and TLS', 'Monitor traffic with Wireshark', 'Respond to common network threats'],
    req: ['Basic computer networking knowledge helps'],
    tags: ['NetworkSecurity', 'Firewalls', 'TLS', 'CyberSecurity'],
    sections: [
      ['Networking refresher', ['The TCP/IP model|15', 'DNS and HTTP|13']],
      ['Defences', ['Firewalls and segmentation|17', 'VPNs|14', 'TLS and certificates|16']],
      ['Monitoring', ['Packet analysis with Wireshark|19', 'Intrusion detection|15', 'Incident response basics|14']],
    ],
  },
];

// Demo students: first names, last names and the interests that decide their enrolments
const studentNames = [
  ['Ananya', 'Sharma'], ['Rahul', 'Verma'], ['Priya', 'Nair'], ['Karthik', 'Subramanian'], ['Ishita', 'Gupta'],
  ['Vivek', 'Patel'], ['Divya', 'Menon'], ['Aman', 'Singh'], ['Pooja', 'Kulkarni'], ['Siddharth', 'Joshi'],
  ['Neha', 'Agarwal'], ['Harsh', 'Malhotra'], ['Lakshmi', 'Raman'], ['Yash', 'Thakur'], ['Riya', 'Chatterjee'],
  ['Abhishek', 'Das'], ['Shreya', 'Bhat'], ['Manish', 'Yadav'], ['Tanvi', 'Deshpande'], ['Varun', 'Kapoor'],
  ['Aditi', 'Mishra'], ['Gaurav', 'Saxena'], ['Nandini', 'Hegde'], ['Pranav', 'Kumar'], ['Sakshi', 'Jain'],
  ['Akash', 'Pandey'], ['Meghna', 'Ghosh'], ['Rohit', 'Chauhan'], ['Swati', 'Rao'], ['Deepak', 'Naidu'],
  ['Kriti', 'Arora'], ['Sahil', 'Bhatia'], ['Anjali', 'Pillai'], ['Tarun', 'Reddy'], ['Bhavya', 'Shetty'],
  ['Kunal', 'Sethi'],
];

// Each student follows one track; enrolments come from the track's courses in order
const tracks = [
  ['JavaScript from Scratch', 'Modern CSS and Responsive Layouts', 'Node.js and Express: Build REST APIs', 'Next.js for Production'],
  ['DSA in C++: Zero to Interview Ready', 'Dynamic Programming Masterclass', 'System Design for Beginners'],
  ['Java DSA Bootcamp', 'Dynamic Programming Masterclass'],
  ['Python for Data Analysis', 'SQL for Data Analysts', 'Statistics for Data Science', 'Practical NLP with Python'],
  ['Linux and Shell Scripting for Developers', 'Docker and Kubernetes Hands-On', 'CI/CD with GitHub Actions', 'Azure Fundamentals (AZ-900 Prep)'],
  ['React Native: Build Cross-Platform Apps', 'Flutter and Dart Essentials'],
  ['Android with Kotlin and Jetpack Compose'],
  ['Figma from Basics to Prototypes', 'Design Systems for Product Teams'],
  ['Web Application Security Essentials', 'Network Security Fundamentals'],
  ['JavaScript from Scratch', 'TypeScript for JavaScript Developers', 'Node.js and Express: Build REST APIs'],
];

const paths = [
  { title: 'Full-Stack Web Developer', slug: 'full-stack-web-developer', level: 'Beginner', summary: 'Go from your first line of JavaScript to deploying full-stack apps with React, Node.js and Next.js.', courses: ['JavaScript from Scratch', 'Modern CSS and Responsive Layouts', 'Node.js and Express: Build REST APIs', 'Next.js for Production'] },
  { title: 'Crack the Coding Interview', slug: 'crack-the-coding-interview', level: 'Intermediate', summary: 'Data structures, algorithms, dynamic programming and system design for product-company interviews.', courses: ['DSA in C++: Zero to Interview Ready', 'Dynamic Programming Masterclass', 'System Design for Beginners'] },
  { title: 'Data Analyst', slug: 'data-analyst', level: 'Beginner', summary: 'Learn SQL, Python and statistics to turn raw data into clear answers.', courses: ['SQL for Data Analysts', 'Python for Data Analysis', 'Statistics for Data Science'] },
  { title: 'DevOps Engineer', slug: 'devops-engineer', level: 'Intermediate', summary: 'Linux, containers, Kubernetes and CI/CD: everything needed to ship and run software reliably.', courses: ['Linux and Shell Scripting for Developers', 'Docker and Kubernetes Hands-On', 'CI/CD with GitHub Actions'] },
  { title: 'Mobile App Developer', slug: 'mobile-app-developer', level: 'Beginner', summary: 'Build and publish apps for Android and iOS with native and cross-platform tools.', courses: ['React Native: Build Cross-Platform Apps', 'Android with Kotlin and Jetpack Compose', 'Flutter and Dart Essentials'] },
];

module.exports = { DOMAIN, instructors, categories, courses, studentNames, tracks, paths };
