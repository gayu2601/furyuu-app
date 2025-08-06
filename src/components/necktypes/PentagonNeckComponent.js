import * as React from "react";
import Svg, { Rect, Path } from "react-native-svg";
const PentagonNeckComponent = (props) => (
  <Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150" {...props}>
    <Rect width={200} height={150} fill="transparent" rx={5} ry={5} />
    <Path
      d="M65,25 L65,50 L100,65 L135,50 L135,25"
      stroke="#333"
      fill="#f9f9f9"
      strokeWidth={2.5}
    />
  </Svg>
);
export default PentagonNeckComponent;
