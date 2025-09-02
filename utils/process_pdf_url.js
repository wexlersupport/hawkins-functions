import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "canvas";
import Tesseract from "tesseract.js";
// import path from "path";
// import { fileURLToPath } from "url";

import getAttachmentList from "../server/api/vista/field_service/attachment_list.js";
import getAttachmentById from "../server/api/vista/field_service/attachment_id.js";

// __dirname replacement for ESM
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// 🔹 pdf.js worker (must use ESM build)
// pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
//   "pdfjs-dist/legacy/build/pdf.worker.mjs",
//   import.meta.url
// ).toString();

export async function processUrl(fs_attachment, config_all) {
    try {
        const response = await fetchPdf(fs_attachment, config_all)
        // console.log('PDF response :', Buffer.isBuffer(response));
        const response_blob = new Blob([response], { type: "application/pdf" });
        // console.log("PDF blob:", response_blob);
        const arrayBuffer = await response_blob?.arrayBuffer();
        // console.log('PDF arrayBuffer :', arrayBuffer);
        const extractedText = await handlePdfData(arrayBuffer);
        // console.log('PDF extractedText :', extractedText);

        return extractedText.split('\n');
    } catch (err) {
        console.error('Error fetching PDF:', err);
    }
}

export async function handlePdfData(pdfData) {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: pdfData,
    //   cMapUrl: path.join(
    //     __dirname,
    //     "../node_modules/pdfjs-dist/cmaps/"
    //   ),
    //   cMapPacked: true,
    });

    const pdf = await loadingTask.promise;
    let pagesTextArray = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      const hasText = textContent.items.some(
        (item) => item.str && item.str.trim().length > 0
      );

      if (!hasText) {
        // 🖼️ OCR fallback
        const viewport = page.getViewport({ scale: 2 });
        const canvas = createCanvas(viewport.width, viewport.height);
        const ctx = canvas.getContext("2d");

        await page.render({
          canvasContext: ctx,
          viewport: viewport,
        }).promise;

        const {
          data: { text },
        } = await Tesseract.recognize(canvas.toBuffer(), "eng", {
          logger: (m) => console.log(m), // progress logs
        });

        pagesTextArray += text + "\n";
      } else {
        // 📝 Extract selectable text
        const pageText = textContent.items
          .map((item) => item.str)
          .join("\n");
        pagesTextArray += pageText + "\n";
      }
    }

    return pagesTextArray.trim();
  } catch (error) {
    console.error("Error processing PDF:", error);
    return "";
  }
}

export async function fetchFieldServiceAttachmentsList(fs_workorder, config_all) {
    const fs_cookie = config_all?.find((item) => item.config_key === 'fs_cookie')
    const { response: attachment_list } = await getAttachmentList(fs_cookie?.config_value, fs_workorder?.UniqueAttchID)

    return attachment_list
}

export async function fetchPdf(fs_attachment, config_all) {
    const fs_cookie = config_all?.find((item) => item.config_key === 'fs_cookie')

    const pdf_data = await getAttachmentById(fs_cookie?.config_value, fs_attachment?.AttachmentID)

    return pdf_data
}