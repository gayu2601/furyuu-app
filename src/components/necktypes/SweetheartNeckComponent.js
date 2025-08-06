import * as React from "react";
import Svg, { Rect, Path } from "react-native-svg";
const SweetheartNeckComponent = (props) => (
  <Svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg" {...props}>
    <Rect width={200} height={150} fill="white" />
    <Path
      d="M65,25 L65,50 C75,45 90,45 100,65 C110,45 125,45 135,50 L135,25"
      fill="#f9f9f9"
      stroke="#333"
      strokeWidth={2.5}
    />
  </Svg>
);
export default SweetheartNeckComponent;
