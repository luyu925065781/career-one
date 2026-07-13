import localFont from "next/font/local";

// Font binaries live in the repository so builds never depend on Google Fonts.
export const inter = localFont({
  src: "../assets/fonts/InterVariable.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-inter",
  display: "swap",
});

// Editorial display face for headings and pull quotes.
export const instrumentSerif = localFont({
  src: "../assets/fonts/InstrumentSerif-Regular.woff2",
  weight: "400",
  style: "normal",
  variable: "--font-instrument-serif",
  display: "swap",
});

export const instrumentSerifItalic = localFont({
  src: "../assets/fonts/InstrumentSerif-Italic.woff2",
  weight: "400",
  style: "italic",
  variable: "--font-instrument-serif-italic",
  display: "swap",
});
