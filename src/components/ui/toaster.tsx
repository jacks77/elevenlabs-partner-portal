import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props} className="shadow-elegant border-primary/20 bg-card/98 backdrop-blur-md min-w-[350px]">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              </div>
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle className="text-card-foreground font-semibold text-center">{title}</ToastTitle>}
                {description && (
                  <ToastDescription className="text-muted-foreground text-center">{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose className="hover:bg-accent/50 transition-colors" />
          </Toast>
        )
      })}
      <ToastViewport className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] flex max-h-screen w-full flex-col p-4 md:max-w-[420px]" />
    </ToastProvider>
  )
}
