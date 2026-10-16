import { Separator as SeparatorPrimitive } from "@base-ui/react/separator"
import { cn } from "cn"
import { strings } from "@/strings";


function Separator({
  className,
  orientation = strings.common.horizontal,
  ...props
}: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot={strings.ui.separator}
      orientation={orientation}
      className={cn(
        strings.ui.shrink0BgBorderDataHorizontalHPxData,
        className
      )}
      {...props}
    />
  )
}

export { Separator }
