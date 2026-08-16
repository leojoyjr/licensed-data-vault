/**
 * Material Design 3 tokens, the single source of every color, shape, and type
 * value in this site.
 *
 * The values are the light scheme of the baseline Material 3 palette, taken from
 * the token files shipped inside @material/web 2.5.0, design system version
 * v0.192, which is the same generated data the components themselves consume:
 *
 *   node_modules/@material/web/tokens/versions/v0_192/_md-sys-color.scss
 *   node_modules/@material/web/tokens/versions/v0_192/_md-ref-palette.scss
 *   node_modules/@material/web/tokens/versions/v0_192/_md-sys-shape.scss
 *   node_modules/@material/web/tokens/versions/v0_192/_md-sys-typescale.scss
 *   node_modules/@material/web/tokens/versions/v0_192/_md-sys-state.scss
 *   node_modules/@material/web/tokens/versions/v0_192/_md-sys-elevation.scss
 *
 * They match the published spec at https://m3.material.io/styles/color/system/overview,
 * https://m3.material.io/styles/shape/overview-principles, and
 * https://m3.material.io/styles/typography/type-scale-tokens.
 *
 * Every value is emitted as a `--md-sys-*` custom property, which is the name the
 * Material Web components already read, so setting them here themes the built-in
 * components and the surrounding layout from one place. A hex color written
 * anywhere outside this file is a defect.
 */

/** Color roles used by this site, resolved from the baseline palette. */
export const M3_LIGHT_COLOR_ROLES = {
    primary: "#6750a4",
    "on-primary": "#ffffff",
    "primary-container": "#eaddff",
    "on-primary-container": "#21005d",
    secondary: "#625b71",
    "on-secondary": "#ffffff",
    "secondary-container": "#e8def8",
    "on-secondary-container": "#1d192b",
    tertiary: "#7d5260",
    "on-tertiary": "#ffffff",
    "tertiary-container": "#ffd8e4",
    "on-tertiary-container": "#31111d",
    error: "#b3261e",
    "on-error": "#ffffff",
    "error-container": "#f9dedc",
    "on-error-container": "#410e0b",
    background: "#fef7ff",
    "on-background": "#1d1b20",
    surface: "#fef7ff",
    "on-surface": "#1d1b20",
    "surface-variant": "#e7e0ec",
    "on-surface-variant": "#49454f",
    "surface-container-lowest": "#ffffff",
    "surface-container-low": "#f7f2fa",
    "surface-container": "#f3edf7",
    "surface-container-high": "#ece6f0",
    "surface-container-highest": "#e6e0e9",
    "surface-dim": "#ded8e1",
    "surface-bright": "#fef7ff",
    "surface-tint": "#6750a4",
    outline: "#79747e",
    "outline-variant": "#cac4d0",
    "inverse-surface": "#322f35",
    "inverse-on-surface": "#f5eff7",
    "inverse-primary": "#d0bcff",
    shadow: "#000000",
    scrim: "#000000",
} as const;

/** Shape scale. Cards use medium, the M3 default for a card container. */
export const M3_SHAPE_CORNERS = {
    none: "0px",
    "extra-small": "4px",
    small: "8px",
    medium: "12px",
    large: "16px",
    "extra-large": "28px",
    full: "9999px",
} as const;

export const M3_TYPEFACES = {
    plain: "Roboto, system-ui, sans-serif",
    brand: "Roboto, system-ui, sans-serif",
    "weight-regular": "400",
    "weight-medium": "500",
    "weight-bold": "700",
} as const;

/**
 * Type scale roles. Only the roles this site renders are listed, since a token
 * nothing consumes is dead weight. Sizes are in rem exactly as the spec defines
 * them, so the scale still holds if the user changes their browser font size.
 */
export interface M3TypeRole {
    size: string;
    lineHeight: string;
    weight: string;
    tracking: string;
}

export const M3_TYPESCALE = {
    "display-small": {
        size: "2.25rem",
        lineHeight: "2.75rem",
        weight: M3_TYPEFACES["weight-regular"],
        tracking: "0rem",
    },
    "headline-large": {
        size: "2rem",
        lineHeight: "2.5rem",
        weight: M3_TYPEFACES["weight-regular"],
        tracking: "0rem",
    },
    "headline-medium": {
        size: "1.75rem",
        lineHeight: "2.25rem",
        weight: M3_TYPEFACES["weight-regular"],
        tracking: "0rem",
    },
    "headline-small": {
        size: "1.5rem",
        lineHeight: "2rem",
        weight: M3_TYPEFACES["weight-regular"],
        tracking: "0rem",
    },
    "title-large": {
        size: "1.375rem",
        lineHeight: "1.75rem",
        weight: M3_TYPEFACES["weight-regular"],
        tracking: "0rem",
    },
    "title-medium": {
        size: "1rem",
        lineHeight: "1.5rem",
        weight: M3_TYPEFACES["weight-medium"],
        tracking: "0.009375rem",
    },
    "title-small": {
        size: "0.875rem",
        lineHeight: "1.25rem",
        weight: M3_TYPEFACES["weight-medium"],
        tracking: "0.00625rem",
    },
    "body-large": {
        size: "1rem",
        lineHeight: "1.5rem",
        weight: M3_TYPEFACES["weight-regular"],
        tracking: "0.03125rem",
    },
    "body-medium": {
        size: "0.875rem",
        lineHeight: "1.25rem",
        weight: M3_TYPEFACES["weight-regular"],
        tracking: "0.015625rem",
    },
    "body-small": {
        size: "0.75rem",
        lineHeight: "1rem",
        weight: M3_TYPEFACES["weight-regular"],
        tracking: "0.025rem",
    },
    "label-large": {
        size: "0.875rem",
        lineHeight: "1.25rem",
        weight: M3_TYPEFACES["weight-medium"],
        tracking: "0.00625rem",
    },
    "label-medium": {
        size: "0.75rem",
        lineHeight: "1rem",
        weight: M3_TYPEFACES["weight-medium"],
        tracking: "0.03125rem",
    },
    "label-small": {
        size: "0.6875rem",
        lineHeight: "1rem",
        weight: M3_TYPEFACES["weight-medium"],
        tracking: "0.03125rem",
    },
} as const satisfies Record<string, M3TypeRole>;

export type M3TypeRoleName = keyof typeof M3_TYPESCALE;

/** State layer opacities from the M3 states spec, used for hover and pressed layers. */
export const M3_STATE_LAYER_OPACITY = {
    hover: "0.08",
    focus: "0.12",
    pressed: "0.12",
    dragged: "0.16",
} as const;

/**
 * Elevation levels as dp numbers. Shadows are drawn from these rather than from
 * invented blur values, so a raised surface matches the spec's rendering.
 */
export const M3_ELEVATION_DP = {
    level0: 0,
    level1: 1,
    level2: 3,
    level3: 6,
    level4: 8,
    level5: 12,
} as const;

/** M3 layout spacing is a 4dp grid, so every gap is a multiple of this. */
export const M3_SPACING_BASE_PX = 4;

/**
 * Builds the CSS text that defines every token as a custom property. Colors and
 * typography use the `--md-sys-*` names the Material Web components read, so the
 * theme applies to the components and to plain layout elements identically.
 */
export function buildM3TokenCss(): string {
    const declarations: string[] = [];

    for (const [role, value] of Object.entries(M3_LIGHT_COLOR_ROLES)) {
        declarations.push(`--md-sys-color-${role}: ${value};`);
    }
    for (const [name, value] of Object.entries(M3_SHAPE_CORNERS)) {
        declarations.push(`--md-sys-shape-corner-${name}: ${value};`);
    }
    for (const [name, value] of Object.entries(M3_TYPEFACES)) {
        declarations.push(`--md-ref-typeface-${name}: ${value};`);
    }
    for (const [role, scale] of Object.entries(M3_TYPESCALE)) {
        declarations.push(
            `--md-sys-typescale-${role}-font: ${M3_TYPEFACES.plain};`,
            `--md-sys-typescale-${role}-size: ${scale.size};`,
            `--md-sys-typescale-${role}-line-height: ${scale.lineHeight};`,
            `--md-sys-typescale-${role}-weight: ${scale.weight};`,
            `--md-sys-typescale-${role}-tracking: ${scale.tracking};`,
        );
    }
    for (const [state, opacity] of Object.entries(M3_STATE_LAYER_OPACITY)) {
        declarations.push(`--md-sys-state-${state}-state-layer-opacity: ${opacity};`);
    }
    for (const [level, dp] of Object.entries(M3_ELEVATION_DP)) {
        declarations.push(`--md-sys-elevation-${level}: ${dp};`);
    }
    declarations.push(`--vault-spacing-base: ${M3_SPACING_BASE_PX}px;`);

    return `:root {\n  ${declarations.join("\n  ")}\n}`;
}
