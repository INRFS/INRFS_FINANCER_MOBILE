import React from "react";
import { View, StyleSheet, Dimensions, type ViewStyle, type StyleProp } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop, G, Circle } from "react-native-svg";
import { colors } from "../theme/tokens";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * Layered Bottom Ocean Waves as featured across the Aqua Breeze reference design.
 */
export function BottomOceanWaves({ height = 120, style, showElements = true }: { height?: number; style?: StyleProp<ViewStyle>; showElements?: boolean }) {
  const width = SCREEN_WIDTH;
  return (
    <View pointerEvents="none" style={[styles.waveContainer, { height }, style]}>
      <Svg width={width} height={height} viewBox="0 0 375 120" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#80DEEA" stopOpacity="0.45" />
            <Stop offset="100%" stopColor="#009CD4" stopOpacity="0.15" />
          </LinearGradient>
          <LinearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#26C6DA" stopOpacity="0.55" />
            <Stop offset="100%" stopColor="#007A99" stopOpacity="0.3" />
          </LinearGradient>
          <LinearGradient id="waveGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#009CD4" stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#007A99" stopOpacity="0.65" />
          </LinearGradient>
          <LinearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFF9C4" stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#FFE082" stopOpacity="0.4" />
          </LinearGradient>
        </Defs>

        {/* Back ambient sun glow */}
        {showElements && (
          <Circle cx="320" cy="45" r="28" fill="url(#sunGrad)" />
        )}

        {/* Layer 1: Back Wave */}
        <Path
          d="M0,60 C70,30 140,80 220,50 C290,20 340,45 375,35 L375,120 L0,120 Z"
          fill="url(#waveGrad1)"
        />

        {/* Layer 2: Mid Wave */}
        <Path
          d="M0,75 C80,55 160,95 240,65 C300,45 350,70 375,55 L375,120 L0,120 Z"
          fill="url(#waveGrad2)"
        />

        {/* Layer 3: Front Wave */}
        <Path
          d="M0,90 C90,75 170,105 260,80 C315,65 355,85 375,75 L375,120 L0,120 Z"
          fill="url(#waveGrad3)"
        />
      </Svg>
    </View>
  );
}

/**
 * Tropical ambient foliage watermark in top right of headers.
 */
export function TopOceanHeaderDecor({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[styles.topDecorContainer, style]}>
      <Svg width={140} height={140} viewBox="0 0 140 140">
        <Defs>
          <LinearGradient id="palmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#26C6DA" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#009CD4" stopOpacity="0.05" />
          </LinearGradient>
        </Defs>
        <G transform="translate(40, -20) rotate(15)">
          {/* Stylized palm fronds */}
          <Path d="M0,70 Q40,40 90,45 Q50,70 0,70 Z" fill="url(#palmGrad)" />
          <Path d="M0,70 Q50,30 110,25 Q60,65 0,70 Z" fill="url(#palmGrad)" />
          <Path d="M0,70 Q60,20 120,5 Q70,55 0,70 Z" fill="url(#palmGrad)" />
          <Path d="M0,70 Q70,45 125,55 Q65,80 0,70 Z" fill="url(#palmGrad)" />
        </G>
      </Svg>
    </View>
  );
}

/**
 * Mini Sparkline SVG curve for the Total Interest Collected metric card.
 */
export function SparklineWave({ width = 110, height = 36, color = colors.cyan }: { width?: number; height?: number; color?: string }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 110 36">
      <Defs>
        <LinearGradient id="sparklineFill" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </LinearGradient>
      </Defs>
      {/* Area fill under curve */}
      <Path
        d="M2,28 C20,24 35,32 50,16 C65,2 80,22 95,8 C102,3 106,6 108,4 L108,36 L2,36 Z"
        fill="url(#sparklineFill)"
      />
      {/* Smooth line curve */}
      <Path
        d="M2,28 C20,24 35,32 50,16 C65,2 80,22 95,8 C102,3 106,6 108,4"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Sparkle end dot */}
      <Circle cx="108" cy="4" r="3.5" fill={color} />
      <Circle cx="108" cy="4" r="1.5" fill="#FFFFFF" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  waveContainer: {
    width: "100%",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  topDecorContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    overflow: "hidden",
  },
});
