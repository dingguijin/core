/**
 * Created by i.n. on 09.04.2015.
 */

module.exports.CC_STATE = {
    RECEIVING: "Receiving",
    WAITING: "Waiting", // Ready to receive calls.
    IDLE: "Idle", // Does nothing, no calls are given.
    IN_A_QUEUE_CALL: "In a queue call" // Currently on a queue call.
};

module.exports.CC_STATUS = {
    LOGGED_OUT: "Logged Out", // Cannot receive queue calls.
    AVAILABLE: "Available", // Ready to receive queue calls.
    AVAILABLE_ON_DEMAND: "Available (On Demand)", // State will be set to 'Idle' once the call ends (not automatically set to 'Waiting').
    ON_BREAK: "On Break" // Still Logged in, but will not receive queue calls.
};