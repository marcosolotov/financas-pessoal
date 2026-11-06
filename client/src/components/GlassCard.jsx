export default function GlassCard({ children, className = '', strong = false }) {
  return <div className={`${strong ? 'glass-strong' : 'glass'} ${className}`}>{children}</div>;
}