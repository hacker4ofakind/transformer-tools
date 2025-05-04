import { useState, useEffect } from 'react'
import './index.css'
import './components'
import NumInput from './components'

async function saveGpusToDatabase(gpus: number) {
    try {
      if(gpus !== 0) {
        await fetch('http://localhost:8000/items/gpus', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({  
            name: `gpus`,
            value: gpus
          }),
        });
        console.log('Gpus saved to database successfully');
      }
    } catch (error) {
      console.error('Error saving gpus to database:', error);
    }
  }

async function saveTflopsToDatabase(tflops: number) {
    try {
      if(tflops !== 0) {
        await fetch('http://localhost:8000/items/tflops', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `tflops`,
            value: tflops
          }),
        });
        console.log('Tflops saved to database successfully');
      }
    } catch (error) {
      console.error('Error saving tflops to database:', error);
    }
  }

async function saveTokensToDatabase(tokens: number) {
    try {
      if(tokens !== 0) {
        await fetch('http://localhost:8000/items/tokens', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `tokens`,
            value: tokens
          }),
        });
        console.log('Tokens saved to database successfully');
      }
    } catch (error) {
      console.error('Error saving tokens to database:', error);
    }
  }

function TrainingTime(){
  const [isLoading, setIsLoading] = useState(true);
// Define types for your parameters
type ParamKeys = 'gpus' | 'tflops' | 'total' | 'tokens';

// Update the params state type definition
const [params, setParams] = useState<Record<ParamKeys, number>>({
  gpus: 0,
  tflops: 0,
  total: 0,
  tokens: 0
});

const [results, setResults] = useState<{ days: number }>({ days: 0 });


useEffect(() => {
  const fetchInitialParams = async () => {
    try {
      // Type-safe array of parameter names
      const paramNames: ParamKeys[] = ['gpus', 'tflops', 'total', 'tokens'];
      const newParams = {...params};
      
      for (const name of paramNames) {
        try {
          const response = await fetch(`http://localhost:8000/items/${name}`);
          if (response.ok) {
            const data = await response.json();
            // Now TypeScript knows this is a valid key
            newParams[name] = data.value;
          }
        } catch (err) {
          console.error(`Error fetching ${name} from database:`, err);
        }
      }
      
      setParams(newParams);
      setIsLoading(false);
      console.log("Loaded parameters from database:", newParams);
    } catch (error) {
      console.error("Error loading parameters from database:", error);
      setIsLoading(false);
    }
  };

  fetchInitialParams();
}, []);

  // Calculate results when parameters change
  useEffect(() => {
    if (isLoading) return; // Skip calculations during initial load
    
    console.log("Parameters updated:", params);
    
    // Calculate days
    const days = 8 * params.total * params.tokens / (params.gpus * params.tflops) / 86400;
    console.log("Calculated results:", { days });

    setResults({ days });
  }, [params, isLoading]);

  // Create a separate effect for saving to database
  const [shouldSave, setShouldSave] = useState(false);
  
  useEffect(() => {
    if (isLoading || !shouldSave) return;
    
    // Only save after user changes, not on initial load
    if(params.gpus !== 0) saveGpusToDatabase(params.gpus);
    if(params.tflops !== 0) saveTflopsToDatabase(params.tflops);
    if(params.tokens !== 0) saveTokensToDatabase(params.tokens);
    
    setShouldSave(false);
  }, [shouldSave, params, isLoading]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const numValue = value === '' ? 0 : Number(value)
    
    console.log(`Changing ${name} to ${numValue}`);
    
    setParams(prev => ({
      ...prev,
      [name]: numValue
    }));
    
    setShouldSave(true);
  }

  const formatNumber = (num: number) => {
    return num<=30 ? new Intl.NumberFormat().format(num) : new Intl.NumberFormat().format(num/30)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center">
      <div className="min-w-[900px] mx-auto bg-white rounded-2xl shadow-md overflow-hidden md:max-w-2xl p-5">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">Training Time Calculator</h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div>
            <label htmlFor="gpus" className="block text-sm font-medium text-gray-700">GPUs</label>
            <NumInput onChange={handleChange} value={params.gpus} name="gpus" />
          </div>
          
          <div>
            <label htmlFor="tflops" className="block text-sm font-medium text-gray-700">TFLOPs per GPU</label>
            <NumInput onChange={handleChange} value={params.tflops} name="tflops" />
          </div>
          <div>
            <label htmlFor="total" className="block text-sm font-medium text-gray-700">Parameters</label>
            <NumInput onChange={handleChange} value={params.total} name="total" />
          </div>
          
          <div>
            <label htmlFor="tokens" className="block text-sm font-medium text-gray-700">Tokens</label>
            <NumInput onChange={handleChange} value={params.tokens} name="tokens" />
          </div>
        </div>
        
        <div className="max-h-[140px] bg-linear-to-b from-gray-50 to-gray-200 p-4 rounded-xl flex flex-col gap-2 justify-center items-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Results</h2>
            <div className="bg-linear-60 from-indigo-100 to-blue-500 px-6 py-3 rounded-2xl max-w-[600px]">
              {results.days <=30 ? <p className="text-sm font-medium text-indigo-800">Days</p>
              : <p className="text-sm font-medium text-indigo-800">Months</p>}
              <p className="text-xl font-bold text-indigo-900">{formatNumber(results.days)}</p>
            </div>
        </div>
      </div>
    </div>
  )
}
export default TrainingTime