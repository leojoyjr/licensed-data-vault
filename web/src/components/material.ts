/**
 * Registers the Material Web custom elements this site uses, and declares them to
 * JSX so React can render them with type checking.
 *
 * Only the elements actually rendered are imported. Pulling @material/web/all.js
 * would register every component in the library and ship code no view uses.
 */
import "@material/web/button/filled-button.js";
import "@material/web/button/outlined-button.js";
import "@material/web/button/text-button.js";
import "@material/web/textfield/outlined-text-field.js";
import "@material/web/select/outlined-select.js";
import "@material/web/select/select-option.js";
import "@material/web/progress/circular-progress.js";
import "@material/web/progress/linear-progress.js";
import "@material/web/chips/chip-set.js";
import "@material/web/chips/assist-chip.js";
import "@material/web/divider/divider.js";
import "@material/web/icon/icon.js";
import "@material/web/labs/card/outlined-card.js";
import "@material/web/labs/card/filled-card.js";

import type { MdFilledButton } from "@material/web/button/filled-button.js";
import type { MdOutlinedButton } from "@material/web/button/outlined-button.js";
import type { MdTextButton } from "@material/web/button/text-button.js";
import type { MdOutlinedTextField } from "@material/web/textfield/outlined-text-field.js";
import type { MdOutlinedSelect } from "@material/web/select/outlined-select.js";
import type { MdSelectOption } from "@material/web/select/select-option.js";

/**
 * Props shared by the elements this site renders. React needs each custom element
 * spelled out, and the attribute names are the ones the components read, for
 * example `label` on a text field and `value` on a select option.
 */
type MaterialElementProps<T> = React.DetailedHTMLProps<React.HTMLAttributes<T>, T>;

declare global {
    namespace React.JSX {
        interface IntrinsicElements {
            "md-filled-button": MaterialElementProps<MdFilledButton> & {
                disabled?: boolean;
                type?: "button" | "submit" | "reset";
            };
            "md-outlined-button": MaterialElementProps<MdOutlinedButton> & {
                disabled?: boolean;
                type?: "button" | "submit" | "reset";
            };
            "md-text-button": MaterialElementProps<MdTextButton> & {
                disabled?: boolean;
                type?: "button" | "submit" | "reset";
            };
            "md-outlined-text-field": MaterialElementProps<MdOutlinedTextField> & {
                label?: string;
                value?: string;
                type?: string;
                required?: boolean;
                disabled?: boolean;
                "supporting-text"?: string;
                "error-text"?: string;
                error?: boolean;
                maxlength?: number;
                placeholder?: string;
            };
            "md-outlined-select": MaterialElementProps<MdOutlinedSelect> & {
                label?: string;
                value?: string;
                disabled?: boolean;
                "supporting-text"?: string;
            };
            "md-select-option": MaterialElementProps<MdSelectOption> & {
                value?: string;
                selected?: boolean;
            };
            "md-circular-progress": MaterialElementProps<HTMLElement> & {
                indeterminate?: boolean;
                value?: number;
            };
            "md-linear-progress": MaterialElementProps<HTMLElement> & {
                indeterminate?: boolean;
                value?: number;
            };
            "md-chip-set": MaterialElementProps<HTMLElement>;
            "md-assist-chip": MaterialElementProps<HTMLElement> & {
                label?: string;
                disabled?: boolean;
            };
            "md-divider": MaterialElementProps<HTMLElement> & { inset?: boolean };
            "md-icon": MaterialElementProps<HTMLElement>;
            "md-outlined-card": MaterialElementProps<HTMLElement>;
            "md-filled-card": MaterialElementProps<HTMLElement>;
        }
    }
}
