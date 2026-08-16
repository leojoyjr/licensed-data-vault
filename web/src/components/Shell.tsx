import { useEffect, useState, type ReactNode } from "react";
import "./material.js";

/**
 * App shell: a small top app bar plus a navigation rail, the M3 pattern for a
 * three-destination app on a wide screen. The rail collapses to a bottom
 * navigation bar under 600px through the media query in theme/m3.css.
 */
export type ViewId = "upload" | "read" | "audit";

export interface ShellDestination {
    id: ViewId;
    label: string;
    /** Material Symbols ligature name rendered inside md-icon. */
    icon: string;
}

export const SHELL_DESTINATIONS: readonly ShellDestination[] = [
    { id: "upload", label: "Upload", icon: "cloud_upload" },
    { id: "read", label: "Read", icon: "receipt_long" },
    { id: "audit", label: "Audit", icon: "verified" },
];

export interface ShellProps {
    activeView: ViewId;
    onNavigate: (view: ViewId) => void;
    children: ReactNode;
}

export function Shell({ activeView, onNavigate, children }: ShellProps) {
    /**
     * The top app bar changes to the surface-container color once content scrolls
     * under it, which is the on-scroll state the top app bar spec describes.
     */
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 0);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <>
            <header className={`top-app-bar${scrolled ? " top-app-bar--scrolled" : ""}`}>
                <span className="top-app-bar__leading" aria-hidden="true">
                    <md-icon>shield_lock</md-icon>
                </span>
                <h1 className="m3-title-large">LicenNode</h1>
                <span className="top-app-bar__account m3-label-medium">Shelby testnet</span>
            </header>
            <div className="app-shell">
                {/*
                 * The rail is a tablist: each destination swaps the whole main pane,
                 * so tab semantics describe it more accurately than a nav landmark
                 * full of links that go nowhere.
                 */}
                <nav className="nav-rail" role="tablist" aria-label="LicenNode sections">
                    {SHELL_DESTINATIONS.map((destination) => {
                        const selected = destination.id === activeView;
                        return (
                            <button
                                key={destination.id}
                                type="button"
                                role="tab"
                                id={`tab-${destination.id}`}
                                aria-selected={selected}
                                aria-controls={`panel-${destination.id}`}
                                className="nav-rail__item"
                                onClick={() => onNavigate(destination.id)}
                            >
                                <span className="nav-rail__indicator">
                                    <md-icon aria-hidden="true">{destination.icon}</md-icon>
                                </span>
                                {destination.label}
                            </button>
                        );
                    })}
                </nav>
                <main
                    className="main-pane"
                    role="tabpanel"
                    id={`panel-${activeView}`}
                    aria-labelledby={`tab-${activeView}`}
                >
                    {children}
                </main>
            </div>
        </>
    );
}
