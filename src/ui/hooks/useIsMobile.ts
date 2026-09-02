import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 768px)";

/** Tracks the mobile breakpoint used by responsive.css (spec §37) so split views can become tabs. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(MOBILE_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia(MOBILE_QUERY);
    const handleChange = () => setIsMobile(media.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
}

export default useIsMobile;
