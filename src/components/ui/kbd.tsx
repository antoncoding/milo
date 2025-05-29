import * as React from "react"
import { cn } from "../../lib/utils"

interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  disabled?: boolean
}

const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ className, disabled = false, children, ...props }, ref) => {
    return (
      <kbd
        className={cn(
          // Base styles
          "inline-flex items-center justify-center",
          "px-2 py-1 min-w-[2rem] h-7",
          "text-xs font-semibold",
          "rounded-md border border-b-2",
          "transition-all duration-150",
          // Light mode
          disabled
            ? "bg-gray-100 border-gray-200 border-b-gray-300 text-gray-400 shadow-none"
            : "bg-white border-gray-300 border-b-gray-400 text-gray-700 shadow-sm hover:shadow-md",
          // Dark mode
          disabled
            ? "dark:bg-gray-800 dark:border-gray-700 dark:border-b-gray-600 dark:text-gray-500"
            : "dark:bg-gray-700 dark:border-gray-600 dark:border-b-gray-500 dark:text-gray-200",
          // Active state (pressed key effect)
          !disabled && "active:translate-y-0.5 active:border-b active:shadow-none",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </kbd>
    )
  }
)
Kbd.displayName = "Kbd"

export { Kbd } 