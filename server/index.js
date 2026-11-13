const express=require('express');
const app=express();

const courseRoute=require('./routes/Course');
const paymentRoute=require('./routes/Payments');
const profileRoute=require('./routes/Profile');
const userRoute=require('./routes/User');
const contactRoute=require('./routes/Contact');

const connectDB=require('./config/database');
const mongoose=require('mongoose');
const cookieParser=require('cookie-parser');
const cors=require('cors');
const {securityHeaders,sanitizeInput}=require('./middlewares/security');
const {rateLimit}=require('./middlewares/rateLimit');
const {alertOnServerErrors,watchProcess}=require('./utils/alerts');
const {cloudinaryConnect}=require('./config/cloudinary');
const fileUpload=require('express-fileupload');
const os=require('os');
const path=require('path');
const {backfillPurchases}=require('./utils/backfillPurchases');
const dotenv=require('dotenv');
dotenv.config();


const PORT=process.env.PORT || 4000;

connectDB().then(()=>{
  // Rebuild receipts for orders paid before purchases were recorded (idempotent)
  setTimeout(()=>backfillPurchases(),5000);
});

// Render sits behind one proxy: trust it so req.ip is the visitor's address
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(securityHeaders);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
// Allowed front ends: the live site, its Netlify deploy previews, local dev,
// plus any extra comma-separated origins in CORS_ORIGINS.
const ALLOWED_ORIGINS = [
    'https://studynotion-project-1.netlify.app',
    ...(process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean),
];
const PREVIEW_ORIGIN = /^https:\/\/deploy-preview-\d+--studynotion-project-1\.netlify\.app$/;
const LOCAL_ORIGIN = /^http:\/\/localhost:(3000|5173)$/;
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin) || PREVIEW_ORIGIN.test(origin) || LOCAL_ORIGIN.test(origin)) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    credentials:true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// Uploads go to the system temp folder (always writable; "/temp" isn't on Render)
// and are capped at 500 MB for lesson videos. Images are checked per route.
app.use(fileUpload({
  useTempFiles:true,
  tempFileDir:path.join(os.tmpdir(),'studynotion-uploads'),
  createParentPath:true,
  limits:{fileSize:500*1024*1024},
  abortOnLimit:true,
  responseOnLimit:JSON.stringify({success:false,message:'That file is too large. The limit is 500 MB.'}),
}))
app.use(sanitizeInput);
// Email ALERT_EMAIL when something breaks (throttled)
app.use(alertOnServerErrors);
watchProcess();
// Backstop for any single address hammering the API
app.use('/api', rateLimit({ name: 'api', windowMs: 60 * 1000, max: 300 }));

cloudinaryConnect();

app.use('/api/v1/auth',userRoute);
app.use('/api/v1/profile',profileRoute);
app.use('/api/v1/course',courseRoute);
app.use('/api/v1/payment',paymentRoute);
app.use('/api/v1/reach',contactRoute);
app.use('/api/v1/admin',require('./routes/Admin'));
app.use('/api/v1/instructor',require('./routes/Instructor'));
app.use('/api/v1/learn',require('./routes/Learn'));
app.use('/api/v1/notifications',require('./routes/Notifications'));

app.get('/',(req,res)=>{res.send(`<h1>Welcome to the StudyNotion API</h1>`)});

// Lightweight health check, used by the keep-awake ping and for monitoring.
app.get('/api/v1/health',(req,res)=>{
  const dbStates=['disconnected','connected','connecting','disconnecting'];
  res.set('Cache-Control','no-store').json({ok:true,uptimeSeconds:Math.round(process.uptime()),database:dbStates[mongoose.connection.readyState]||'unknown'});
});

app.listen(PORT,()=>console.log(`Application is up and running at ${PORT}`))