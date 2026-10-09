import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { strings } from "@/strings";


const buttonVariants = cva(
  strings.ui.groupButtonInlineFlexShrink0ItemsCenterJustify,
  {
    variants: {
      variant: {
        default: strings.ui.bgPrimaryTextPrimaryForegroundHoverBgPrimary80,
        outline:
          strings.ui.borderBorderBgBackgroundHoverBgMutedHoverText,
        secondary:
          strings.ui.bgSecondaryTextSecondaryForegroundHoverBgColorMix,
        ghost:
          strings.ui.hoverBgMutedHoverTextForegroundAriaExpandedBg,
        destructive:
          strings.ui.bgDestructive10TextDestructiveHoverBgDestructive20,
        link: strings.ui.textPrimaryUnderlineOffset4HoverUnderline,
      },
      size: {
        default:
          strings.ui.h8Gap15Px25Has,
        xs: strings.ui.h6Gap1RoundedMinVarRadiusMd,
        sm: strings.ui.h7Gap1RoundedMinVarRadiusMd,
        lg: strings.ui.h9Gap15Px25Has,
        icon: strings.ui.size8,
        [strings.common.iconXs]:
          strings.ui.size6RoundedMinVarRadiusMd10pxIn,
        [strings.common.iconSm]:
          strings.ui.size7RoundedMinVarRadiusMd12pxIn,
        [strings.ui.iconLg]: strings.ui.size9,
      },
    },
    defaultVariants: {
      variant: strings.ui.default,
      size: strings.ui.default,
    },
  }
)

function Button({
  className,
  variant = strings.ui.default,
  size = strings.ui.default,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot={strings.common.button}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
