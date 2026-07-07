// Shared full-bleed iframe page (QuoteMaker, oracle-var-resolver).
export default function Embed({ src, title }: { src: string; title: string }) {
  return (
    <iframe
      src={src}
      title={title}
      style={{ border: 0, width: '100%', height: '100%', display: 'block' }}
      allowFullScreen
    />
  )
}
