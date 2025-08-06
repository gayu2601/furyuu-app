import * as React from "react";
import Svg, { Rect, Path } from "react-native-svg";
const QueenNeckComponent = (props) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 200 150"
    fill="none"
    {...props}
  >
    <Rect width={200} height={150} fill="white" />
    <Path
      d="M60,15          L60,15          C56,40 52,50 70,53          C88,56 95,50 100,80          C105,50 112,56 130,53          C148,50 144,30 140,15          L140,15"
      fill="#f9f9f9"
      stroke="#333"
      strokeWidth={3}
    />
  </Svg>
);
export default QueenNeckComponent;
