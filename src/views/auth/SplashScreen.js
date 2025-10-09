import React from "react";
import { StyleSheet, Image, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width: WIDTH, height: HEIGHT } = Dimensions.get("window");

export default function SplashScreen() {
  return (
    <LinearGradient
      colors={[
        '#6CBEA8','#76C5AC','#78C2A8','#7CC3A8',
        '#80C4A8','#89C4A8','#9CCAAA','#B1CFAE','#C0D2AE'
      ]}
      locations={[0.02,0.10,0.22,0.34,0.46,0.58,0.70,0.82,0.94]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <Image
        style={styles.logo}
        source={require('../../../assets/splash_logo.png')}
        resizeMode="contain"
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // avoid horizontal padding here; use margins on the image if needed
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: WIDTH,   // or WIDTH - 80 if you want visual “padding”
    height: HEIGHT, // can reduce if you want more space around
  },
});
