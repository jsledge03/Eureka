import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { useSwipeDismiss } from "@/lib/useSwipeDismiss"

const DialogCloseContext = React.createContext<(() => void) | null>(null)

function Dialog({ onOpenChange, ...props }: DialogPrimitive.DialogProps) {
  const handleClose = React.useCallback(() => {
    onOpenChange?.(false)
  }, [onOpenChange])

  return (
    <DialogCloseContext.Provider value={handleClose}>
      <DialogPrimitive.Root onOpenChange={onOpenChange} {...props} />
    </DialogCloseContext.Provider>
  )
}

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/40",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      "duration-300 ease-out data-[state=closed]:duration-200 data-[state=closed]:ease-in",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, onOpenAutoFocus, ...props }, ref) => {
  const closeFromContext = React.useContext(DialogCloseContext)
  const { contentEl, onTouchStart, onTouchMove, onTouchEnd } = useSwipeDismiss(
    closeFromContext || (() => {})
  )

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
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={(node) => {
          contentEl.current = node
          if (typeof ref === "function") ref(node)
          else if (ref) ref.current = node
        }}
        onOpenAutoFocus={handleOpenAutoFocus}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={cn(
          "fixed left-0 right-0 bottom-0 z-50 w-full bg-background shadow-2xl",
          "rounded-t-[1.5rem]",
          "max-h-[85vh] overflow-y-auto overscroll-contain",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom-[30%]",
          "duration-300 ease-out data-[state=closed]:duration-200 data-[state=closed]:ease-in",
          "sm:left-[50%] sm:right-auto sm:bottom-auto sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-lg sm:rounded-2xl",
          "sm:data-[state=closed]:slide-out-to-bottom-[2%] sm:data-[state=open]:slide-in-from-bottom-[2%]",
          "sm:data-[state=closed]:fade-out-0 sm:data-[state=open]:fade-in-0",
          className
        )}
        {...props}
      >
        <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-muted/60 sm:hidden" />
        {children}
        <DialogPrimitive.Description className="sr-only">Dialog content</DialogPrimitive.Description>
        <div className="safe-bottom" />
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-1 opacity-60 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hidden sm:flex">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left px-6 pt-4 pb-3",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 px-6 pb-4 pt-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
