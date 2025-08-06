import * as React from "react";
import Svg, { Rect, Path, Ellipse } from "react-native-svg";
const KeyholeNeckComponent = (props) => (
  <Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 200" {...props}>
    <Rect width={150} height={110} fill="transparent" />
    <Path
      d="M50,50 C50,70 60,75 75,75 C90,75 100,70 100,50"
      fill="#f9f9f9"
      stroke="#333"
      strokeWidth={2.5}
    />
    <Ellipse
      cx={75}
      cy={85}
      rx={8}
      ry={15}
      fill="#fff"
      stroke="#333"
      strokeWidth={2.5}
    />
  </Svg>
);
export default KeyholeNeckComponent;
