import { useState, useEffect } from 'react'
import './index.css'
import './components'
import NumInput from './components'

// BF16 TFLOPS per GPU (sourced from official NVIDIA specs/datasheets)
const GPU_PRESETS: Record<string, number> = {
  'NVIDIA GB300 NVL72':     2500,   // ~2.5 PFLOPS BF16 per GPU (GB300 NVL72 rack = ~1.1 ExaFLOP FP4, BF16 ~180 PFLOPS / 72)
  'NVIDIA GB200 NVL72':     2250,   // B200 per GPU BF16 ~2.25 PFLOPS
  'NVIDIA HGX B300':        2500,   // B300 chip: ~2.5 PFLOPS BF16 (dense)
  'NVIDIA HGX B200':        2250,   // B200 chip: ~2.25 PFLOPS BF16 (dense)
  'NVIDIA RTX PRO 6000 Blackwell Server': 282, // 117 TFLOPS FP32 → BF16 Tensor ~282 TFLOPS (2.4× FP32 via Tensor Cores)
  'NVIDIA HGX H200':        1979,   // ~1,979 TFLOPS BF16 (same Hopper die as H100 SXM, identical compute)
  'NVIDIA HGX H100':        1979,   // 1,979 TFLOPS FP16/BF16 SXM (official NVIDIA spec)
  'GH200 Grace Hopper':     1979,   // Same Hopper GPU die as H100 SXM
  'NVIDIA A100 PCIe (80GB)': 312,   // 312 TFLOPS BF16/FP16 (official NVIDIA Ampere spec)
  'NVIDIA L40':              362,   // 362 TFLOPS BF16 (Ada Lovelace, official spec)
  'NVIDIA L40S':             733,   // 733 TFLOPS BF16 (official NVIDIA L40S spec)
}

type GpuEntry = { model: string; quantity: number }

type ParamKeys = 'gpus' | 'tflops' | 'total' | 'tokens' | 'diffusionSteps'

async function saveToDb(key: string, value: number) {
  try {
    if (value !== 0) {
      await fetch(`/api/items/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: key, value }),
      })
    }
  } catch (e) {
    console.error(`Error saving ${key}:`, e)
  }
}

async function saveGpuInstancesToDb(instances: GpuEntry[]) {
  try {
    await fetch('/api/items/gpuInstances', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'gpuInstances', value: JSON.stringify(instances) }),
    })
  } catch (e) {
    console.error('Error saving GPU instances:', e)
  }
}

function TrainingTime() {
  const [isLoading, setIsLoading] = useState(true)
  const [modelType, setModelType] = useState<'ARM' | 'Diffusion'>('ARM')
  const [gpuInstances, setGpuInstances] = useState<GpuEntry[]>([])
  const [selectedModel, setSelectedModel] = useState<string>(Object.keys(GPU_PRESETS)[0])
  const [useGpuBuilder, setUseGpuBuilder] = useState(false)

  const [params, setParams] = useState<Record<ParamKeys, number>>({
    gpus: 0,
    tflops: 0,
    total: 0,
    tokens: 0,
    diffusionSteps: 20,
  })

  const [results, setResults] = useState<{ days: number }>({ days: 0 })

  useEffect(() => {
    const fetchInitialParams = async () => {
      try {
        const paramNames: ParamKeys[] = ['gpus', 'tflops', 'total', 'tokens', 'diffusionSteps']
        const newParams = { ...params }
        for (const name of paramNames) {
          try {
            const res = await fetch(`/api/items/${name}`)
            if (res.ok) {
              const data = await res.json()
              newParams[name] = data.value
            }
          } catch (err) {
            console.error(`Error fetching ${name}:`, err)
          }
        }

        // Load model type
        try {
          const res = await fetch('/api/items/modelType')
          if (res.ok) {
            const data = await res.json()
            if (data.value === 'Diffusion' || data.value === 'ARM') setModelType(data.value)
          }
        } catch (_) {}

        // Load GPU instances
        try {
          const res = await fetch('/api/items/gpuInstances')
          if (res.ok) {
            const data = await res.json()
            const parsed = JSON.parse(data.value)
            if (Array.isArray(parsed)) setGpuInstances(parsed)
          }
        } catch (_) {}

        setParams(newParams)
        setIsLoading(false)
      } catch (error) {
        console.error('Error loading from DB:', error)
        setIsLoading(false)
      }
    }
    fetchInitialParams()
  }, [])

  // Compute total GPUs and TFLOPs from instances
  const computedFromInstances = gpuInstances.reduce(
    (acc, entry) => {
      const tflops = GPU_PRESETS[entry.model] ?? 0
      acc.gpus += entry.quantity
      acc.totalTflops += tflops * entry.quantity
      return acc
    },
    { gpus: 0, totalTflops: 0 }
  )

  const effectiveGpus = useGpuBuilder ? computedFromInstances.gpus : params.gpus
  const effectiveTflops = useGpuBuilder
    ? (computedFromInstances.gpus > 0 ? computedFromInstances.totalTflops / computedFromInstances.gpus : 0)
    : params.tflops

  useEffect(() => {
    if (isLoading) return
    const multiplier = modelType === 'Diffusion' ? params.diffusionSteps : 1
    const days = (8 * params.total * params.tokens * multiplier) / (effectiveGpus * effectiveTflops) / 86400
    setResults({ days: isFinite(days) ? days : 0 })
  }, [params, isLoading, modelType, effectiveGpus, effectiveTflops])

  const [shouldSave, setShouldSave] = useState(false)

  useEffect(() => {
    if (isLoading || !shouldSave) return
    Object.entries(params).forEach(([k, v]) => saveToDb(k, v))
    saveToDb('modelType', modelType === 'Diffusion' ? 1 : 0)
    if (useGpuBuilder) saveGpuInstancesToDb(gpuInstances)
    setShouldSave(false)
  }, [shouldSave, params, isLoading, modelType, gpuInstances])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const numValue = value === '' ? 0 : Number(value)
    setParams(prev => ({ ...prev, [name]: numValue }))
    setShouldSave(true)
  }

  const addGpuInstance = () => {
    setGpuInstances(prev => [...prev, { model: selectedModel, quantity: 1 }])
    setShouldSave(true)
  }

  const removeGpuInstance = (index: number) => {
    setGpuInstances(prev => prev.filter((_, i) => i !== index))
    setShouldSave(true)
  }

  const updateInstanceQuantity = (index: number, quantity: number) => {
    setGpuInstances(prev => prev.map((entry, i) => i === index ? { ...entry, quantity } : entry))
    setShouldSave(true)
  }

  const formatTime = (days: number) => {
    if (days === 0) return '0 Days'
    if (days >= 365) {
      const years = Math.round((days / 365) * 2) / 2
      return `${years} Year${years !== 1 ? 's' : ''}`
    }
    if (days >= 30) {
      const months = Math.round(days / 30)
      return `${months} Month${months !== 1 ? 's' : ''}`
    }
    const weeks = Math.round(days / 7)
    if (weeks >= 1) return `${weeks} Week${weeks !== 1 ? 's' : ''}`
    const roundedDays = Math.round(days)
    return `${roundedDays} Day${roundedDays !== 1 ? 's' : ''}`
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center py-10">
      <div className="min-w-[900px] mx-auto bg-white rounded-2xl shadow-md overflow-hidden md:max-w-2xl p-5 flex flex-col gap-6">
        <h1 className="text-3xl font-bold text-center text-gray-900">Training Time Calculator</h1>

        {/* ARM / Diffusion toggle */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Model Type:</span>
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            {(['ARM', 'Diffusion'] as const).map(type => (
              <button
                key={type}
                onClick={() => { setModelType(type); setShouldSave(true) }}
                className={`px-5 py-2 text-sm font-semibold transition-colors ${
                  modelType === type
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Main inputs */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 ${modelType === 'Diffusion' ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Parameters</label>
            <NumInput onChange={handleChange} value={params.total} name="total" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Tokens</label>
            <NumInput onChange={handleChange} value={params.tokens} name="tokens" />
          </div>
          {modelType === 'Diffusion' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Diffusion Steps (per sample)</label>
              <NumInput onChange={handleChange} value={params.diffusionSteps} name="diffusionSteps" />
            </div>
          )}
        </div>

        {/* GPU section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">GPU Input:</span>
            <div className="flex rounded-xl overflow-hidden border border-gray-200">
              {[false, true].map((val) => (
                <button
                  key={String(val)}
                  onClick={() => setUseGpuBuilder(val)}
                  className={`px-5 py-2 text-sm font-semibold transition-colors ${
                    useGpuBuilder === val
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {val ? 'GPU Builder' : 'Manual'}
                </button>
              ))}
            </div>
          </div>

          {!useGpuBuilder ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">GPUs</label>
                <NumInput onChange={handleChange} value={params.gpus} name="gpus" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">TFLOPs per GPU</label>
                <NumInput onChange={handleChange} value={params.tflops} name="tflops" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 bg-gray-50 p-4 rounded-xl">
              {/* Add GPU row */}
              <div className="flex gap-3 items-center flex-wrap">
                <select
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                  className="flex-1 min-w-[260px] border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {Object.entries(GPU_PRESETS).map(([name, tflops]) => (
                    <option key={name} value={name}>{name} — {tflops >= 1000 ? `${(tflops/1000).toFixed(2)} PFLOPS` : `${tflops} TFLOPS`} BF16</option>
                  ))}
                </select>
                <button
                  onClick={addGpuInstance}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  + Add
                </button>
              </div>

              {/* Instance list */}
              {gpuInstances.length > 0 && (
                <div className="flex flex-col gap-2">
                  {gpuInstances.map((entry, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white rounded-lg px-4 py-2 border border-gray-200">
                      <span className="flex-1 text-sm text-gray-700 font-medium">{entry.model}</span>
                      <span className="text-xs text-gray-400">
                        {GPU_PRESETS[entry.model] >= 1000
                          ? `${(GPU_PRESETS[entry.model]/1000).toFixed(2)} PFLOPS`
                          : `${GPU_PRESETS[entry.model]} TFLOPS`} BF16
                      </span>
                      <input
                        type="number"
                        min={1}
                        value={entry.quantity}
                        onChange={e => updateInstanceQuantity(i, Number(e.target.value) || 1)}
                        className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      <button
                        onClick={() => removeGpuInstance(i)}
                        className="text-red-400 hover:text-red-600 text-lg font-bold leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {/* Totals row */}
                  <div className="flex items-center gap-3 bg-indigo-50 rounded-lg px-4 py-2 border border-indigo-200 text-sm font-semibold text-indigo-800">
                    <span className="flex-1">Total</span>
                    <span>{computedFromInstances.gpus} GPUs</span>
                    <span className="ml-4">
                      {computedFromInstances.totalTflops >= 1e6
                        ? `${(computedFromInstances.totalTflops / 1e6).toFixed(2)} ExaFLOPS`
                        : computedFromInstances.totalTflops >= 1000
                        ? `${(computedFromInstances.totalTflops / 1000).toFixed(2)} PFLOPS`
                        : `${computedFromInstances.totalTflops} TFLOPS`} BF16
                    </span>
                  </div>
                </div>
              )}

              {gpuInstances.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-2">No GPUs added yet. Select a model above and hit Add.</p>
              )}
            </div>
          )}
        </div>

        {/* Result */}
        <div className="bg-linear-to-b from-gray-50 to-gray-200 p-4 rounded-xl flex flex-col gap-2 items-center">
          <h2 className="text-xl font-semibold text-gray-900">Results</h2>
          <div className="bg-linear-60 from-indigo-100 to-blue-500 px-8 py-3 rounded-2xl flex flex-col items-center">
            <p className="text-sm font-medium text-indigo-800">Estimated Training Time</p>
            <p className="text-xl font-bold text-indigo-900">{formatTime(results.days)}</p>
          </div>
          {modelType === 'Diffusion' && params.diffusionSteps > 1 && (
            <p className="text-xs text-gray-400 mt-1">
              ×{params.diffusionSteps} diffusion steps applied as multiplier
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default TrainingTime