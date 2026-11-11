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
const {cloudinaryConnect}=require('./config/cloudinary');
const fileUpload=require('express-fileupload');
const dotenv=require('dotenv');
dotenv.config();


const PORT=process.env.PORT || 4000;

connectDB();

app.use(express.json());
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
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

app.use(fileUpload({useTempFiles:true,tempFileDir:"/temp"}))

cloudinaryConnect();

app.use('/api/v1/auth',userRoute);
app.use('/api/v1/profile',profileRoute);
app.use('/api/v1/course',courseRoute);
app.use('/api/v1/payment',paymentRoute);
app.use('/api/v1/reach',contactRoute);

app.get('/',(req,res)=>{res.send(`<h1>Welcome to the StudyNotion API</h1>`)});

// Lightweight health check, used by the keep-awake ping and for monitoring.
app.get('/api/v1/health',(req,res)=>{
  const dbStates=['disconnected','connected','connecting','disconnecting'];
  res.set('Cache-Control','no-store').json({ok:true,uptimeSeconds:Math.round(process.uptime()),database:dbStates[mongoose.connection.readyState]||'unknown'});
});

app.listen(PORT,()=>console.log(`Application is up and running at ${PORT}`))