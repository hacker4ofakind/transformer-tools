import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./Home";
import TrainingTime from "./TrainingTime";

function App() {
  return (
    <BrowserRouter>
      <div className="flex w-full mb-auto bg-linear-to-r from-gray-200 to-gray-400 min-h-[40px] shadow-xl">
        <Link to="/" className="mr-auto py-2 text-indigo-700">Parameter Calculator</Link>
        <h1 className="font-bold text-black py-1 text-2xl">FireGPT Calculators</h1>
        <Link to="/training-time" className="ml-auto mr-2 py-2 text-indigo-500">Training Time</Link>
      </div>
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/training-time" element={<TrainingTime />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;