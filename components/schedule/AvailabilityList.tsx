
import React from 'react';

// Local dark mode detector: supports class-based dark and OS media preference
const useIsDarkTheme = () => {
    const [isDark, setIsDark] = React.useState(false);

    React.useEffect(() => {
        const check = () => {
            // Consider any element carrying the 'dark' class
            const darkCarrier = document.querySelector('.dark');
            // Also consider OS-level dark preference (Tailwind v4 often compiles dark: to media)
            const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            setIsDark(!!darkCarrier || !!prefersDark);
        };
        check();

        const observer = new MutationObserver(check);
        // Watch for class changes anywhere in the document
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'], subtree: true });

        // Listen to OS theme changes too
        let mql: MediaQueryList | null = null;
        if (typeof window !== 'undefined' && window.matchMedia) {
            mql = window.matchMedia('(prefers-color-scheme: dark)');
            // Modern browsers
            if (typeof mql.addEventListener === 'function') mql.addEventListener('change', check);
            // Fallback
            else if (typeof (mql as any).addListener === 'function') (mql as any).addListener(check);
        }

        return () => {
            observer.disconnect();
            if (mql) {
                if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', check);
                else if (typeof (mql as any).removeListener === 'function') (mql as any).removeListener(check);
            }
        };
    }, []);

    return isDark;
};

export const AvailabilityList: React.FC<{
    title: string;
    members: string[];
    bgColor: string;
    textColor: string;
}> = ({ title, members, bgColor, textColor }) => {
    const isDark = useIsDarkTheme();
    // In dark mode use a dark gradient per category; in light mode use the provided tint color
    const containerStyle = React.useMemo(() => {
        // Map the provided hex to low-alpha rgba in dark mode, as it was originally
        if (!isDark) {
            return { backgroundColor: bgColor } as React.CSSProperties;
        }
        // Derive a low-alpha rgba from the bgColor hex to preserve the hue with subtle transparency in dark
        const hexToRgba = (hex: string, alpha: number): string => {
            const h = hex.replace('#', '').trim();
            const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
            if (!/^[0-9a-fA-F]{6}$/.test(full)) return `rgba(100, 100, 100, ${alpha})`;
            const num = parseInt(full, 16);
            const r = (num >> 16) & 255;
            const g = (num >> 8) & 255;
            const b = num & 255;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };
        return { backgroundColor: hexToRgba(bgColor, 0.1) } as React.CSSProperties;
    }, [bgColor, isDark]);

    return (
        <div className="p-3 rounded-lg text-center" style={containerStyle}>
            <h4 className={`text-sm font-bold mb-2 ${textColor}`}>{title}</h4>
            <ul className="text-xs space-y-1">
                {members.length > 0 ? (
                    members.map((name, i) => <li key={i} className={textColor}>{name}</li>)
                ) : (
                    <li className={`${textColor} opacity-70`}>None</li>
                )}
            </ul>
        </div>
    );
};
