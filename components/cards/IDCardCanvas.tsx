"use client";

import { useEffect, useRef, useState } from "react";
import type { Student } from "@/types";
import { getIDCardTemplateSrc } from "@/lib/cardTemplates";
import type { PDFPage } from "pdf-lib";

export const CARD_W = 1017;
export const CARD_H = 638;
const EXPORT_SCALE = 2;
const PDF_JPEG_QUALITY = 0.86;
const MM_TO_PT = 72 / 25.4;
const PDF_TEMPLATE_BLEED_PT = 2;
const LEXEND_EXTRA_BOLD_FONT = "/assets/fonts/Lexend-ExtraBold.ttf";

// ─── Exact positions (px at native 1017×638) ──────────────────────

const P = {
  surname: { left: 55, top: 285 },
  otherName: { left: 55, top: 375 },
  matric: { left: 230, top: 440 },
  sex: { left: 440, top: 440 },
  dept: { left: 55, top: 515 },
  blood: { left: 270, top: 574 },
  geno: { left: 545, top: 574 },
  qr: { left: 480, top: 260, size: 160 },
  photo: { left: 690, top: 285, w: 280, h: 300 },
};

// Font sizes at native resolution
const F = {
  surname: 36,
  otherName: 27,
  inline: 27, // matric, sex, blood, geno
  dept: 22,
};

const VCOL = "#0d1a0d"; // value text colour
const TEXT_HALO = "none";
const TEXT_W = {
  surname: 900,
  otherName: 900,
  matric: 260,
  sex: 180,
  dept: 900,
  blood: 140,
  geno: 130,
};

// ─── React display component ──────────────────────────────────────
interface Props {
  student: Student;
  scale?: number;
  onRendered?: (url: string) => void;
  renderForExport?: boolean;
}

export default function IDCardCanvas({
  student,
  scale = 0.6,
  onRendered,
  renderForExport = true,
}: Props) {
  const [qrUrl, setQrUrl] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  // Generate QR
  useEffect(() => {
    (async () => {
      const QR = (await import("qrcode")).default;
      const data = JSON.stringify({
        inst: "FUNATO",
        sur: student.surname,
        oth: student.otherNames,
        mat: student.matricNumber,
        dep: student.department,
        sex: student.sex,
        sec: student.securityString,
      });
      const url = await QR.toDataURL(data, {
        errorCorrectionLevel: "H",
        margin: 1,
        width: 400,
        color: { dark: "#000000", light: "#ffffff" },
      });
      setQrUrl(url);
      setReady(true);
      if (onRendered && renderForExport) onRendered(url);
    })();
  }, [student, onRendered, renderForExport]);

  const dW = Math.round(CARD_W * scale);
  const dH = Math.round(CARD_H * scale);
  const s = scale; // shorthand for font scaling
  const previewTemplateSrc = getRasterTemplateSrc(student);

  const style = (
    left: number,
    top: number,
    extra?: React.CSSProperties,
  ): React.CSSProperties => ({
    position: "absolute",
    left: left * s,
    top: top * s,
    ...extra,
  });

  const valueStyle = (
    fontSize: number,
    maxW?: number,
  ): React.CSSProperties => ({
    fontFamily: "'Lexend','Arial Black',Arial,sans-serif",
    fontWeight: 800,
    fontSize: fontSize * s,
    color: VCOL,
    textRendering: "geometricPrecision",
    WebkitFontSmoothing: "antialiased",
    textShadow: TEXT_HALO,
    lineHeight: 1,
    whiteSpace: "nowrap",
    maxWidth: maxW ? maxW * s : undefined,
    zIndex: 3,
  });

  const fitTextStyle = (
    text: string,
    fontSize: number,
    maxW: number,
    minFontSize = 14,
  ): React.CSSProperties => {
    const fittedSize = fitFontSize(
      text.toUpperCase(),
      fontSize,
      maxW,
      minFontSize,
    );
    return {
      ...valueStyle(fittedSize, maxW),
    };
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: dW,
        height: dH,
        overflow: "hidden",
        borderRadius: 18 * s,
        boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {/* ── Pre-designed background template ── */}
      <img
        src={previewTemplateSrc}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "fill",
          display: "block",
          filter: "contrast(1.06) saturate(1.04)",
        }}
      />

      {/* ── Surname ── */}
      <div
        style={style(
          P.surname.left,
          P.surname.top,
          valueStyle(F.surname, TEXT_W.surname),
        )}
      >
        {student.surname}
      </div>

      {/* ── Other Names ── */}
      <div
        style={style(
          P.otherName.left,
          P.otherName.top,
          valueStyle(F.otherName, TEXT_W.otherName),
        )}
      >
        {student.otherNames}
      </div>

      {/* ── Matric No (inline) ── */}
      <div
        style={style(
          P.matric.left,
          P.matric.top,
          valueStyle(F.inline, TEXT_W.matric),
        )}
      >
        {student.matricNumber}
      </div>

      {/* ── Sex (inline) ── */}
      <div
        style={style(
          P.sex.left,
          P.sex.top,
          valueStyle(F.inline, TEXT_W.sex),
        )}
      >
        {student.sex.toUpperCase()}
      </div>

      {/* ── Department ── */}
      <div
        style={style(
          P.dept.left,
          P.dept.top,
          fitTextStyle(student.department, F.dept, TEXT_W.dept, 9),
        )}
      >
        {student.department.toUpperCase()}
      </div>

      {/* ── Blood Group (inline) ── */}
      <div
        style={style(
          P.blood.left,
          P.blood.top,
          valueStyle(F.inline, TEXT_W.blood),
        )}
      >
        {student.bloodGroup}
      </div>

      {/* ── Genotype (inline) ── */}
      <div
        style={style(
          P.geno.left,
          P.geno.top,
          valueStyle(F.inline, TEXT_W.geno),
        )}
      >
        {student.genotype}
      </div>

      {/* ── QR Code ── */}
      {qrUrl && (
        <img
          src={qrUrl}
          alt="QR"
          style={{
            position: "absolute",
            left: P.qr.left * s,
            top: P.qr.top * s,
            width: P.qr.size * s,
            height: P.qr.size * s,
            objectFit: "contain",
            borderRadius: 4 * s,
            zIndex: 2,
          }}
        />
      )}

      {/* ── Passport Photo ── */}
      {student.passportUrl || student.passportData ? (
        <img
          src={student.passportUrl || student.passportData}
          alt="Passport"
          style={{
            position: "absolute",
            left: P.photo.left * s,
            top: P.photo.top * s,
            width: P.photo.w * s,
            height: P.photo.h * s,
            objectFit: "cover",
            objectPosition: "center center",
            borderRadius: 14 * s,
            zIndex: 1,
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            left: P.photo.left * s,
            top: P.photo.top * s,
            width: P.photo.w * s,
            height: P.photo.h * s,
            borderRadius: 14 * s,
            background: "rgba(200,220,200,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#888",
            fontSize: 11 * s,
            fontFamily: "Lexend,Arial,sans-serif",
          }}
        >
          No Photo
        </div>
      )}

      {/* Loading spinner */}
      {!ready && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(212,235,212,0.7)",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              border: "3px solid #a0c8a0",
              borderTopColor: "#2d6a2d",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Canvas export (for PDF / PNG download) ───────────────────────
interface RenderIDCardOptions {
  format?: "png" | "jpeg";
  quality?: number;
}

function font(
  size: number,
  weight = 800,
  family = "'Lexend','Arial Black',Arial,sans-serif",
) {
  return `${weight} ${size}px ${family}`;
}

function scaledFont(
  size: number,
  renderScale: number,
  weight = 800,
  family = "'Lexend','Arial Black',Arial,sans-serif",
) {
  return font(size * renderScale, weight, family);
}

async function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
    setTimeout(() => rej(new Error("timeout")), 8000);
  });
}

function getRasterTemplateSrc(student: Student) {
  return getIDCardTemplateSrc(student).replace(/\.pdf$/i, ".jpg");
}

export async function renderIDCard(
  student: Student,
  options: RenderIDCardOptions = {},
): Promise<string> {
  const renderScale = EXPORT_SCALE;
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W * renderScale;
  canvas.height = CARD_H * renderScale;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 1 ─ Template background
  try {
    const tpl = await loadImg(getRasterTemplateSrc(student));
    ctx.drawImage(tpl, 0, 0, canvas.width, canvas.height);
  } catch {
    ctx.fillStyle = "#c8e6c8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.textBaseline = "top";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.fillStyle = VCOL;

  // 3 ─ Surname
  ctx.font = scaledFont(
    fitCanvasFontSize(
      ctx,
      student.surname,
      F.surname,
      TEXT_W.surname,
      10,
      renderScale,
    ),
    renderScale,
  );
  drawCleanText(
    ctx,
    student.surname,
    P.surname.left * renderScale,
    P.surname.top * renderScale,
    renderScale,
  );

  // 4 ─ Other names
  ctx.font = scaledFont(
    fitCanvasFontSize(
      ctx,
      student.otherNames,
      F.otherName,
      TEXT_W.otherName,
      9,
      renderScale,
    ),
    renderScale,
  );
  drawCleanText(
    ctx,
    student.otherNames,
    P.otherName.left * renderScale,
    P.otherName.top * renderScale,
    renderScale,
  );

  // 5 ─ Matric
  ctx.font = scaledFont(F.inline, renderScale);
  drawCleanText(
    ctx,
    clip(ctx, student.matricNumber, TEXT_W.matric * renderScale),
    P.matric.left * renderScale,
    P.matric.top * renderScale,
    renderScale,
  );

  // 6 ─ Sex
  drawCleanText(
    ctx,
    student.sex.toUpperCase(),
    P.sex.left * renderScale,
    P.sex.top * renderScale,
    renderScale,
  );

  // 7 ─ Department
  ctx.font = scaledFont(
    fitCanvasFontSize(
      ctx,
      student.department.toUpperCase(),
      F.dept,
      TEXT_W.dept,
      9,
      renderScale,
    ),
    renderScale,
  );
  drawCleanText(
    ctx,
    student.department.toUpperCase(),
    P.dept.left * renderScale,
    P.dept.top * renderScale,
    renderScale,
  );

  // 8 ─ Blood group
  ctx.font = scaledFont(F.inline, renderScale);
  drawCleanText(
    ctx,
    student.bloodGroup,
    P.blood.left * renderScale,
    P.blood.top * renderScale,
    renderScale,
  );

  // 9 ─ Genotype
  drawCleanText(
    ctx,
    student.genotype,
    P.geno.left * renderScale,
    P.geno.top * renderScale,
    renderScale,
  );

  // 10 ─ QR Code
  try {
    const QR = (await import("qrcode")).default;
    const data = JSON.stringify({
      inst: "FUNATO",
      sur: student.surname,
      oth: student.otherNames,
      mat: student.matricNumber,
      dep: student.department,
      sex: student.sex,
      sec: student.securityString,
    });
    const url = await QR.toDataURL(data, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: P.qr.size * renderScale * 2,
      color: { dark: "#000000", light: "#ffffff" },
    });
    const qrImg = await loadImg(url);
    ctx.drawImage(
      qrImg,
      P.qr.left * renderScale,
      P.qr.top * renderScale,
      P.qr.size * renderScale,
      P.qr.size * renderScale,
    );
  } catch {
    /* skip QR on error */
  }

  // 11 ─ Passport photo
  const photoSrc = student.passportUrl || student.passportData;
  if (photoSrc) {
    try {
      const ph = await loadImg(photoSrc);
      ctx.save();
      roundRect(
        ctx,
        P.photo.left * renderScale,
        P.photo.top * renderScale,
        P.photo.w * renderScale,
        P.photo.h * renderScale,
        14 * renderScale,
      );
      ctx.clip();
      const ar = ph.width / ph.height,
        par = P.photo.w / P.photo.h;
      let sx = 0,
        sy = 0,
        sw = ph.width,
        sh = ph.height;
      if (ar > par) {
        sw = ph.height * par;
        sx = (ph.width - sw) / 2;
      } else {
        sh = ph.width / par;
        sy = Math.max(0, (ph.height - sh) / 2);
      }
      ctx.drawImage(
        ph,
        sx,
        sy,
        sw,
        sh,
        P.photo.left * renderScale,
        P.photo.top * renderScale,
        P.photo.w * renderScale,
        P.photo.h * renderScale,
      );
      ctx.restore();
    } catch {
      /* skip photo on error */
    }
  }

  // // 12 ─ Bottom security bar
  // const bg = ctx.createLinearGradient(0, P.bar.top, CARD_W, P.bar.top + P.bar.height);
  // bg.addColorStop(0,   '#2e1805');
  // bg.addColorStop(0.5, '#1a0e03');
  // bg.addColorStop(1,   '#2e1805');
  // ctx.fillStyle = bg;
  // roundRect(ctx, 0, P.bar.top, CARD_W, P.bar.height, 0, 18);
  // ctx.fill();

  // ctx.fillStyle    = BARCOL;
  // ctx.font         = font(F.security, 700, "'Courier New',monospace");
  // ctx.textAlign    = 'center';
  // ctx.textBaseline = 'middle';

  if (options.format === "jpeg") {
    return canvas.toDataURL(
      "image/jpeg",
      options.quality ?? PDF_JPEG_QUALITY,
    );
  }

  return canvas.toDataURL("image/png", 1.0);
}

// ── Utils ──────────────────────────────────────────────────────────
export async function renderIDCardsPdf(
  students: Student[],
  onProgress?: (count: number) => void,
): Promise<Uint8Array> {
  const { PDFDocument, rgb } = await import("pdf-lib");
  const fontkit = (await import("@pdf-lib/fontkit")).default;
  const QR = (await import("qrcode")).default;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const fontResponse = await fetch(LEXEND_EXTRA_BOLD_FONT);
  if (!fontResponse.ok) {
    throw new Error(
      `Lexend font not found: ${LEXEND_EXTRA_BOLD_FONT}`,
    );
  }
  const textFont = await pdfDoc.embedFont(
    new Uint8Array(await fontResponse.arrayBuffer()),
  );
  const pageWidth = 85.6 * MM_TO_PT;
  const pageHeight = 54 * MM_TO_PT;
  const xScale = pageWidth / CARD_W;
  const yScale = pageHeight / CARD_H;
  const px = (value: number) => value * xScale;
  const py = (value: number) => value * yScale;
  const textColor = rgb(0.051, 0.102, 0.051);

  const fitPdfFontSize = (
    text: string,
    baseSizePx: number,
    maxWidthPx: number,
    minSizePx = 8,
  ) => {
    for (let size = baseSizePx; size >= minSizePx; size -= 0.5) {
      if (
        textFont.widthOfTextAtSize(text, py(size)) <= px(maxWidthPx)
      ) {
        return py(size);
      }
    }
    return py(minSizePx);
  };

  const drawPdfText = (
    page: PDFPage,
    text: string | undefined,
    leftPx: number,
    topPx: number,
    baseSizePx: number,
    maxWidthPx: number,
    minSizePx = 8,
  ) => {
    const value = (text || "").toUpperCase();
    if (!value) return;

    const size = fitPdfFontSize(
      value,
      baseSizePx,
      maxWidthPx,
      minSizePx,
    );
    const x = px(leftPx);
    const y = pageHeight - py(topPx) - size;

    page.drawText(value, {
      x,
      y,
      size,
      font: textFont,
      color: textColor,
    });
  };

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const templateSrc = getIDCardTemplateSrc(student);
    const response = await fetch(templateSrc);
    if (!response.ok) {
      throw new Error(`Template not found: ${templateSrc}`);
    }

    const templateBytes = new Uint8Array(
      await response.arrayBuffer(),
    );
    const [templatePage] = await pdfDoc.embedPdf(templateBytes, [0]);
    const templateSize = templatePage.scale(1);
    const scale = Math.max(
      pageWidth / templateSize.width,
      pageHeight / templateSize.height,
    );
    const width = templateSize.width * scale;
    const height = templateSize.height * scale;

    page.drawPage(templatePage, {
      x: (pageWidth - width) / 2 - PDF_TEMPLATE_BLEED_PT,
      y: (pageHeight - height) / 2 - PDF_TEMPLATE_BLEED_PT,
      width: width + PDF_TEMPLATE_BLEED_PT * 2,
      height: height + PDF_TEMPLATE_BLEED_PT * 2,
    });

    drawPdfText(
      page,
      student.surname,
      P.surname.left,
      P.surname.top,
      F.surname,
      TEXT_W.surname,
      10,
    );
    drawPdfText(
      page,
      student.otherNames,
      P.otherName.left,
      P.otherName.top,
      F.otherName,
      TEXT_W.otherName,
      9,
    );
    drawPdfText(
      page,
      student.matricNumber,
      P.matric.left,
      P.matric.top,
      F.inline,
      TEXT_W.matric,
      9,
    );
    drawPdfText(
      page,
      student.sex,
      P.sex.left,
      P.sex.top,
      F.inline,
      TEXT_W.sex,
      9,
    );
    drawPdfText(
      page,
      student.department,
      P.dept.left,
      P.dept.top,
      F.dept,
      TEXT_W.dept,
      7,
    );
    drawPdfText(
      page,
      student.bloodGroup,
      P.blood.left,
      P.blood.top,
      F.inline,
      TEXT_W.blood,
      9,
    );
    drawPdfText(
      page,
      student.genotype,
      P.geno.left,
      P.geno.top,
      F.inline,
      TEXT_W.geno,
      9,
    );

    const qrData = JSON.stringify({
      inst: "FUNATO",
      sur: student.surname,
      oth: student.otherNames,
      mat: student.matricNumber,
      dep: student.department,
      sex: student.sex,
      sec: student.securityString,
    });
    const qrUrl = await QR.toDataURL(qrData, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: P.qr.size * 4,
      color: { dark: "#000000", light: "#ffffff" },
    });
    const qrImage = await pdfDoc.embedPng(dataUrlToBytes(qrUrl));
    page.drawImage(qrImage, {
      x: px(P.qr.left),
      y: pageHeight - py(P.qr.top + P.qr.size),
      width: px(P.qr.size),
      height: py(P.qr.size),
    });

    const photoSrc = student.passportUrl || student.passportData;
    if (photoSrc) {
      try {
        const photoDataUrl = await imageToJpegDataUrl(
          photoSrc,
          P.photo.w * 4,
          P.photo.h * 4,
        );
        const photo = await pdfDoc.embedJpg(
          dataUrlToBytes(photoDataUrl),
        );
        page.drawImage(photo, {
          x: px(P.photo.left),
          y: pageHeight - py(P.photo.top + P.photo.h),
          width: px(P.photo.w),
          height: py(P.photo.h),
        });
      } catch {
        /* skip photo on error */
      }
    }

    onProgress?.(i + 1);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return pdfDoc.save();
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function imageToJpegDataUrl(
  src: string,
  width: number,
  height: number,
): Promise<string> {
  const img = await loadImg(src);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const sourceRatio = img.width / img.height;
  const targetRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (sourceRatio > targetRatio) {
    sw = img.height * targetRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / targetRatio;
    sy = Math.max(0, (img.height - sh) / 2);
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", PDF_JPEG_QUALITY);
}

function clip(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
) {
  if (ctx.measureText(text).width <= maxW) return text;
  while (text.length > 1 && ctx.measureText(text + "…").width > maxW)
    text = text.slice(0, -1);
  return text + "…";
}

function fitFontSize(
  text: string,
  baseSize: number,
  maxW: number,
  minSize = 14,
) {
  const approximateWidth = text.length * baseSize * 0.58;
  if (approximateWidth <= maxW) return baseSize;
  return Math.max(
    minSize,
    Math.floor((maxW / approximateWidth) * baseSize),
  );
}

function fitCanvasFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  baseSize: number,
  maxW: number,
  minSize = 14,
  renderScale = 1,
) {
  for (let size = baseSize; size >= minSize; size--) {
    ctx.font = scaledFont(size, renderScale);
    if (ctx.measureText(text).width <= maxW * renderScale)
      return size;
  }
  return minSize;
}

function drawCleanText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  renderScale: number,
) {
  ctx.save();
  ctx.fillStyle = VCOL;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rTL = 0,
  rBR = 0,
) {
  const r = rTL || rBR;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - rBR);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rBR, y + h);
  ctx.lineTo(x + rBR, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rBR);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
