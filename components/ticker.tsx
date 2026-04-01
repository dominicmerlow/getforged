const ITEMS = [
  'Claude Code', 'Cursor', 'Windsurf', 'Lovable', 'Bubble',
  'Webflow', 'v0.dev', 'No-Code', 'AI Automation', 'Web Apps', 'SaaS Tools',
]

export default function Ticker() {
  // Duplicate for seamless loop
  const doubled = [...ITEMS, ...ITEMS]

  return (
    <div className="ticker-wrap">
      <div className="ticker-track">
        {doubled.map((item, i) => (
          <span key={i} className="ticker-item">
            <span className="ticker-dot" />
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
