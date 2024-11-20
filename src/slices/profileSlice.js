// import { createSlice } from "@reduxjs/toolkit";

// const initialState={
//     user:localStorage.getItem('user')? JSON.parse(localStorage.getItem("user")) : null,
//     loading:false
// }
// const profileSlice=createSlice({
//     name:'profile',
//     initialState,
//     reducers:{
//         setUser:(state,action)=>{
//             state.user=action.user;
//             },
//         setLoading:(state,payload)=>{
//             state.loading=payload;
//         }
//     }
// });
// export const {setUser,setLoading}=profileSlice.actions;
// export default profileSlice.reducer;
import {createSlice} from "@reduxjs/toolkit"

const initialState = {
    user:localStorage.getItem('user')? JSON.parse(localStorage.getItem("user")) : null,
    loading:false
};

const profileSlice = createSlice({
    name:"profile",
    initialState: initialState,
    reducers: {
        setUser(state, value) {
            state.user = value.payload;
        },
        setLoading(state,value){
            state.loading=value.payload
        }
    },
});

export const {setUser} = profileSlice.actions;
export default profileSlice.reducer;