"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"
import { strings } from "@/strings";


const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = strings.ui.system } = useTheme()

  return (
    <Sonner
      theme={theme === strings.common.light || theme === strings.common.dark ? theme : strings.ui.system}
      className={strings.ui.toasterGroup}
      icons={{
        success: (
          <CircleCheckIcon className={strings.ui.size4} />
        ),
        info: (
          <InfoIcon className={strings.ui.size4} />
        ),
        warning: (
          <TriangleAlertIcon className={strings.ui.size4} />
        ),
        error: (
          <OctagonXIcon className={strings.ui.size4} />
        ),
        loading: (
          <Loader2Icon className={strings.ui.size4AnimateSpin} />
        ),
      }}
      style={
        {
          [strings.ui.normalBg]: strings.ui.varPopover,
          [strings.ui.normalText]: strings.ui.varPopoverForeground,
          [strings.ui.normalBorder]: strings.ui.varBorder,
          [strings.ui.borderRadius]: strings.ui.varRadius,
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: strings.ui.cnToast,
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
