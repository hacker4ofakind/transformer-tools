import { useState, useEffect } from 'react'
import './index.css'
import './components'
import NumInput from './components'

async function saveParametersToDatabase(results: {total: number, inference: number, keyQuerySpace: number}, parameters: {vocabSize: number, embeddingDim: number, attentionHeads: number, neurons: number, experts: number, layers: number}) {
  try {
    if(parameters.vocabSize !== 0 && parameters.embeddingDim !== 0 && parameters.attentionHeads !== 0 && parameters.neurons !== 0 && parameters.experts !== 0 && parameters.layers !== 0) {
    // Save total
    await fetch('http://localhost:8000/items/total', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({  
        name: `total`,
        value: results.total
      }),
    });

    // Save parameters
    await fetch('http://localhost:8000/items/vocabSize', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `vocabSize`,
        value: parameters.vocabSize
      }),
    });
    
    await fetch('http://localhost:8000/items/embeddingDim', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `embeddingDim`,
        value: parameters.embeddingDim
      }),
    });
    
    await fetch('http://localhost:8000/items/attentionHeads', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `attentionHeads`,
        value: parameters.attentionHeads
      }),
    });
    
    await fetch('http://localhost:8000/items/neurons', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `neurons`,
        value: parameters.neurons
      }),
    });
    
    await fetch('http://localhost:8000/items/experts', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `experts`,
        value: parameters.experts
      }),
    });
    
    await fetch('http://localhost:8000/items/layers', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `layers`,
        value: parameters.layers
      }),
    });
    
    console.log('Parameters saved to database successfully');
  }
  } catch (error) {
    console.error('Error saving parameters to database:', error);
  }
}

function Home() {
  const [isLoading, setIsLoading] = useState(true);
  // Define types for your parameters
type ParameterKeys = 'vocabSize' | 'embeddingDim' | 'attentionHeads' | 'neurons' | 'experts' | 'layers';

// Update the parameters state type definition
const [parameters, setParameters] = useState<Record<ParameterKeys, number>>({
  vocabSize: 0,
  embeddingDim: 0,
  attentionHeads: 0,
  neurons: 0,
  experts: 0,
  layers: 0,
});

const [results, setResults] = useState<{
  embedding: number
  attention: number
  layerNorm: number
  gating: number
  moe: number
  expert: number
  total: number
  inference: number
  keyQuerySpace: number
}>({
  embedding: 0,
  attention: 0,
  layerNorm: 0,
  gating: 0,
  moe: 0,
  expert: 0,
  total: 0,
  inference: 0,
  keyQuerySpace: 0,
});

useEffect(() => {
  const fetchInitialParams = async () => {
    try {
      // Type-safe array of parameter names
      const paramNames: ParameterKeys[] = ['vocabSize', 'embeddingDim', 'attentionHeads', 'neurons', 'experts', 'layers'];
      const loadedParams = {...parameters};
      
      for (const name of paramNames) {
        try {
          const response = await fetch(`http://localhost:8000/items/${name}`);
          if (response.ok) {
            const data = await response.json();
            // Now TypeScript knows this is a valid key
            loadedParams[name] = data.value;
          }
        } catch (err) {
          console.error(`Error fetching ${name} from database:`, err);
        }
      }
      
      setParameters(loadedParams);
      setIsLoading(false);
      console.log("Loaded parameters from database:", loadedParams);
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
    
    console.log("Parameters updated:", parameters);
    
    // Calculate embedding parameters
    const embedding = parameters.vocabSize * parameters.embeddingDim * 2;
    
    // Calculate attention parameters
    // For multi-head attention, we have:
    // - 4 matrices (Q,K,V,O) each of size embeddingDim × embeddingDim for each layer
    const attention = parameters.layers * (4 * parameters.embeddingDim * parameters.embeddingDim)

    // Calculate layer norm parameters (Pre-LN)
    const layerNorm = 2 * parameters.embeddingDim * parameters.layers;
    
    // Calculate gating parameters
    const gating = parameters.embeddingDim * parameters.experts * parameters.layers;
    
    // Calculate MoE FFN parameters (all experts)
    const moe = (parameters.embeddingDim * parameters.neurons + parameters.neurons + parameters.neurons * parameters.embeddingDim + parameters.embeddingDim) * parameters.experts * parameters.layers;
    
    // Calculate parameters for a single expert (for inference)
    const expert = (parameters.embeddingDim * parameters.neurons + parameters.neurons + parameters.neurons * parameters.embeddingDim + parameters.embeddingDim) * parameters.layers;
    
    // Calculate the Key-Query space dimension
    const keyQuerySpace = parameters.embeddingDim / parameters.attentionHeads;

    // Total parameters for training
    const total = embedding + attention + layerNorm + gating + moe;
    
    // Total parameters for inference (assuming 1 expert per layer)
    const inference = embedding + attention + layerNorm + gating + expert;

    const newResults = {
      embedding,
      attention,
      layerNorm,
      gating,
      moe,
      expert,
      total,
      inference,
      keyQuerySpace,
    };

    console.log("Calculated results:", newResults);
    setResults(newResults);
    
  }, [parameters, isLoading]); 
  
  // Create a separate effect for saving to database
  const [shouldSave, setShouldSave] = useState(false);
  
  useEffect(() => {
    if (isLoading || !shouldSave) return;
    
    // Only save after user changes, not on initial load
    saveParametersToDatabase(results, parameters);
    setShouldSave(false);
  }, [shouldSave, results, parameters, isLoading]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const numValue = value === '' ? 0 : Number(value)
    
    console.log(`Changing ${name} to ${numValue}`);
    
    setParameters(prev => ({
      ...prev,
      [name]: numValue
    }));
    
    setShouldSave(true);
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center">
      <div className="min-w-[1000px] mx-auto bg-white rounded-2xl shadow-md overflow-hidden md:max-w-2xl p-5">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">MoE Transformer Parameters Calculator</h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div>
            <label htmlFor="vocabSize" className="block text-sm font-medium text-gray-700">Vocab Size</label>
            <NumInput onChange={handleChange} value={parameters.vocabSize} name="vocabSize" />
          </div>
          
          <div>
            <label htmlFor="embeddingDim" className="block text-sm font-medium text-gray-700">Embedding Dimension</label>
            <NumInput onChange={handleChange} value={parameters.embeddingDim} name="embeddingDim" />
          </div>
          <div>
            <label htmlFor="attentionHeads" className="block text-sm font-medium text-gray-700">Attention Heads</label>
            <NumInput onChange={handleChange} value={parameters.attentionHeads} name="attentionHeads" />
          </div>
          <div>
            <label htmlFor="neurons" className="block text-sm font-medium text-gray-700">Neurons</label>
            <NumInput onChange={handleChange} value={parameters.neurons} name="neurons" />
          </div>
          
          <div>
            <label htmlFor="experts" className="block text-sm font-medium text-gray-700">Experts</label>
            <NumInput onChange={handleChange} value={parameters.experts} name="experts" />
          </div>
          
          <div>
            <label htmlFor="layers" className="block text-sm font-medium text-gray-700">Layers</label>
            <NumInput onChange={handleChange} value={parameters.layers} name="layers" />
          </div>
        </div>
        
        <div className="bg-linear-to-b from-gray-50 to-gray-200 p-4 rounded-xl flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Results</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-linear-60 from-indigo-100 to-blue-500 px-6 py-3 rounded-2xl">
              <p className="text-sm font-medium text-indigo-800">Total Parameters</p>
              <p className="text-xl font-bold text-indigo-900">{formatNumber(results.total)}</p>
            </div>
            
            <div className="bg-linear-120 to-green-100 from-lime-500 px-6 py-3 rounded-2xl">
              <p className="text-sm font-medium text-green-800">Inference Parameters</p>
              <p className="text-xl font-bold text-green-900">{formatNumber(results.inference)}</p>
            </div>
          
            <div className="bg-linear-to-r from-purple-200 to-fuchsia-400 px-6 py-3 rounded-2xl">
              <p className="text-sm font-medium text-purple-900">Key Query Space</p>
              <p className="text-xl font-bold text-purple-900">{formatNumber(results.keyQuerySpace)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home