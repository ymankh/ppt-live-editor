import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import { cn } from "cn"
import { strings } from "@/strings";


function TooltipProvider({
  delay = 0,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider
      data-slot={strings.ui.tooltipProvider}
      delay={delay}
      {...props}
    />
  )
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot={strings.ui.tooltip} {...props} />
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot={strings.ui.tooltipTrigger} {...props} />
}

function TooltipContent({
  className,
  side = strings.common.top,
  sideOffset = 4,
  align = strings.common.center,
  alignOffset = 0,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className={strings.ui.isolateZ50}
      >
        <TooltipPrimitive.Popup
          data-slot={strings.ui.tooltipContent}
          className={cn(
            strings.ui.z50InlineFlexWFitMaxWXs,
            className
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow className={strings.ui.z50Size25TranslateYCalc50} />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
