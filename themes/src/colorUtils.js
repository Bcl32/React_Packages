export function hexToHSL(hex) {
  hex = hex.replace("#", "");

  const hasAlpha = hex.length === 8; // 8 characters for #RRGGBBAA
  let alpha = 1;

  if (hasAlpha) {
    alpha = parseInt(hex.substring(6, 8), 16) / 255;
  }

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const delta = max - min;
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case r:
        h = (g - b) / delta + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      case b:
        h = (r - g) / delta + 4;
        break;
    }
    h *= 60;
  }

  return {
    hue: Math.round(h),
    saturation: Math.round(s * 100),
    lightness: Math.round(l * 100),
    alpha: alpha ?? 1,
  };
}

export const rgbToHSL = (r, g, b) => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0,
    s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    hue: Math.round(h * 360),
    saturation: Math.round(s * 100),
    lightness: Math.round(l * 100),
    alpha: 1,
  };
};

export function hslToHex(h, s, l, a) {
  h = ((h % 360) + 360) % 360;
  s = Math.min(Math.max(s, 0), 100);
  l = Math.min(Math.max(l, 0), 100);
  a = Math.min(Math.max(a, 0), 1);
  l /= 100;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color =
      l -
      a *
        (s / 100) *
        Math.min(l, 1 - l) *
        Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const hslToRGB = ({ hue, saturation, lightness, alpha }) => {
  const s = saturation / 100;
  const l = lightness / 100;
  const k = (n) => (n + hue / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  return {
    r: Math.round(255 * f(0)),
    g: Math.round(255 * f(8)),
    b: Math.round(255 * f(4)),
  };
};

export const parseToHSL = (color) => {
  const hslFunctionRegex =
    /^(?:hsl|hsla)\(\s*([\d.-]+)(?:deg)?\s*\s*([\d.]+)%\s*\s*([\d.]+)%\s*(?:\s*([\d.]+%?))?\s*\)$/i;

  //old style with commas
  //const hslFunctionRegex =
  ///^(?:hsl|hsla)\(\s*([\d.-]+)(?:deg)?\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+%?))?\s*\)$/i;

  const rgbFunctionRegex =
    /^(?:rgb|rgba)\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+%?))?\s*\)$/i;
  const hexRegex = /^#?([a-fA-F0-9]{3,8})$/i;

  let match;
  if ((match = color.match(hslFunctionRegex))) {
    return {
      hue: parseFloat(match[1]),
      saturation: parseFloat(match[2]),
      lightness: parseFloat(match[3]),
      alpha: match[4]
        ? match[4].endsWith("%")
          ? parseFloat(match[4]) / 100
          : parseFloat(match[4])
        : 1,
    };
  } else if ((match = color.match(rgbFunctionRegex))) {
    const r = parseFloat(match[1]);
    const g = parseFloat(match[2]);
    const b = parseFloat(match[3]);
    return rgbToHSL(r, g, b);
  } else if ((match = color.match(hexRegex))) {
    return hexToHSL(color);
  } else {
    return null;
  }
};

export const convertColor = (color, outputFormat) => {
  const hsl = parseToHSL(color);
  if (!hsl) return null;

  switch (outputFormat) {
    case "hex":
      return hslToHex(hsl.hue, hsl.saturation, hsl.lightness, hsl.alpha ?? 1);
    case "rgb":
      const { r, g, b } = hslToRGB(hsl);
      return `rgb(${r}, ${g}, ${b})`;
    case "rgba":
      const rgba = hslToRGB(hsl);
      return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${hsl.alpha})`;
    case "hsl":
      return `hsl(${hsl.hue}, ${hsl.saturation}%, ${hsl.lightness}%)`;
    case "hsla":
      return `hsla(${hsl.hue}, ${hsl.saturation}%, ${hsl.lightness}%, ${hsl.alpha})`;
    case "custom":
      return (hsl.alpha ?? 1) < 1
        ? `--primary: ${hsl.hue} ${hsl.saturation}% ${hsl.lightness}% ${hsl.alpha};`
        : `--primary: ${hsl.hue} ${hsl.saturation}% ${hsl.lightness}%;`;
    default:
      return null;
  }
};

export const createColor = (baseHue, saturation, lightness, alpha = 1) => ({
  hue: baseHue,
  saturation,
  lightness,
  alpha,
});

export const hslToObject = (color) => {
  const hslFunctionRegex =
    /^(?:hsl|hsla)\(\s*([\d.-]+)(?:deg)?\s*\s*([\d.]+)%\s*\s*([\d.]+)%\s*(?:\s*([\d.]+%?))?\s*\)$/i;

  //old style with commas
  //const hslFunctionRegex =
  ///^(?:hsl|hsla)\(\s*([\d.-]+)(?:deg)?\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+%?))?\s*\)$/i;

  let match;
  if ((match = color.match(hslFunctionRegex))) {
    return {
      hue: parseFloat(match[1]),
      saturation: parseFloat(match[2]),
      lightness: parseFloat(match[3]),
      alpha: match[4]
        ? match[4].endsWith("%")
          ? parseFloat(match[4]) / 100
          : parseFloat(match[4])
        : 1,
    };
  } else {
    return null;
  }
};
