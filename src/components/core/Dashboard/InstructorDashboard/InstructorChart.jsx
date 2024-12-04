import { useState } from "react"
import { Chart, registerables } from "chart.js"
import { Pie } from "react-chartjs-2"
Chart.register(...registerables)

const InstructorChart = ({ courses }) => {
    const [currentChart,setCurrentChart]=useState("students");
    //function to generate random color
    function getRandomChartColors(colorsCount){
        const colors=[];
        for(let i=0;i<colorsCount;i++){
            const color=`rgba(${Math.floor(Math.random()*256)}, ${Math.floor(Math.random()*256)},${Math.floor(Math.random()*256)})`
            colors.push(color);
        }
        return colors;
    }

    //Chart Data for Students
    const chartDataStudents = {
        labels: courses.map((course) => course.courseName),
        datasets: [
          {
            data: courses.map((course) => course.totalStudentsEnrolled),
            backgroundColor: getRandomChartColors(courses.length),
          },
        ],
      }

    //Chart Data for Income
    const chartIncomeData = {
        labels: courses.map((course) => course.courseName),
        datasets: [
          {
            data: courses.map((course) => course.totalAmountGenerated),
            backgroundColor: getRandomChartColors(courses.length),
          },
        ],
      }

      // Options for the chart
  const options = {
    maintainAspectRatio: false,
  }


  return (
    <div className="flex flex-1 flex-col gap-y-4 rounded-md bg-richblack-800 p-6">
      <p className="text-lg font-bold text-richblack-5">Visualize</p>
      <div className="space-x-4 font-semibold">
        {/* Button to switch to the "students" chart */}
        <button
          onClick={() => setCurrentChart("students")}
          className={`rounded-sm p-1 px-3 transition-all duration-200 ${
            currentChart === "students"
              ? "bg-richblack-700 text-yellow-50"
              : "text-yellow-400"
          }`}
        >
          Students
        </button>
        {/* Button to switch to the "income" chart */}
        <button
          onClick={() => setCurrentChart("income")}
          className={`rounded-sm p-1 px-3 transition-all duration-200 ${
            currentChart === "income"
              ? "bg-richblack-700 text-yellow-50"
              : "text-yellow-400"
          }`}
        >
          Income
        </button>
      </div>
      <div className="relative mx-auto aspect-square h-[300px] w-full">
        {/* Render the Pie chart based on the selected chart */}
        <Pie
          data={currentChart === "students" ? chartDataStudents : chartIncomeData}
          options={options}
        />
      </div>
    </div>
  )
}

export default InstructorChart