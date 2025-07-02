
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    // Initialize with the current window width if available
    if (typeof window !== 'undefined') {
      return window.innerWidth < MOBILE_BREAKPOINT
    }
    return false
  })

  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Set immediately on mount
    handleResize()
    
    // Add event listener for resize
    window.addEventListener('resize', handleResize)
    
    // Modern approach using addEventListener for MediaQueryList
    mql.addEventListener("change", handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      mql.removeEventListener("change", handleResize)
    }
  }, [])

  return isMobile
}
