/*
    We are storing Player One's move and salt in a useRef() hook so the value is not
    exposed to the browser's JavaScript runtime or be accessible through developer tools.
    This is useful with respect to security however it becomes a nuissance with Player One's
    UI as the useRef() hook does not trigger a re-render. Thus, Player One will not be able
    to clearly see which choice they have made before they create the match
    
    With this custom useForceUpdate hook, we can force a re-render whenever we change the 
    value of the useRef(). This way, we get the security of the useRef() hook and allow 
    Player One to see their choice before match creation, all without directly storing
    their choice in state with a useState() hook
*/

import { useState } from "react";

const useForceUpdate = () => {
    const [value, setValue] = useState<number>(0);
    return () => setValue(value => value + 1);
}

export default useForceUpdate;