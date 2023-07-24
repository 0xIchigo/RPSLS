import { useTimer } from "react-timer-hook";
import { useEffect } from "react";
import { TimerSettings } from "../../app/@types/types";

const Timer = ({
    expiryTimestamp,
    timerState
}: {
    expiryTimestamp: Date;
    timerState: {
        timer: TimerSettings;
        setTimer: React.Dispatch<React.SetStateAction<TimerSettings>>;
    }   
}) => {
    const {
        seconds,
        minutes,
        hours,
        days,
        isRunning,
        start,
        pause,
        resume,
        restart,
    } = useTimer({
        expiryTimestamp,
        onExpire: () => {
            timerState.setTimer({ ...timerState.timer, expired: true });
            console.warn("onExpire called");
        }
    });

    useEffect(() => {
        console.log(`Running: ${isRunning}, ${seconds}, ${timerState.timer}`);
        // eslint-disable-next-line
    }, [isRunning]);

    useEffect(() => {
        if (timerState.timer.reset) {
            console.log("Restarting timer...");
            timerState.setTimer({ ...timerState.timer, reset: false });
            restart(timerState.timer.time, true);
        }
        // eslint-disable-next-line
    }, [timerState.timer.reset]);

    return (
        <div className="mt-4">
            Time until your opponent times out: <span>{minutes}</span>:<span>{seconds}</span>
        </div>
    );
};

export default Timer;