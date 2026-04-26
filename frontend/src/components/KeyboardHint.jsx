export default function KeyboardHint({ keys, label, dim }) {
  return (
    <span className="kb-hint" style={{ opacity: dim ? 0.5 : 1 }}>
      {(Array.isArray(keys) ? keys : [keys]).map((k) => (
        <kbd key={k} className="kb-key">{k}</kbd>
      ))}
      {label && <span className="kb-hint-label">{label}</span>}
    </span>
  )
}
