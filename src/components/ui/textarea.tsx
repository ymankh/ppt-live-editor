import * as React from "react"
import { cn } from "cn"
import { strings } from "@/strings";


function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot={strings.ui.textarea}
      className={cn(
        strings.ui.flexFieldSizingContentMinH16WFull,
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
