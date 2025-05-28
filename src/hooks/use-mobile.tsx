
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined) // Start as undefined

  React.useEffect(() => {
    // This effect runs only on the client after hydration
    const checkDevice = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    checkDevice(); // Initial check on client mount

    window.addEventListener("resize", checkDevice);

    // Cleanup listener on component unmount
    return () => window.removeEventListener("resize", checkDevice);
  }, []); // Empty dependency array ensures this runs once on mount

  return isMobile; // Return the state (undefined initially, then boolean)
}
