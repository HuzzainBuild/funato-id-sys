"use client";

import { useEffect, useRef, useState } from "react";
import type { Student } from "@/types";
import { getIDCardTemplateSrc } from "@/lib/cardTemplates";

export const CARD_W = 1017;
export const CARD_H = 638;
const EXPORT_SCALE = 2;
const PDF_JPEG_QUALITY = 0.86;

// ─── Exact positions (px at native 1017×638) ──────────────────────

const P = {
  surname: { left: 60, top: 285 },
  otherName: { left: 60, top: 375 },
  matric: { left: 220, top: 430 },
  sex: { left: 450, top: 430 },
  dept: { left: 60, top: 510 },
  blood: { left: 260, top: 560 },
  geno: { left: 540, top: 560 },
  qr: { left: 480, top: 250, size: 170 },
  photo: { left: 690, top: 285, w: 290, h: 300 },
};

// Font sizes at native resolution
const F = {
  surname: 36,
  otherName: 27,
  inline: 27, // matric, sex, blood, geno
  dept: 22,
};

const VCOL = "#0d1a0d"; // value text colour
const TEXT_HALO = "0 1px 1px rgba(255,255,255,0.72)";
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
      if (onRendered && renderForExport) {
        try {
          const cardUrl = await renderIDCard(student);
          onRendered(cardUrl);
        } catch {
          onRendered(url);
        }
      }
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
  ctx.lineWidth = Math.max(1, 1.35 * renderScale);
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.strokeText(text, x, y);
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
