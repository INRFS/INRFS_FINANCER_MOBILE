import { Image, StyleSheet, View } from "react-native";

type Props = { size?: number; showText?: boolean; inverse?: boolean };

export function Logo({ size = 48, showText = true, inverse = false }: Props) {
  const source = showText
    ? require("../../assets/inrfs-logo.png")
    : require("../../assets/inrfs-logo-mark.png");

  return (
    <View style={[styles.container, inverse && styles.inverse]}>
      <Image
        accessibilityLabel="INRFS"
        resizeMode="contain"
        source={source}
        style={{ height: size, width: showText ? size * (1600 / 567) : size }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
  inverse: { backgroundColor: "#FFFFFF", borderRadius: 8 },
});
