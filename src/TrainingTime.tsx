import { useState, useEffect, useRef } from 'react'
import './index.css'
import './components'
import NumInput from './components'

const GPU_PRESETS: Record<string, number> = {
  'GB300 NVL72':                   2500,
  'GB200 NVL72':                   2250,
  'HGX B300':                      2500,
  'HGX B200':                      2250,
  'RTX PRO 6000 Blackwell Server':  282,
  'HGX H200':                      1979,
  'HGX H100':                      1979,
  'GH200 Grace Hopper':            1979,
  'A100 PCIe (80GB)':               312,
  'L40':                            362,
  'L40S':                           733,
}

type GpuEntry  = { model: string; quantity: number }
type ModelType = 'ARM' | 'Diffusion'

async function saveToDb(key: string, value: number | string) {
  try {
    await fetch(`/api/items/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: key, value }),
    })
  } catch (e) { console.error(`Error saving ${key}:`, e) }
}

async function saveJson(key: string, value: unknown) {
  try {
    await fetch(`/api/items/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: key, value: JSON.stringify(value) }),
    })
  } catch (e) { console.error(`Error saving ${key}:`, e) }
}

function TrainingTime() {
  const [isLoading,     setIsLoading]     = useState(true)
  const [modelType,     setModelType]     = useState<ModelType>('ARM')
  const [gpuInstances,  setGpuInstances]  = useState<GpuEntry[]>([])
  const [customGpus,    setCustomGpus]    = useState<Record<string, number>>({})
  const [selectedModel, setSelectedModel] = useState<string>(Object.keys(GPU_PRESETS)[0])
  const [showDialog,    setShowDialog]    = useState(false)
  const [customName,    setCustomName]    = useState('')
  const [customTflops,  setCustomTflops]  = useState('')
  const [lastEdited,    setLastEdited]    = useState<'tokens' | 'samples' | 'avgLen'>('tokens')
  const dialogRef = useRef<HTMLDivElement>(null)

  const [params, setParams] = useState({
    total:          0,
    tokens:         0,
    samples:        0,
    avgLen:         0,
    diffusionSteps: 20,
    epochs:         1,
  })

  const allGpus = { ...GPU_PRESETS, ...customGpus }

  // Derived dataset fields
  const derivedSamples = params.tokens > 0 && params.avgLen > 0
    ? Math.round(params.tokens / params.avgLen) : 0
  const derivedAvgLen  = params.tokens > 0 && params.samples > 0
    ? Math.round(params.tokens / params.samples) : 0

  const effectiveAvgLen = lastEdited === 'samples' ? derivedAvgLen : params.avgLen

  // GPU cluster totals
  const cluster = gpuInstances.reduce(
    (acc, e) => { const tf = allGpus[e.model] ?? 0; acc.gpus += e.quantity; acc.tf += tf * e.quantity; return acc },
    { gpus: 0, tf: 0 }
  )
  const avgTflops = cluster.gpus > 0 ? cluster.tf / cluster.gpus : 0

  // Training time
  // ARM:      iterations = total tokens
  // Diffusion: iterations = samples * diffusionSteps  (each sample = N denoising steps)
  const effectiveSamples = effectiveAvgLen > 0 ? params.tokens / effectiveAvgLen : 0
  const iterations = modelType === 'Diffusion'
    ? effectiveSamples * params.diffusionSteps
    : params.tokens
  const days = (cluster.gpus > 0 && avgTflops > 0 && params.total > 0 && iterations > 0)
    ? (8 * params.total * iterations * params.epochs) / (cluster.gpus * avgTflops) / 86400
    : 0

  // Load from DB on mount
  useEffect(() => {
    ;(async () => {
      try {
        const keys = ['total', 'tokens', 'samples', 'avgLen', 'diffusionSteps', 'epochs'] as const
        const loaded: Partial<typeof params> = {}
        for (const k of keys) {
          try { const r = await fetch(`/api/items/${k}`); if (r.ok) loaded[k] = (await r.json()).value } catch (_) {}
        }
        setParams(prev => ({ ...prev, ...loaded }))

        try { const r = await fetch('/api/items/modelType'); if (r.ok) { const v = (await r.json()).value; if (v === 'Diffusion' || v === 'ARM') setModelType(v) } } catch (_) {}
        try { const r = await fetch('/api/items/gpuInstances'); if (r.ok) { const p = JSON.parse((await r.json()).value); if (Array.isArray(p)) setGpuInstances(p) } } catch (_) {}
        try { const r = await fetch('/api/items/customGpus'); if (r.ok) { const p = JSON.parse((await r.json()).value); if (typeof p === 'object') setCustomGpus(p) } } catch (_) {}
      } finally { setIsLoading(false) }
    })()
  }, [])

  const persist = (
    nextParams = params,
    nextType   = modelType,
    nextInst   = gpuInstances,
    nextCustom = customGpus,
  ) => {
    Object.entries(nextParams).forEach(([k, v]) => saveToDb(k, v))
    saveToDb('modelType', nextType)
    saveJson('gpuInstances', nextInst)
    saveJson('customGpus',   nextCustom)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const num = value === '' ? 0 : Number(value)
    if      (name === 'samples') setLastEdited('samples')
    else if (name === 'avgLen')  setLastEdited('avgLen')
    else if (name === 'tokens')  setLastEdited('tokens')
    const next = { ...params, [name]: num }
    setParams(next)
    persist(next)
  }

  const addGpuInstance = () => {
    const next = [...gpuInstances, { model: selectedModel, quantity: 1 }]
    setGpuInstances(next); persist(params, modelType, next)
  }
  const removeInstance = (i: number) => {
    const next = gpuInstances.filter((_, idx) => idx !== i)
    setGpuInstances(next); persist(params, modelType, next)
  }
  const updateQty = (i: number, qty: number) => {
    const next = gpuInstances.map((e, idx) => idx === i ? { ...e, quantity: qty } : e)
    setGpuInstances(next); persist(params, modelType, next)
  }
  const addCustomGpu = () => {
    const name = customName.trim()
    const tf   = parseFloat(customTflops)
    if (!name || isNaN(tf) || tf <= 0) return
    const next = { ...customGpus, [name]: tf }
    setCustomGpus(next); setSelectedModel(name)
    setCustomName(''); setCustomTflops(''); setShowDialog(false)
    persist(params, modelType, gpuInstances, next)
  }

  const fmtTf  = (t: number) =>
    t >= 1e6 ? `${(t / 1e6).toFixed(2)} EFLOPS`
    : t >= 1000 ? `${(t / 1000).toFixed(2)} PFLOPS`
    : `${t} TFLOPS`

  const fmtNum = (n: number) => {
    if (!n) return '—'
    if (n >= 1e12) return (n / 1e12).toFixed(1).replace(/\.0$/, '') + 'T'
    if (n >= 1e9)  return (n / 1e9 ).toFixed(1).replace(/\.0$/, '') + 'B'
    if (n >= 1e6)  return (n / 1e6 ).toFixed(1).replace(/\.0$/, '') + 'M'
    if (n >= 1e3)  return (n / 1e3 ).toFixed(1).replace(/\.0$/, '') + 'K'
    return n.toLocaleString()
  }

  const fmtTime = (d: number) => {
    if (d <= 0) return '—'
    if (d >= 365) { const y = Math.round((d / 365) * 2) / 2; return `${y} Year${y !== 1 ? 's' : ''}` }
    if (d >= 30)  { const m = Math.round(d / 30);            return `${m} Month${m !== 1 ? 's' : ''}` }
    const w = Math.round(d / 7)
    if (w >= 1)   return `${w} Week${w !== 1 ? 's' : ''}`
    const rd = Math.round(d)
    return `${rd} Day${rd !== 1 ? 's' : ''}`
  }

  if (isLoading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <p className="text-gray-500">Loading…</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start py-10 px-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-md p-6 flex flex-col gap-6">
        <h1 className="text-3xl font-bold text-center text-gray-900">Training Time Calculator</h1>

        {/* ARM / Diffusion toggle */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Model Type:</span>
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            {(['ARM', 'Diffusion'] as const).map(t => (
              <button key={t} onClick={() => { setModelType(t); persist(params, t) }}
                className={`px-5 py-2 text-sm font-semibold transition-colors ${modelType === t ? 'bg-indigo-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Model & training inputs */}
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-gray-800">Model & Training</h2>
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${modelType === 'Diffusion' ? 'lg:grid-cols-3' : ''}`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parameters</label>
              <NumInput onChange={handleChange} value={params.total} name="total" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Epochs</label>
              <NumInput onChange={handleChange} value={params.epochs} name="epochs" />
            </div>
            {modelType === 'Diffusion' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diffusion Steps</label>
                <NumInput onChange={handleChange} value={params.diffusionSteps} name="diffusionSteps" />
              </div>
            )}
          </div>
        </div>

        {/* Dataset constructor */}
        <div className="flex flex-col gap-3 bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">Dataset</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Tokens</label>
              <NumInput onChange={handleChange} value={params.tokens} name="tokens" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                Samples
                {lastEdited === 'avgLen' && derivedSamples > 0 && (
                  <span className="text-xs text-indigo-500 font-normal ml-1">= {fmtNum(derivedSamples)}</span>
                )}
              </label>
              <NumInput onChange={handleChange}
                value={lastEdited === 'avgLen' ? derivedSamples : params.samples}
                name="samples" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                Avg Sample Length
                {lastEdited === 'samples' && derivedAvgLen > 0 && (
                  <span className="text-xs text-indigo-500 font-normal ml-1">= {fmtNum(derivedAvgLen)}</span>
                )}
              </label>
              <NumInput onChange={handleChange}
                value={lastEdited === 'samples' ? derivedAvgLen : params.avgLen}
                name="avgLen" />
            </div>
          </div>
          {effectiveAvgLen > 0 && params.tokens > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Avg sample length: <span className="text-gray-600 font-medium">{fmtNum(effectiveAvgLen)} tokens</span>
              {modelType === 'Diffusion' && params.diffusionSteps > 0 && effectiveSamples > 0 && (
                <> → <span className="text-gray-600 font-medium">{fmtNum(Math.round(effectiveSamples))} samples × {params.diffusionSteps} steps = </span><span className="text-indigo-600 font-medium">{fmtNum(Math.round(effectiveSamples * params.diffusionSteps))} total iterations</span></>
              )}
            </p>
          )}
        </div>

        {/* GPU cluster */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">GPU Cluster</h2>
            <button onClick={() => setShowDialog(true)}
              className="text-sm text-indigo-500 hover:text-indigo-700 font-semibold border border-indigo-200 px-3 py-1 rounded-lg hover:bg-indigo-50 transition-colors">
              + Custom GPU
            </button>
          </div>

          <div className="flex gap-3 flex-wrap">
            <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}
              className="flex-1 min-w-[180px] border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {Object.keys(allGpus).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <button onClick={addGpuInstance}
              className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              + Add
            </button>
          </div>

          {gpuInstances.length > 0 ? (
            <div className="flex flex-col gap-2">
              {gpuInstances.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 bg-white rounded-lg px-4 py-2 border border-gray-200">
                  <span className="flex-1 text-sm text-gray-700 font-medium">{entry.model}</span>
                  <span className="text-xs text-gray-400">{fmtTf(allGpus[entry.model] ?? 0)} BF16</span>
                  <input type="number" min={1} value={entry.quantity}
                    onChange={e => updateQty(i, Number(e.target.value) || 1)}
                    className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <button onClick={() => removeInstance(i)}
                    className="text-red-400 hover:text-red-600 text-xl font-bold leading-none">×</button>
                </div>
              ))}
              <div className="flex items-center justify-between bg-indigo-50 rounded-lg px-4 py-2 border border-indigo-200 text-sm font-semibold text-indigo-800">
                <span>Total</span>
                <span>{cluster.gpus} GPUs</span>
                <span>{fmtTf(cluster.tf)} BF16</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-2">No GPUs added yet.</p>
          )}
        </div>

        {/* Result */}
        <div className="bg-gradient-to-b from-gray-50 to-gray-200 p-4 rounded-xl flex flex-col items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900">Estimated Training Time</h2>
          <div className="bg-gradient-to-r from-indigo-100 to-blue-400 px-12 py-3 rounded-2xl">
            <p className="text-2xl font-bold text-indigo-900 text-center">{fmtTime(days)}</p>
          </div>
          <p className="text-xs text-gray-400">
            {modelType === 'Diffusion' ? `×${params.diffusionSteps} diffusion steps · ` : ''}×{params.epochs} epoch{params.epochs !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Custom GPU dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={e => { if (e.target === e.currentTarget) setShowDialog(false) }}>
          <div ref={dialogRef} className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h3 className="text-lg font-bold text-gray-900">Add Custom GPU</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GPU Name</label>
              <input type="text" value={customName} onChange={e => setCustomName(e.target.value)}
                placeholder="e.g. My Custom Chip"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">BF16 TFLOPS</label>
              <input type="number" value={customTflops} onChange={e => setCustomTflops(e.target.value)}
                placeholder="e.g. 1979"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDialog(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-semibold rounded-lg hover:bg-gray-100 transition-colors">
                Cancel
              </button>
              <button onClick={addCustomGpu}
                className="px-4 py-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg transition-colors">
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TrainingTime