import Svg, { Circle, Ellipse } from "react-native-svg";
import { StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "../theme/tokens";

type Props = { size?: number; showText?: boolean; inverse?: boolean };

export function Logo({ size = 48, showText = true, inverse = false }: Props) {
  const petal = size * 0.25;
  return (
    <View style={styles.row}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Ellipse cx="24" cy="9" rx="7" ry="12" fill={colors.cyan} />
        <Ellipse cx="35" cy="16" rx="7" ry="12" fill={colors.green} transform="rotate(55 35 16)" />
        <Ellipse cx="35" cy="32" rx="7" ry="12" fill={colors.yellow} transform="rotate(120 35 32)" />
        <Ellipse cx="24" cy="39" rx="7" ry="12" fill={colors.orange} />
        <Ellipse cx="13" cy="32" rx="7" ry="12" fill={colors.pink} transform="rotate(55 13 32)" />
        <Ellipse cx="13" cy="16" rx="7" ry="12" fill={colors.purple} transform="rotate(120 13 16)" />
        <Circle cx="24" cy="24" r={petal / 2.2} fill={colors.white} />
      </Svg>
      {showText ? (
        <View style={styles.copy}>
          <Text style={[styles.name, inverse && styles.inverse]}>INRFS</Text>
          <Text style={[styles.sub, inverse && styles.inverseMuted]}>Financer Platform</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  copy: { justifyContent: "center", paddingVertical: 1 },
  name: { color: colors.dark, fontFamily: fonts.extrabold, fontSize: 21, lineHeight: 23 },
  sub: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 13 },
  inverse: { color: colors.white },
  inverseMuted: { color: "rgba(255,255,255,0.75)" },
});
