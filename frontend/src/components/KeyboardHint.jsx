export default function KeyboardHint({ keys, label, dim }) {
  return (
    <span className={`kb-hint ${dim ? 'kb-hint--dim' : ''}`}>
      {(Array.isArray(keys) ? keys : [keys]).map((k) => (
        <kbd key={k} className="kb-key">{k}</kbd>
      ))}
      {label && <span className="kb-hint-label">{label}</span>}
    </span>
  )
}
