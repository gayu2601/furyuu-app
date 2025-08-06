import * as React from "react";
import Svg, { Rect, Path } from "react-native-svg";
const TeardropNeckComponent = (props) => (
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
      d="M100,70          C117.5,82.5 117.5,95 100,95          C82.5,95 82.5,82.5 100,70          Z"
      fill="#f9f9f9"
      stroke="#333"
      strokeWidth={2.5}
    />
  </Svg>
);
export default TeardropNeckComponent;
