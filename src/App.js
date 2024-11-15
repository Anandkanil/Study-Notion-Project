import { Route, Routes } from "react-router-dom";
import "./App.css";
import Home from './pages/Home';
import Navbar from "./components/common/Navbar";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { useState } from "react";

function App() {
  const [isLoggedIn,setIsLoggedIn]=useState(false);
  return (
    <div className="w-screen min-h-screen bg-richblack-900 flex flex-col font-inter">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />}></Route>
          <Route path='/login' element={<Login setIsLoggedIn={setIsLoggedIn} />}></Route>
          <Route path='/signup' element={<Signup setIsLoggedIn={setIsLoggedIn} />}></Route>
        </Routes>
    </div>
  );
}

export default App;
