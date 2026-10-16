import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"
import { strings } from "@/strings";


function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot={strings.ui.input}
      className={cn(
        strings.ui.h8WFullMinW0RoundedLg,
        className
      )}
      {...props}
    />
  )
}

export { Input }
