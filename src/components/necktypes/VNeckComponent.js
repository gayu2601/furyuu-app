import * as React from "react";
import Svg, { Rect, Text, Path } from "react-native-svg";
const VNeckComponent = (props) => (
  <Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" {...props}>
    <Rect width={200} height={200} fill="transparent" />
    <Path
      d="M75,50 L100,100 L125,50"
      fill="#f9f9f9"
      stroke="#333"
      strokeWidth={2.5}
    />
  </Svg>
);
export default VNeckComponent;
