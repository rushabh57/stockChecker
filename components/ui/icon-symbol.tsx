// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  "note.text": "description",
  'checklist': 'assignment',           // Good for "carry-out" or tasks
  'square.and.pencil': 'edit',         // Classic "compose" icon
  'list.bullet.clipboard': 'assignment', // Alternative task list style

  // Bullet Points (For your written notes list)
  'list.bullet': 'format-list-bulleted',

  // Search Bar Icon
  'magnifyingglass': 'search',

  // Filter/Show Icon (Commonly used for popovers/settings)
  'line.3.horizontal.decrease.circle': 'filter-list',

  // Reset/Undo Icon (For your reset button inside the popover)
  'arrow.counterclockwise': 'refresh',

  // Alternative Filter (more "sliders" style)
  'slider.horizontal.3': 'tune',

  
  'eye.fill': 'visibility',
  'eye.slash.fill': 'visibility-off',


  'arrow.down.circle.fill': 'arrow-downward',
  'arrow.up.circle.fill': 'arrow-upward',

  // Actions
  'plus': 'add',
  'xmark': 'close',
  'xmark.circle.fill': 'cancel',
  'trash.fill': 'delete',

  // User & Settings
  'person.fill': 'person',
  'lock.fill': 'lock',
  'gearshape.fill': 'settings',
  'ellipsis.circle': 'more-vert',

  'rectangle.portrait.and.arrow.right': 'logout', 
  'door.right.hand.open': 'exit-to-app', // Alternative "exit" style
  'square.stack': 'content-copy',
  'square.stack.fill': 'layers',
  
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
