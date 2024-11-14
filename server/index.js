const express=require('express');
const app=express();

const courseRoute=require('./routes/Course');
const paymentRoute=require('./routes/Payments');
const profileRoute=require('./routes/Profile');
const userRoute=require('./routes/User');

const connectDB=require('./config/database');
const cookieParser=require('cookie-parser');
const cors=require('cors');
const {cloudinaryConnect}=require('./config/cloudinary');
const fileUpload=require('express-fileupload');
const dotenv=require('dotenv');
dotenv.config();

app.use((req,res,next)=>{
    console.log(`A ${req.method} response came with for the URL : ${req.url}`);
    next();
})

const PORT=process.env.PORT || 4000;

connectDB();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: ['http://localhost:3000'],
    credentials:true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

app.use(fileUpload({useTempFiles:true,tempFileDir:"/temp"}))

cloudinaryConnect();

app.use('/api/v1/auth',userRoute);
app.use('/api/v1/profile',profileRoute);
app.use('/api/v1/course',courseRoute);
app.use('/api/v1/payment',paymentRoute);

app.get('/',(req,res)=>{res.send(`<h1>Welcomr to Study Notion Home page</h1>`)});

app.listen(PORT,()=>console.log(`Application is up and running at ${PORT}`))