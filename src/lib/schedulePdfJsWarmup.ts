import { pdfjs } from 'react-pdf'
import './pdfJsWorker'

let done = false

/**
 * После первой отрисовки страницы поднимает worker и один раз парсит крошечный PDF,
 * чтобы открытие «настоящего» файла из IndexedDB не холодило PDF.js с нуля.
 */
export function schedulePdfJsWarmup(): void {
  if (done || typeof window === 'undefined') return

  const run = () => {
    if (done) return
    done = true
    try {
      const miniPdf =
        'data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCAyIDJdCj4+CmVuZG9iagp4cmVmCjAgNAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTAgMDAwMDAgbiAKMDAwMDAwMDA3OSAwMDAwMCBuIAowMDAwMDAwMTczIDAwMDAwIG4gCnRyYWlsZXIKPDwKL1Jvb3QgMSAwIFIKL1NpemUgNAo+PgpzdGFydHhyZWYKMjY1CiUlRU9G'
      const task = pdfjs.getDocument(miniPdf)
      void task.promise.then((d) => d.destroy()).catch(() => {})
    } catch {
      done = false
    }
  }

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 5000 })
  } else {
    setTimeout(run, 250)
  }
}
