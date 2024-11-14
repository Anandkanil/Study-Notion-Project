const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    // Retrieve token from headers
    const authHeader = req.headers['authorization'];
    // const token = authHeader && authHeader.split(' ')[1]; // Extract token if Bearer format
    const token = req.cookies.token || req.body.token || req.headers['authorization'].split(' ')[1];  // Extract token if Bearer format

    // Check if token is present
    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach user information to request object
        req.user = decoded;
        
        // Call the next middleware or route handler
        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
    }
}

// Middleware to check if the user is authenticated and authorized as a student
function checkStudentAuthorization(req, res, next) {
    // Check if the user is authenticated
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Check if the user has a student role
    if (req.user.accountType !== 'Student') {
        return res.status(403).json({ success: false, message: 'Access denied. Student authorization required.' });
    }

    // User is authorized as a student, proceed to the next middleware or route handler
    next();
}

// Middleware to check if the user is authenticated and authorized as an instructor
function checkInstructorAuthorization(req, res, next) {
    // Check if the user is authenticated
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Check if the user has an instructor role
    if (req.user.accountType !== 'Instructor') {
        return res.status(403).json({ success: false, message: 'Access denied. Instructor authorization required.' });
    }

    // User is authorized as an instructor, proceed to the next middleware or route handler
    next();
}

// Middleware to check if the user is authenticated and authorized as an admin
function checkAdminAuthorization(req, res, next) {
    // Check if the user is authenticated
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Check if the user has an instructor role
    if (req.user.accountType !== 'Admin') {
        return res.status(403).json({ success: false, message: 'Access denied. Admin authorization required.' });
    }

    // User is authorized as an instructor, proceed to the next middleware or route handler
    next();
}

// module.exports = {checkAdminAuthorization, checkInstructorAuthorization, checkStudentAuthorization, authenticateToken};
module.exports = {
    auth: authenticateToken,  // renamed from authenticateToken
    isInstructor: checkInstructorAuthorization,  // renamed from checkInstructorAuthorization
    isStudent: checkStudentAuthorization,  // renamed from checkStudentAuthorization
    isAdmin: checkAdminAuthorization,  // renamed from checkAdminAuthorization
};