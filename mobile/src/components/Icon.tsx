import { HugeiconsIcon } from '@hugeicons/react-native';
import type { IconSvgElement } from '@hugeicons/react-native';
import { useTheme } from '@/themes';

export type IconProps = {
  icon: IconSvgElement;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function Icon({ icon, size = 24, color, strokeWidth = 1.5 }: IconProps) {
  const { theme } = useTheme();
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      color={color ?? theme.colors.foreground}
      strokeWidth={strokeWidth}
    />
  );
}
