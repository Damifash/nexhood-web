import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

// The backend encodes the QR payload as a Python-dict string, e.g.
//   {'code': 'ABC12345', 'estate_id': ..., 'type': 'visitor_pass', ...}
// so we can't just JSON.parse it. Handle that format, real JSON, or a
// raw code with the same helper — whatever comes out of the camera,
// the guard's existing validate-by-code flow gets a clean code string.
export function extractPassCode(raw: string): string {
  try {
    const obj = JSON.parse(raw)
    if (obj && typeof obj === 'object' && 'code' in obj) return String((obj as { code: unknown }).code)
  } catch {
    // not JSON — fall through to the Python-dict pattern
  }
  const m = raw.match(/['"]code['"]\s*:\s*['"]([A-Za-z0-9-]+)['"]/)
  return m ? m[1] : raw.trim()
}

/**
 * Live camera QR scanner. Renders the camera feed, fires onScan(code)
 * exactly once with the extracted pass code, and cleans up the camera
 * on unmount. Requires: npm install html5-qrcode
 *
 * Usage inside the validation page:
 *   {scanning ? (
 *     <QrScanner
 *       onScan={(code) => { setScanning(false); handleValidate(code) }}
 *       onClose={() => setScanning(false)}
 *     />
 *   ) : (
 *     <button className="btn-primary" onClick={() => setScanning(true)}>
 *       Scan QR code
 *     </button>
 *   )}
 * ...keeping the existing manual code input untouched as the fallback.
 */
export function QrScanner({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const containerId = 'nexhood-qr-scanner'
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const handled = useRef(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId)
    scannerRef.current = scanner
    scanner
      .start(
        { facingMode: 'environment' }, // back camera on phones
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded) => {
          if (handled.current) return
          handled.current = true
          onScan(extractPassCode(decoded))
        },
        () => {
          // per-frame decode misses are normal — ignore
        },
      )
      .catch(() => setError('Could not open the camera. Check camera permission, or type the code instead.'))
    return () => {
      const s = scannerRef.current
      if (s) {
        s.stop().then(() => s.clear()).catch(() => {
          // camera already stopped — nothing to clean
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-3">
      <div id={containerId} className="rounded-xl overflow-hidden bg-midnight-900 min-h-[240px]" />
      {error && <p className="text-sm text-alert-600">{error}</p>}
      <button type="button" onClick={onClose} className="btn-outline w-full">
    	Enter code manually instead
      </button>
    </div>
  )
}

