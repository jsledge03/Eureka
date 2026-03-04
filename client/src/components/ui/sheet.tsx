"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { useSwipeDismiss } from "@/lib/useSwipeDismiss"

const SheetCloseContext = React.createContext<(() => void) | null>(null)

function Sheet({ onOpenChange, ...props }: SheetPrimitive.DialogProps) {
  const handleClose = React.useCallback(() => {
    onOpenChange?.(false)
  }, [onOpenChange])

  return (
    <SheetCloseContext.Provider value={handleClose}>
      <SheetPrimitive.Root onOpenChange={onOpenChange} {...props} />
    </SheetCloseContext.Provider>
  )
}

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/40",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      "duration-300 ease-out data-[state=closed]:duration-200 data-[state=closed]:ease-in",
      className
    )}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out duration-300 ease-out data-[state=closed]:duration-200 data-[state=closed]:ease-in",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom rounded-t-[1.5rem]",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, onOpenAutoFocus, ...props }, ref) => {
  const closeFromContext = React.useContext(SheetCloseContext)
  const { contentEl, onTouchStart, onTouchMove, onTouchEnd } = useSwipeDismiss(
    closeFromContext || (() => {})
  )
  const isBottom = side === "bottom"

  const handleOpenAutoFocus = React.useCallback(
    (e: Event) => {
      if (onOpenAutoFocus) {
        onOpenAutoFocus(e)
        return
      }
      e.preventDefault()
    },
    [onOpenAutoFocus]
  )

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        ref={(node) => {
          contentEl.current = node
          if (typeof ref === "function") ref(node)
          else if (ref) ref.current = node
        }}
        onOpenAutoFocus={handleOpenAutoFocus}
        onTouchStart={isBottom ? onTouchStart : undefined}
        onTouchMove={isBottom ? onTouchMove : undefined}
        onTouchEnd={isBottom ? onTouchEnd : undefined}
        className={cn(sheetVariants({ side }), "overscroll-contain", className)}
        {...props}
      >
        {isBottom && (
          <div className="mx-auto -mt-2 mb-3 h-1 w-10 rounded-full bg-muted/60 sm:hidden" />
        )}
        <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
        {children}
        <SheetPrimitive.Description className="sr-only">Sheet content</SheetPrimitive.Description>
      </SheetPrimitive.Content>
    </SheetPortal>
  )
})
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
