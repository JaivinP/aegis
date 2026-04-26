import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listShipmentTypes, createShipmentType, deleteShipmentType, createShipment } from '../api'

const CATEGORIES = ['pharmaceutical', 'food', 'biologic', 'custom']

const EMOJI_TYPES = {
  medicine: { label: 'Medicine', emoji: '💊' },
  biology: { label: 'Biology', emoji: '🧬' },
  produce: { label: 'Produce', emoji: '🥬' },
  other: { label: 'Other', emoji: '📦' },
}

const EMPTY_FORM = {
  productName: '',
  iconType: 'other',
  origin: '',
  destination: '',
  tempMin: '',
  tempMax: '',
  tempNominal: '',
  humidityMin: '',
  humidityMax: '',
  humidityNominal: '',
  complianceFramework: '',
}

const EMPTY_TYPE_FORM = {
  name: '',
  iconType: 'other',
  category: 'pharmaceutical',
  tempMin: '',
  tempMax: '',
  tempNominal: '',
  humidityMin: '',
  humidityMax: '',
  humidityNominal: '',
  complianceFramework: '',
}

function genId(prefix) {
  return `${prefix}-${Math.floor(Math.random() * 9000) + 1000}`
}

function typeToForm(t) {
  return {
    productName: t.name,
    iconType: t.iconType || 'other',
    origin: '',
    destination: '',
    tempMin: t.safeTempRange?.min ?? '',
    tempMax: t.safeTempRange?.max ?? '',
    tempNominal: t.tempNominal ?? '',
    humidityMin: t.safeHumidityRange?.min ?? '',
    humidityMax: t.safeHumidityRange?.max ?? '',
    humidityNominal: t.humidityNominal ?? '',
    complianceFramework: (t.complianceFrameworks || []).join(', '),
  }
}

export default function NewShipment() {
  const navigate = useNavigate()
  const [types, setTypes] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedTypeId, setSelectedTypeId] = useState(null)
  const [showTypeForm, setShowTypeForm] = useState(false)
  const [typeForm, setTypeForm] = useState(EMPTY_TYPE_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [savingType, setSavingType] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    listShipmentTypes().then(setTypes).catch(() => {})
  }, [])

  function selectType(t) {
    setSelectedTypeId(t.shipmentTypeId)
    setForm((prev) => ({ ...typeToForm(t), origin: prev.origin, destination: prev.destination }))
  }

  async function handleDeleteType(e, typeId) {
    e.preventDefault()
    e.stopPropagation()
    await deleteShipmentType(typeId).catch(() => {})
    setTypes((prev) => prev.filter((t) => t.shipmentTypeId !== typeId))
    if (selectedTypeId === typeId) {
      setSelectedTypeId(null)
    }
  }

  async function handleSaveType(e) {
    e.preventDefault()
    setSavingType(true)
    try {
      const payload = {
        shipmentTypeId: genId('TYP'),
        name: typeForm.name,
        iconType: typeForm.iconType,
        category: typeForm.category,
        safeTempRange: {
          min: parseFloat(typeForm.tempMin) || 0,
          max: parseFloat(typeForm.tempMax) || 0,
          unit: 'C',
        },
        safeHumidityRange: typeForm.humidityMin !== '' ? {
          min: parseFloat(typeForm.humidityMin) || 0,
          max: parseFloat(typeForm.humidityMax) || 0,
        } : null,
        tempNominal: typeForm.tempNominal !== '' ? parseFloat(typeForm.tempNominal) : null,
        humidityNominal: typeForm.humidityNominal !== '' ? parseFloat(typeForm.humidityNominal) : null,
        complianceFrameworks: typeForm.complianceFramework
          ? typeForm.complianceFramework.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      }
      await createShipmentType(payload)
      setTypes((prev) => [payload, ...prev])
      setShowTypeForm(false)
      setTypeForm(EMPTY_TYPE_FORM)
    } catch (err) {
      setError('Failed to save template: ' + err.message)
    } finally {
      setSavingType(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const shipmentId = genId('AGS')
      const payload = {
        shipmentId,
        shipmentTypeId: selectedTypeId || null,
        productName: form.productName,
        iconType: form.iconType,
        origin: form.origin,
        destination: form.destination,
        tempMin: form.tempMin !== '' ? parseFloat(form.tempMin) : null,
        tempMax: form.tempMax !== '' ? parseFloat(form.tempMax) : null,
        tempNominal: form.tempNominal !== '' ? parseFloat(form.tempNominal) : null,
        humidityMin: form.humidityMin !== '' ? parseFloat(form.humidityMin) : null,
        humidityMax: form.humidityMax !== '' ? parseFloat(form.humidityMax) : null,
        humidityNominal: form.humidityNominal !== '' ? parseFloat(form.humidityNominal) : null,
        complianceFramework: form.complianceFramework || null,
        status: 'CREATED',
        currentPhase: 'connect',
      }
      await createShipment(payload)
      navigate(`/shipments/${shipmentId}/connect`)
    } catch (err) {
      setError('Failed to create shipment: ' + err.message)
      setSubmitting(false)
    }
  }

  function field(key) {
    return {
      value: form[key],
      onChange: (e) => setForm((prev) => ({ ...prev, [key]: e.target.value })),
    }
  }

  function typeField(key) {
    return {
      value: typeForm[key],
      onChange: (e) => setTypeForm((prev) => ({ ...prev, [key]: e.target.value })),
    }
  }

  return (
    <div className="page-content">
      <div className="page-inner">
        <div className="page-header">
          <div className="section-label mono">NEW SHIPMENT</div>
          <h1 className="page-title">Configure Shipment</h1>
          <p className="page-sub">Define what you're shipping. Pick a saved template or enter custom parameters.</p>
        </div>

        {/* ── Saved templates ── */}
        <div className="ns-section">
          <div className="ns-section-header">
            <span className="mono ns-section-label">PRODUCT TEMPLATES</span>
            <button className="btn-ghost ns-add-btn" onClick={() => setShowTypeForm((v) => !v)}>
              {showTypeForm ? '✕ Cancel' : '+ New Template'}
            </button>
          </div>

          {showTypeForm && (
            <form className="ns-type-form" onSubmit={handleSaveType}>
              <div className="ns-type-form-grid">
                <div className="form-group">
                  <label className="form-label mono">TEMPLATE NAME</label>
                  <input className="form-input" required placeholder="e.g. mRNA Vaccine" {...typeField('name')} />
                </div>
                <div className="form-group">
                  <label className="form-label mono">EMOJI TYPE</label>
                  <select className="form-input" {...typeField('iconType')}>
                    {Object.entries(EMOJI_TYPES).map(([key, { label, emoji }]) => (
                      <option key={key} value={key}>{emoji} {label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label mono">CATEGORY</label>
                  <select className="form-input" {...typeField('category')}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label mono">COMPLIANCE FRAMEWORK</label>
                  <input className="form-input" placeholder="FDA 21 CFR, WHO ECC" {...typeField('complianceFramework')} />
                </div>
                <div className="form-group">
                  <label className="form-label mono">TEMP MIN (°C)</label>
                  <input className="form-input" type="number" step="any" {...typeField('tempMin')} />
                </div>
                <div className="form-group">
                  <label className="form-label mono">TEMP MAX (°C)</label>
                  <input className="form-input" type="number" step="any" {...typeField('tempMax')} />
                </div>
                <div className="form-group">
                  <label className="form-label mono">TEMP NOMINAL (°C)</label>
                  <input className="form-input" type="number" step="any" {...typeField('tempNominal')} />
                </div>
                <div className="form-group">
                  <label className="form-label mono">HUMIDITY MIN (%)</label>
                  <input className="form-input" type="number" step="any" {...typeField('humidityMin')} />
                </div>
                <div className="form-group">
                  <label className="form-label mono">HUMIDITY MAX (%)</label>
                  <input className="form-input" type="number" step="any" {...typeField('humidityMax')} />
                </div>
                <div className="form-group">
                  <label className="form-label mono">HUMIDITY NOMINAL (%)</label>
                  <input className="form-input" type="number" step="any" {...typeField('humidityNominal')} />
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={savingType} style={{ marginTop: '0.75rem' }}>
                {savingType ? 'Saving…' : 'Save Template'}
              </button>
            </form>
          )}

          {types.length === 0 && !showTypeForm && (
            <p className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              No templates yet. Create one to reuse shipment parameters.
            </p>
          )}

          {types.length > 0 && (
            <div className="type-grid">
              {types.map((t) => (
                <button
                  key={t.shipmentTypeId}
                  className={`type-card ${selectedTypeId === t.shipmentTypeId ? 'type-card--selected' : ''}`}
                  onClick={() => selectType(t)}
                  type="button"
                >
                  <div className="type-card-top">
                    <span className="type-card-icon">{EMOJI_TYPES[t.iconType]?.emoji || '📦'}</span>
                    <button
                      className="type-card-delete"
                      onClick={(e) => handleDeleteType(e, t.shipmentTypeId)}
                      title="Delete template"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="type-card-name">{t.name}</div>
                  <div className="mono type-card-temp">
                    {t.safeTempRange?.min}°C – {t.safeTempRange?.max}°C
                  </div>
                  {t.complianceFrameworks?.length > 0 && (
                    <div className="mono type-card-fw">{t.complianceFrameworks[0]}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Shipment form ── */}
        <form className="ns-section" onSubmit={handleSubmit}>
          <div className="mono ns-section-label" style={{ marginBottom: '1.25rem' }}>SHIPMENT DETAILS</div>

          <div className="form-grid">
            <div className="form-group form-group--wide">
              <label className="form-label mono">PRODUCT NAME</label>
              <input className="form-input" required placeholder="e.g. Insulin Glargine 100U/ML" {...field('productName')} />
            </div>
            <div className="form-group">
              <label className="form-label mono">EMOJI TYPE</label>
              <select className="form-input" {...field('iconType')}>
                {Object.entries(EMOJI_TYPES).map(([key, { label, emoji }]) => (
                  <option key={key} value={key}>{emoji} {label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label mono">ORIGIN</label>
              <input className="form-input" required placeholder="Los Angeles, CA" {...field('origin')} />
            </div>
            <div className="form-group">
              <label className="form-label mono">DESTINATION</label>
              <input className="form-input" required placeholder="Phoenix, AZ" {...field('destination')} />
            </div>
            <div className="form-group form-group--wide">
              <label className="form-label mono">COMPLIANCE FRAMEWORK</label>
              <input className="form-input" placeholder="FDA 21 CFR Part 211" {...field('complianceFramework')} />
            </div>
          </div>

          <div className="form-divider mono">TEMPERATURE PARAMETERS</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label mono">MIN (°C)</label>
              <input className="form-input" type="number" step="any" placeholder="2" {...field('tempMin')} />
            </div>
            <div className="form-group">
              <label className="form-label mono">MAX (°C)</label>
              <input className="form-input" type="number" step="any" placeholder="8" {...field('tempMax')} />
            </div>
            <div className="form-group">
              <label className="form-label mono">NOMINAL (°C)</label>
              <input className="form-input" type="number" step="any" placeholder="4.2" {...field('tempNominal')} />
            </div>
          </div>

          <div className="form-divider mono">HUMIDITY PARAMETERS</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label mono">MIN (%)</label>
              <input className="form-input" type="number" step="any" placeholder="30" {...field('humidityMin')} />
            </div>
            <div className="form-group">
              <label className="form-label mono">MAX (%)</label>
              <input className="form-input" type="number" step="any" placeholder="50" {...field('humidityMax')} />
            </div>
            <div className="form-group">
              <label className="form-label mono">NOMINAL (%)</label>
              <input className="form-input" type="number" step="any" placeholder="38" {...field('humidityNominal')} />
            </div>
          </div>

          {error && (
            <p className="mono" style={{ color: 'var(--red)', fontSize: '0.78rem', marginTop: '0.75rem' }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Shipment →'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => window.history.back()}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
