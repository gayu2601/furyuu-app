import * as React from "react";
import Svg, { Rect, Path } from "react-native-svg";
const SVGComponent = (props) => (
  <Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 200" {...props}>
    <Rect width={150} height={110} fill="transparent" />
    <Path
      d="M50,50 L50,85 L100,85 L100,50"
      fill="#f9f9f9"
      stroke="#333"
      strokeWidth={2.5}
    />
  </Svg>
);
export default SVGComponent;
