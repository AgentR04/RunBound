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
  accentColors = ['rgba(255, 211, 125, 0.42)', 'rgba(169, 224, 255, 0.26)'],
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
    backgroundColor: 'rgba(255, 252, 244, 0.94)',
    overflow: 'hidden',
    shadowColor: '#B2D8F5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 6,
  },
});
