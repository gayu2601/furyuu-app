import * as React from "react";
import Svg, { Rect, Path } from "react-native-svg";
const RoundWithVCutNeckComponent = (props) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 200 200"
    fill="none"
    {...props}
  >
    <Rect width={200} height={150} fill="white" />
    <Path
      d="M75,45 C75,65 85,70 100,70 C115,70 125,65 125,45"
      fill="#f9f9f9"
      stroke="#333"
      strokeWidth={2.5}
    />
    <Path
      d="M95,69 L100,91 L105,69"
      fill="#f9f9f9"
      stroke="#333"
      strokeWidth={2.5}
    />
  </Svg>
);
export default RoundWithVCutNeckComponent;
