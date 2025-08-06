import * as React from "react";
import Svg, { Rect, Path } from "react-native-svg";
const BoatneckComponent = (props) => (
  <Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" {...props}>
    <Rect width={300} height={200} fill="white" rx={5} ry={5} />
    <Path d="M50,40 L100,40" stroke="#333" fill="none" strokeWidth={2} />
    <Path d="M200,40 L250,40" stroke="#333" fill="none" strokeWidth={2} />
    <Path
      d="M100,40 Q150,55 200,40"
      stroke="#333"
      fill="none"
      strokeWidth={2}
    />
  </Svg>
);
export default BoatneckComponent;
