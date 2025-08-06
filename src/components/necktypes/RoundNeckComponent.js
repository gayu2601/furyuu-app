import * as React from "react";
import Svg, { Rect, Path } from "react-native-svg";
const RoundNeckComponent = (props) => (
  <Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 150" {...props}>
    <Rect width={200} height={150} fill="transparent" rx={5} ry={5} />
    <Path
      d="M50,30 Q90,115 130,30"
      stroke="#333"
      fill="#f9f9f9"
      strokeWidth={2.5}
    />
  </Svg>
);
export default RoundNeckComponent;
