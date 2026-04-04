import React from 'react';
import {
  StyleProp,
  StyleSheet,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface GlassPanelProps extends ViewProps {
  children: React.ReactNode;
  accentColors?: string[];
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export default function GlassPanel({
  children,
  accentColors = ['rgba(166, 28, 40, 0.52)', 'rgba(91, 214, 255, 0.26)'],
  style,
  contentStyle,
  ...rest
}: GlassPanelProps) {
  return (
    <LinearGradient colors={accentColors} style={[styles.shell, style]}>
      <View style={[styles.content, contentStyle]} {...rest}>
        {children}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 28,
    padding: 1,
  },
  content: {
    borderRadius: 27,
    backgroundColor: 'rgba(10, 20, 36, 0.94)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    shadowColor: '#081223',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 6,
  },
});
