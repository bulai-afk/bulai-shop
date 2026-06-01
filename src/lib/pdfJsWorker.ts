/** Один раз на приложение; нужен до любого вызова pdfjs.getDocument / &lt;Document&gt;. */
import { pdfjs } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export { pdfjs }
