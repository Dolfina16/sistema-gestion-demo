import { createTheme } from "@mui/material/styles"

// ============================================================
// Tema de la aplicación
// Paleta cálida (terracota + crema) elegida para una residencia:
// menos clínica que el azul institucional, alto contraste sobre
// fondo claro y legible para usuarios mayores.
// El sistema tipográfico y los refinamientos de material
// se construyen alrededor de esa paleta.
// ============================================================

// --- Colores de marca ---
const CLAY = "#C57B57"      // primary — terracota
const CLAY_DEEP = "#8A5A44" // secondary — marrón
const SAND = "#d8c8ac"      // fondo general
const CREAM = "#F5EFE6"     // cards / dialogs
const INK = "#5E4636"       // texto principal
const DIVIDER = "#D6C7B8"

// --- Sombras tintadas en marrón (en vez de negro puro) ---
const shadowSoft = "0 1px 2px rgba(94,70,54,0.05), 0 4px 16px rgba(94,70,54,0.07)"
const shadowLift = "0 2px 6px rgba(94,70,54,0.08), 0 12px 28px rgba(94,70,54,0.12)"

const theme = createTheme({
  palette: {
    mode: "light",

    primary: { main: CLAY },
    secondary: { main: CLAY_DEEP },

    background: {
      default: SAND,
      paper: CREAM
    },

    text: {
      primary: INK,
      secondary: CLAY_DEEP
    },

    divider: DIVIDER,

    // Estados armonizados con la paleta tierra (rojo sigue leyéndose como deuda)
    success: { main: "#5E8C61" },
    warning: { main: "#C5821E" },
    error: { main: "#C0392B" },
    info: { main: "#5C7E8C" }
  },

  shape: {
    borderRadius: 16
  },

  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',

    // Poppins lleva la personalidad (títulos); Inter el cuerpo y los datos.
    h1: { fontFamily: '"Poppins", sans-serif', fontWeight: 700, letterSpacing: "-0.5px" },
    h2: { fontFamily: '"Poppins", sans-serif', fontWeight: 700, letterSpacing: "-0.4px" },
    h3: { fontFamily: '"Poppins", sans-serif', fontWeight: 700, letterSpacing: "-0.3px" },
    h4: { fontFamily: '"Poppins", sans-serif', fontWeight: 700, letterSpacing: "-0.2px" },
    h5: { fontFamily: '"Poppins", sans-serif', fontWeight: 700, letterSpacing: "-0.1px" },
    h6: { fontFamily: '"Poppins", sans-serif', fontWeight: 600 },

    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 600 },
    button: { fontFamily: '"Poppins", sans-serif', fontWeight: 600, letterSpacing: "0.1px" },
    overline: { letterSpacing: "0.8px", fontWeight: 600 }
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: SAND,
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale"
        }
      }
    },

    // TODAS LAS CARDS — material de papel cálido
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: CREAM,
          border: `1px solid ${DIVIDER}`,
          boxShadow: shadowSoft,
          transition: "box-shadow 180ms ease, transform 180ms ease"
        }
      }
    },

    MuiPaper: {
      styleOverrides: {
        outlined: {
          borderColor: DIVIDER
        }
      }
    },

    // TODOS LOS BOTONES — táctiles
    MuiButton: {
      defaultProps: {
        disableElevation: true
      },
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 12,
          paddingTop: 8,
          paddingBottom: 8,
          transition: "background-color 150ms ease, box-shadow 150ms ease, transform 120ms ease",
          "&:active": {
            transform: "translateY(1px)"
          }
        },
        contained: {
          boxShadow: "0 2px 8px rgba(197,123,87,0.30)",
          "&:hover": {
            boxShadow: "0 4px 14px rgba(197,123,87,0.40)"
          }
        },
        outlined: {
          borderColor: DIVIDER,
          "&:hover": {
            borderColor: CLAY,
            backgroundColor: "rgba(197,123,87,0.06)"
          }
        }
      }
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 18,
          boxShadow: shadowLift
        }
      }
    },

    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: "28px 24px 8px",
          // MUI some versions zero out padding-top for first-of-type; override explicitly
          "&:first-of-type": {
            paddingTop: "28px"
          }
        }
      }
    },

    MuiInputLabel: {
      defaultProps: {
        shrink: true
      }
    },

    MuiDialogTitle: {
      styleOverrides: {
        root: {
          backgroundColor: "#C97B50",
          color: "white",
          fontFamily: '"Poppins", sans-serif',
          fontWeight: 700,
          letterSpacing: "0.2px",
          paddingTop: 12,
          paddingBottom: 12
        }
      }
    },

    MuiTableContainer: {
      styleOverrides: {
        root: {
          border: `1px solid ${DIVIDER}`,
          boxShadow: shadowSoft
        }
      }
    },

    MuiTableCell: {
      styleOverrides: {
        head: {
          fontFamily: '"Inter", sans-serif',
          fontWeight: 700,
          fontSize: "0.75rem",
          letterSpacing: "0.3px",
          textTransform: "uppercase",
          backgroundColor: "#c0aa8d",
          color: "#4A3525",
          borderBottom: `1px solid #CBBFB1`,
          // encabezado más compacto para dar lugar al cuerpo
          paddingTop: 8,
          paddingBottom: 8
        },
        body: {
          fontVariantNumeric: "tabular-nums",
          borderBottom: `1px solid ${DIVIDER}`
        }
      }
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: "background-color 120ms ease",
          "&:hover": {
            backgroundColor: "rgba(197,123,87,0.06)"
          }
        }
      }
    },

    MuiOutlinedInput: {
      defaultProps: {
        notched: true
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          "& fieldset": { borderColor: DIVIDER },
          "&:hover fieldset": { borderColor: CLAY },
          "&.Mui-focused fieldset": { borderColor: CLAY }
        }
      }
    },

    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8
        }
      }
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          boxShadow: "0 1px 0 rgba(94,70,54,0.12), 0 6px 20px rgba(94,70,54,0.10)"
        }
      }
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: INK,
          fontSize: "0.75rem",
          fontWeight: 500,
          borderRadius: 8,
          padding: "6px 10px"
        },
        arrow: {
          color: INK
        }
      }
    }
  }
})

export default theme
